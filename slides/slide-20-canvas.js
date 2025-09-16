// slides/slide-20-canvas.js

/**
 * @file Implements a canvas animation for a CloudFront + S3 caching flow.
 * @description This script visualizes a multi-tier caching system with a vertical, left-to-right layout
 * similar to standard architectural diagrams.
 *
 * Features:
 * - Respects `prefers-reduced-motion`.
 * - Uses `requestAnimationFrame` for smooth animation.
 * - Utilizes an offscreen buffer for efficient rendering of static elements.
 * - Exposes Play/Pause/Restart/Invalidate controls and click-to-request interactivity.
 * - Responsive layout that adapts to container size.
 */

// =============================================================================
//
//   CONFIGURATION & CONSTANTS
//
// =============================================================================

const DEFAULT_HEIGHT = 420;

const ANIM_CONFIG = {
  // Layout configuration
  usersCount: 4,
  edgesCount: 3,
  userEdgeMap: [0, 1, 2, 2], // User 4 now targets Edge C (index 2)

  // Timing (in milliseconds)
  sequential: true,
  userStaggerMs: 350,
  requestTravelMs: 1400,
  fetchFromOriginMs: 1400,
  cacheStoreMs: 900,
  hitTravelMs: 700,
  gapMs: 700, // Gap before auto-replay

  // Visuals
  dotRadius: 8,
  colors: {
    user: '#146EB4',
    edge: '#4A90E2',
    origin: '#FF9900',
    text: '#232F3E',
    path: 'rgba(35,47,62,0.9)'
  }
};


// =============================================================================
//
//   INITIALIZATION
//
// =============================================================================

/**
 * Finds the slide element and initializes the canvas animation.
 * @param {Document|Element} scope - The DOM scope to search within.
 */
export function init(scope = document) {
  const slide = scope.querySelector('#slide-20');
  if (!slide) return;

  const canvas = slide.querySelector('#cloudfront-canvas-element');
  const fallback = slide.querySelector('.canvas-fallback');
  const playBtn = slide.querySelector('#cf-play-pause');

  const prefersReduced = window.matchMedia ?.('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || prefersReduced) {
    if (canvas) canvas.style.display = 'none';
    if (playBtn) playBtn.setAttribute('aria-hidden', 'true');
    if (fallback) fallback.style.display = 'block';
    return;
  }

  if (fallback) fallback.style.display = 'none';

  const animation = createCloudfrontAnimation(canvas, slide);
  if (animation) {
    canvas._cfAnimation = animation;
    animation.start();
  }
}

/**
 * Auto-initializes the animation when the DOM is ready.
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init(document));
} else {
  init(document);
}


// =============================================================================
//
//   ANIMATION FACTORY
//
// =============================================================================

function createCloudfrontAnimation(canvas, slide) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const playBtn = slide.querySelector('#cf-play-pause');
  const clearBtn = slide.querySelector('#cf-clear-cache');

  const staticBuffer = document.createElement('canvas');
  const staticCtx = staticBuffer.getContext('2d');

  const state = {
    rafId: null,
    isPlaying: true,
    isFinished: false,
    destroyed: false,
    runIndex: 0,
    replayTimer: null,
    width: 0,
    height: DEFAULT_HEIGHT,
    dpr: 1,
    layout: {
      users: [],
      edges: [],
      regionals: [],
      edgesToRegional: [],
      origin: { x: 0, y: 0, w: 120, h: 80 },
      userBox: { w: 56, h: 56 },
      edgeBox: { w: 140, h: 60 },
      regionalBox: { w: 160, h: 56 }
    },
    pathVerticalSpacing: 20,
    pathArcStrength: 25,
    edgesState: [],
    regionalState: [],
    requests: [],
    invalidations: []
  };

  // ===========================================================================
  //   DRAWING & MATH HELPERS
  // ===========================================================================

  const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  function drawRoundedRect(ctxRef, x, y, w, h, r = 8) {
    ctxRef.beginPath();
    ctxRef.moveTo(x + r, y);
    ctxRef.arcTo(x + w, y, x + w, y + h, r);
    ctxRef.arcTo(x + w, y + h, x, y + h, r);
    ctxRef.arcTo(x, y + h, x, y, r);
    ctxRef.arcTo(x, y, x + w, y, r);
    ctxRef.closePath();
    ctxRef.fill();
    ctxRef.stroke();
  }

  function computeControlPoint(from, to, verticalOffset, arcStrength) {
    const midY = (from.y + to.y) / 2;
    const controlY = midY + (verticalOffset || 0);
    const midX = (from.x + to.x) / 2;
    const effectiveArc = from.x < to.x ? arcStrength : -arcStrength;
    const controlX = midX + effectiveArc;
    return { x: Math.round(controlX), y: Math.round(controlY) };
  }

  const computeVerticalOffsets = {
      userEdge: (userIndex, edgeIndex) => {
          const edgeCount = state.layout.edges.length || 1;
          const centerEdge = (edgeCount - 1) / 2;
          let offset = (edgeIndex - centerEdge) * state.pathVerticalSpacing * 1.8;
          const usersForEdge = state.layout.users.filter(u => u.assignedEdgeIndex === edgeIndex);
          const userSubIndex = usersForEdge.findIndex(u => u.label === `User ${userIndex + 1}`);
          if (userSubIndex !== -1) {
              offset += (userSubIndex - (usersForEdge.length - 1) / 2) * state.pathVerticalSpacing * 0.5;
          }
          return offset;
      },
      edgeRegional: (edgeIndex, regionalIndex) => {
          const regionalCount = state.layout.regionals.length || 1;
          const centerRegional = (regionalCount - 1) / 2;
          return (regionalIndex - centerRegional) * state.pathVerticalSpacing * 2.5;
      },
      regionalOrigin: (regionalIndex) => {
          const regionalCount = state.layout.regionals.length || 1;
          const centerRegional = (regionalCount - 1) / 2;
          return (regionalIndex - centerRegional) * state.pathVerticalSpacing * 2;
      }
  };


  // ===========================================================================
  //   CORE LOGIC: Sizing, State Setup, Rendering
  // ===========================================================================

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    state.width = Math.max(600, Math.floor(rect.width));
    state.height = Math.max(DEFAULT_HEIGHT, Math.floor(rect.height || DEFAULT_HEIGHT));
    state.dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    staticBuffer.width = canvas.width;
    staticBuffer.height = canvas.height;
    staticCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.pathVerticalSpacing = Math.max(15, Math.round(state.height * 0.04));
    state.pathArcStrength = Math.max(20, Math.round(state.width * 0.03));
    calculateLayoutPositions();
    state.edgesState = state.layout.edges.map((e, i) => ({ ...e, index: i, cached: state.edgesState[i] ?.cached || false }));
    state.regionalState = state.layout.regionals.map((r, i) => ({ ...r, index: i, cached: state.regionalState[i] ?.cached || false }));
    drawStaticToBuffer();
  }

  function calculateLayoutPositions() {
    const { layout, width, height } = state;
    const { usersCount, edgesCount } = ANIM_CONFIG;
    const regionalCount = 2;
    const usersX = Math.round(width * 0.08);
    const edgesX = Math.round(width * 0.38);
    const regionalsX = Math.round(width * 0.65);
    const originX = Math.round(width * 0.92);
    const verticalMargin = 40;
    const usableHeight = height - verticalMargin * 2;
    layout.users = Array.from({ length: usersCount }, (_, i) => ({ x: usersX, y: verticalMargin + (usableHeight / (usersCount + 1)) * (i + 1), w: layout.userBox.w, h: layout.userBox.h, label: `User ${i + 1}` }));
    layout.edges = Array.from({ length: edgesCount }, (_, i) => ({ x: edgesX, y: verticalMargin + (usableHeight / (edgesCount + 1)) * (i + 1), w: layout.edgeBox.w, h: layout.edgeBox.h, label: `Edge ${String.fromCharCode(65 + i)}` }));
    layout.regionals = Array.from({ length: regionalCount }, (_, i) => ({ x: regionalsX, y: verticalMargin + (usableHeight / (regionalCount + 1)) * (i + 1), w: layout.regionalBox.w, h: layout.regionalBox.h, label: `Regional ${i + 1}` }));
    layout.origin.x = originX - (layout.origin.w / 2);
    layout.origin.y = (height / 2) - (layout.origin.h / 2);
    layout.edgesToRegional = layout.edges.map((_, i) => Math.floor(i * layout.regionals.length / layout.edges.length));
    layout.users.forEach((u, i) => {
      const map = ANIM_CONFIG.userEdgeMap;
      u.assignedEdgeIndex = (map && map[i] !== undefined) ? Math.min(edgesCount - 1, map[i]) : Math.round(i * (edgesCount - 1) / Math.max(1, usersCount - 1));
    });
  }

  function drawStaticToBuffer() {
    const c = staticCtx;
    const { colors } = ANIM_CONFIG;
    const { layout, width, height, pathArcStrength } = state;
    c.clearRect(0, 0, width, height);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const drawNode = (node, label, strokeStyle) => {
        c.fillStyle = '#fff'; c.strokeStyle = strokeStyle; c.lineWidth = 2;
        drawRoundedRect(c, node.x - node.w/2, node.y - node.h/2, node.w, node.h, 8);
        c.fillStyle = colors.text; c.font = '14px system-ui, Arial'; c.fillText(label, node.x, node.y);
    };
    drawNode(layout.origin, 'Origin', colors.origin);
    state.regionalState.forEach(r => {
        drawNode(r, r.label, '#E6F2FF');
        c.fillStyle = r.cached ? '#28a745' : 'rgba(0,0,0,0.12)';
        c.beginPath(); c.arc(r.x - r.w/2 + 12, r.y - r.h/2 + 14, 6, 0, 2 * Math.PI); c.fill();
    });
    state.edgesState.forEach(e => {
        drawNode(e, e.label, colors.edge);
        c.fillStyle = e.cached ? '#28a745' : 'rgba(0,0,0,0.12)';
        c.beginPath(); c.arc(e.x + e.w/2 - 14, e.y - e.h/2 + 14, 6, 0, 2 * Math.PI); c.fill();
    });
    layout.users.forEach(u => {
        c.fillStyle = colors.user; c.beginPath(); c.arc(u.x, u.y, Math.min(u.w, u.h) / 2, 0, 2 * Math.PI); c.fill();
        c.fillStyle = colors.text; c.font = '12px system-ui, Arial';
        c.fillText(u.label, u.x, u.y + u.h / 2 + 8);
    });
    c.strokeStyle = 'rgba(35,47,62,0.75)'; c.lineWidth = 1.2; c.setLineDash([6, 4]);
    const drawCurve = (from, to, cp) => { c.beginPath(); c.moveTo(from.x, from.y); c.quadraticCurveTo(cp.x, cp.y, to.x, to.y); c.stroke(); };
    layout.users.forEach((u, ui) => {
      const e = state.edgesState[u.assignedEdgeIndex];
      const from = { x: u.x + u.w / 2, y: u.y }; const to = { x: e.x - e.w / 2, y: e.y };
      drawCurve(from, to, computeControlPoint(from, to, computeVerticalOffsets.userEdge(ui, e.index), pathArcStrength));
    });
    state.edgesState.forEach((e, ei) => {
      const r = state.regionalState[layout.edgesToRegional[ei]];
      const from = { x: e.x + e.w / 2, y: e.y }; const to = { x: r.x - r.w / 2, y: r.y };
      drawCurve(from, to, computeControlPoint(from, to, computeVerticalOffsets.edgeRegional(ei, r.index), pathArcStrength));
    });
    state.regionalState.forEach((r, ri) => {
        const from = { x: r.x + r.w / 2, y: r.y }; const to = { x: layout.origin.x - layout.origin.w / 2, y: layout.origin.y + layout.origin.h / 2 };
        drawCurve(from, to, computeControlPoint(from, to, computeVerticalOffsets.regionalOrigin(ri), pathArcStrength));
    });
    c.setLineDash([]);
  }

  function setupRun() {
    clearTimeout(state.replayTimer);
    state.replayTimer = null;
    state.isFinished = false;
    const now = performance.now();
    state.requests = Array.from({ length: ANIM_CONFIG.usersCount }, (_, i) => {
      const user = state.layout.users[i];
      const edgeIndex = user.assignedEdgeIndex;
      const startAt = ANIM_CONFIG.sequential ? (i === 0 ? now : Infinity) : (now + i * ANIM_CONFIG.userStaggerMs);
      return { userIndex: i, edgeIndex, regionalIndex: state.layout.edgesToRegional[edgeIndex], startAt, state: 'pending', t0: 0 };
    });
    state.runIndex++;
    drawStaticToBuffer();
  }

  function drawCacheStorePulse(t, node, color = 'blue') {
    if (!node) return;
    const cx = node.x; const cy = node.y;
    const maxR = Math.max(node.w, node.h); const r = 6 + maxR * easeInOut(t);
    ctx.beginPath();
    const colorMap = { 'green': '40,167,69', 'orange': '255,165,0', 'blue': '74,144,226' };
    ctx.strokeStyle = `rgba(${colorMap[color] || colorMap.blue}, ${1 - t})`;
    ctx.lineWidth = 3; ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = ANIM_CONFIG.colors.text; ctx.font = '13px system-ui, Arial';
    ctx.textAlign = 'center'; ctx.fillText('Caching', cx, cy - maxR / 2 - 10);
  }

  function drawInvalidationPulse(t, node) {
    if (!node) return;
    const cx = node.x; const cy = node.y;
    const maxR = Math.max(node.w, node.h) * 1.2; const r = 6 + maxR * easeInOut(t);
    ctx.beginPath(); ctx.strokeStyle = `rgba(220, 53, 69, ${1 - t})`;
    ctx.lineWidth = 4; ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(220, 53, 69, 0.8)'; ctx.font = '13px system-ui, Arial';
    ctx.textAlign = 'center'; ctx.fillText('Invalidated', cx, cy - maxR / 2 - 10);
  }

  function renderFrame(now) {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.drawImage(staticBuffer, 0, 0, state.width, state.height);
    if (state.requests.length === 0 && !state.isFinished && state.invalidations.length === 0) setupRun();
    let activeRequestCount = 0;
    processRequests(now, (count) => activeRequestCount = count);
    let activeInvalidationCount = 0;
    processInvalidations(now, (count) => activeInvalidationCount = count);
    const totalActiveAnimations = activeRequestCount + activeInvalidationCount;
    if (totalActiveAnimations > 0) {
      state.rafId = window.requestAnimationFrame(renderFrame);
    } else if (!state.isFinished) {
      state.isFinished = true;
      const cachesExist = state.edgesState.some(e => e.cached) || state.regionalState.some(r => r.cached);
      if (state.runIndex === 1 && !state.replayTimer && cachesExist && state.requests.length > 0) {
        state.replayTimer = setTimeout(() => { setupRun(); startLoop(); }, ANIM_CONFIG.gapMs);
      }
      pauseLoop();
    }
  }

  function processRequests(now, setActiveCount) {
    let active = 0;
    state.requests.forEach(req => {
        const user = state.layout.users[req.userIndex];
        const edge = state.edgesState[req.edgeIndex];
        const regional = state.regionalState[req.regionalIndex];
        if (!user || !edge || !regional || req.state === 'done') return;
        if (ANIM_CONFIG.sequential && req.startAt === Infinity) {
            if (state.requests[state.requests.indexOf(req) - 1]?.state === 'done') req.startAt = now;
        }
        if (req.state === 'pending' && now >= req.startAt) { req.state = 'traveling_to_edge'; req.t0 = now; }
        if (req.state === 'pending') return;
        active++;
        const t = Math.min(1, (now - req.t0) / getDurationForState(req.state));
        const userRight = { x: user.x + user.w / 2, y: user.y }; const edgeLeft = { x: edge.x - edge.w / 2, y: edge.y };
        const edgeRight = { x: edge.x + edge.w / 2, y: edge.y }; const regLeft = { x: regional.x - regional.w / 2, y: regional.y };
        const regRight = { x: regional.x + regional.w / 2, y: regional.y }; const originLeft = { x: state.layout.origin.x, y: state.layout.origin.y + state.layout.origin.h / 2 };
        const nextState = (newState) => { req.state = newState; req.t0 = now; };
        switch (req.state) {
            case 'traveling_to_edge':
                drawDotAlong(userRight, edgeLeft, t, ANIM_CONFIG.colors.user, 'Request', computeVerticalOffsets.userEdge(req.userIndex, req.edgeIndex));
                if (t >= 1) nextState(edge.cached ? 'edge_hit_return' : 'traveling_to_regional'); break;
            case 'traveling_to_regional':
                drawDotAlong(edgeRight, regLeft, t, 'orange', 'Miss', computeVerticalOffsets.edgeRegional(req.edgeIndex, req.regionalIndex));
                if (t >= 1) nextState(regional.cached ? 'regional_hit_return' : 'fetching_origin'); break;
            case 'fetching_origin':
                drawDotAlong(regRight, originLeft, t, 'red', 'Fetch', computeVerticalOffsets.regionalOrigin(req.regionalIndex));
                if (t >= 1) nextState('storing_regional'); break;
            case 'storing_regional':
                drawCacheStorePulse(t, regional, 'orange');
                if (t >= 1) { regional.cached = true; drawStaticToBuffer(); nextState('returning_to_edge_from_regional'); } break;
            case 'storing_edge':
                drawCacheStorePulse(t, edge, 'green');
                if (t >= 1) { edge.cached = true; drawStaticToBuffer(); nextState('returning_to_user'); } break;
            case 'regional_hit_return': case 'returning_to_edge_from_regional':
                drawDotAlong(regLeft, edgeRight, t, 'green', 'Hit', computeVerticalOffsets.edgeRegional(req.edgeIndex, req.regionalIndex));
                if (t >= 1) nextState('storing_edge'); break;
            case 'edge_hit_return': case 'returning_to_user':
                drawDotAlong(edgeLeft, userRight, t, 'green', t >= 1 ? 'OK' : 'Hit', computeVerticalOffsets.userEdge(req.userIndex, req.edgeIndex));
                if (t >= 1) req.state = 'done'; break;
        }
    });
    setActiveCount(active);
  }

  function processInvalidations(now, setActiveCount) {
    let active = 0;
    const originPos = { x: state.layout.origin.x + state.layout.origin.w / 2, y: state.layout.origin.y + state.layout.origin.h / 2 };
    state.invalidations.forEach(inv => {
      if (inv.state === 'done') return;
      active++;
      const t = Math.min(1, (now - inv.startTime) / inv.duration);
      const targetNode = inv.type === 'edge' ? state.edgesState[inv.targetIndex] : state.regionalState[inv.targetIndex];
      if (!targetNode) { inv.state = 'done'; return; }
      const targetPos = { x: targetNode.x, y: targetNode.y };
      if (inv.state === 'traveling') {
        drawDotAlong(originPos, targetPos, t, 'rgba(220, 53, 69, 0.9)', 'Invalidate ⚡');
        if (t >= 1) {
          inv.state = 'pulsing';
          inv.startTime = now;
          inv.duration = ANIM_CONFIG.cacheStoreMs;
        }
      } else if (inv.state === 'pulsing') {
        drawInvalidationPulse(t, targetNode);
        if (t >= 1) {
          targetNode.cached = false;
          drawStaticToBuffer();
          inv.state = 'done';
        }
      }
    });
    state.invalidations = state.invalidations.filter(inv => inv.state !== 'done');
    setActiveCount(active);
  }

  function getDurationForState(reqState) {
    const { requestTravelMs, hitTravelMs, fetchFromOriginMs, cacheStoreMs } = ANIM_CONFIG;
    switch (reqState) {
      case 'traveling_to_edge': case 'traveling_to_regional': return requestTravelMs;
      case 'fetching_origin': return fetchFromOriginMs;
      case 'storing_regional': case 'storing_edge': return cacheStoreMs;
      case 'regional_hit_return': case 'returning_to_edge_from_regional':
      case 'returning_to_user': case 'edge_hit_return': return hitTravelMs;
      default: return 1000;
    }
  }

  function drawDotAlong(from, to, t, color, label, verticalOffset = 0) {
    const u = easeInOut(Math.min(1, Math.max(0, t)));
    const cp = computeControlPoint(from, to, verticalOffset, state.pathArcStrength);
    const oneMinus = 1 - u;
    const x = oneMinus * oneMinus * from.x + 2 * oneMinus * u * cp.x + u * u * to.x;
    const y = oneMinus * oneMinus * from.y + 2 * oneMinus * u * cp.y + u * u * to.y;
    ctx.beginPath(); ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1; ctx.arc(x, y, ANIM_CONFIG.dotRadius, 0, 2 * Math.PI);
    ctx.fill(); ctx.stroke();
    if (label) {
      ctx.fillStyle = ANIM_CONFIG.colors.text; ctx.font = '12px system-ui, Arial';
      ctx.textAlign = 'center'; ctx.fillText(label, x, y - 14);
    }
  }

  // ===========================================================================
  //   ANIMATION & EVENT CONTROLS
  // ===========================================================================

  function startLoop() {
    if (state.rafId || state.destroyed) return;
    if (state.isFinished) { restart(); return; }
    state.isPlaying = true;
    if (playBtn) { playBtn.textContent = 'Pause'; playBtn.setAttribute('aria-pressed', 'true'); }
    state.rafId = window.requestAnimationFrame(renderFrame);
  }

  function pauseLoop() {
    if (!state.rafId) return;
    state.isPlaying = false;
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
    if (playBtn) { playBtn.textContent = 'Play'; playBtn.setAttribute('aria-pressed', 'false'); }
  }

  function restart() {
    state.runIndex = 0;
    state.isFinished = false;
    clearTimeout(state.replayTimer);
    state.replayTimer = null;
    setupRun();
    startLoop();
  }

  function clearCache() {
    state.edgesState.forEach(e => { e.cached = false; });
    state.regionalState.forEach(r => { r.cached = false; });
    clearTimeout(state.replayTimer);
    state.replayTimer = null;
    state.isFinished = true;
    drawStaticToBuffer();
    renderFrame(performance.now());
  }

  function onPlayPauseClick(e) {
    e.preventDefault();
    if (state.isPlaying) pauseLoop();
    else startLoop();
  }

  function onClearCacheClick(e) {
    e.preventDefault();
    clearCache();
    restart();
  }

  function invalidateAllCaches() {
    const now = performance.now();
    const invalidationTravelTime = 800;
    state.regionalState.forEach((r, index) => {
      if (r.cached) state.invalidations.push({ type: 'regional', targetIndex: index, startTime: now, duration: invalidationTravelTime, state: 'traveling' });
    });
    state.edgesState.forEach((e, index) => {
      if (e.cached) state.invalidations.push({ type: 'edge', targetIndex: index, startTime: now, duration: invalidationTravelTime + 400, state: 'traveling' });
    });
    if (!state.isPlaying) { state.isFinished = false; startLoop(); }
  }

  function onInvalidateClick(e) {
    e.preventDefault();
    invalidateAllCaches();
  }

  function onCanvasClick(ev) {
    if (state.destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ev.clientX - rect.left;
    const clickY = ev.clientY - rect.top;
    state.layout.users.forEach((user, index) => {
      const radius = Math.min(user.w, user.h) / 2;
      const dx = clickX - user.x;
      const dy = clickY - user.y;
      if (dx * dx + dy * dy <= radius * radius) {
        if (state.requests.some(req => req.userIndex === index && req.state !== 'done')) return;
        const edgeIndex = user.assignedEdgeIndex;
        state.requests.push({ userIndex: index, edgeIndex, regionalIndex: state.layout.edgesToRegional[edgeIndex], startAt: performance.now(), state: 'pending', t0: 0, });
        if (!state.isPlaying) { state.isFinished = false; startLoop(); }
      }
    });
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeCanvas();
      if (!state.isPlaying) renderFrame(performance.now());
    }, 120);
  }

  const resizeObserver = new ResizeObserver(onResize);

  return {
    start: () => {
      sizeCanvas(); setupRun(); startLoop();
      if (playBtn) playBtn.addEventListener('click', onPlayPauseClick);
      if (clearBtn) clearBtn.addEventListener('click', onClearCacheClick);
      const invalidateBtn = slide.querySelector('#cf-invalidate');
      if (invalidateBtn) invalidateBtn.addEventListener('click', onInvalidateClick);
      canvas.addEventListener('click', onCanvasClick);
      window.addEventListener('resize', onResize);
      resizeObserver.observe(canvas);
    },
    play: startLoop,
    pause: pauseLoop,
    restart: restart,
    clearCache: clearCache,
    invalidate: invalidateAllCaches,
    destroy: () => {
      state.destroyed = true; pauseLoop(); clearTimeout(state.replayTimer);
      if (playBtn) playBtn.removeEventListener('click', onPlayPauseClick);
      if (clearBtn) clearBtn.removeEventListener('click', onClearCacheClick);
      const invalidateBtn = slide.querySelector('#cf-invalidate');
      if (invalidateBtn) invalidateBtn.removeEventListener('click', onInvalidateClick);
      canvas.removeEventListener('click', onCanvasClick);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      if (canvas._cfAnimation) delete canvas._cfAnimation;
    }
  };
}