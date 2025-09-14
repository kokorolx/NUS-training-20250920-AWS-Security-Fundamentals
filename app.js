 // AWS Security Training Presentation JavaScript - Updated for 28 slides with CloudFront
class AWSSecurityPresentation {
    constructor() {
        this.currentSlide = 1;
        this.totalSlides = 28; // Updated to 28 slides
        this.slides = document.querySelectorAll('.slide');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.currentSlideSpan = document.getElementById('currentSlide');
        this.totalSlidesSpan = document.getElementById('totalSlides');
        this.slideDotsContainer = document.getElementById('slideDots');
        this.progressFill = document.getElementById('progressFill');
        this.sectionBtns = document.querySelectorAll('.section-btn');

        // Updated section mapping - which slides belong to which section
        this.sections = {
            1: { name: 'Giới thiệu', slides: [1, 2, 3, 4, 5], duration: '20 phút' },
            2: { name: 'IAM', slides: [6, 7, 8, 9, 10], duration: '25 phút' },
            3: { name: 'Network', slides: [11, 12, 13, 14, 15], duration: '25 phút' },
            4: { name: 'Data & CloudFront', slides: [16, 17, 18, 19, 20, 21, 22, 23], duration: '30 phút' },
            5: { name: 'Monitoring', slides: [24, 25, 26], duration: '15 phút' },
            6: { name: 'Scenarios', slides: [27], duration: '15 phút' },
            7: { name: 'Best Practices', slides: [28], duration: '15 phút' }
        };

        // CloudFront specific slides for special handling
        this.cloudfrontSlides = [20, 21, 22, 23];

        this.init();
    }

    init() {
        // Set initial values
        this.updateSlideCounter();
        this.createSlideDots();
        this.updateNavigationButtons();
        this.updateProgressBar();
        this.updateSectionHighlight();

        // Event listeners
        this.prevBtn.addEventListener('click', () => this.goToPrevSlide());
        this.nextBtn.addEventListener('click', () => this.goToNextSlide());

        // Section navigation
        this.sectionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionId = parseInt(e.target.dataset.section);
                this.goToSection(sectionId);
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Prevent default arrow key scrolling
        document.addEventListener('keydown', (e) => {
            if(['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });

        // Add fade-in animation to initial slide
        this.slides[0].classList.add('fade-in');

        console.log('🛡️ AWS Security Training với CloudFront đã load thành công!');
        console.log(`📊 Tổng số slides: ${this.totalSlides}`);
        console.log('🌐 Slides mới về CloudFront: 20-23');
        console.log('⏱️ Thời gian đào tạo: 2 tiếng 15 phút');
    }

    createSlideDots() {
        // Create dots for slide navigation
        for (let i = 1; i <= this.totalSlides; i++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (i === 1) dot.classList.add('active');

            dot.addEventListener('click', () => this.goToSlide(i));

            // Add section indicator and CloudFront special indicator
            const sectionInfo = this.getSectionForSlide(i);
            let title = `Slide ${i}`;

            if (sectionInfo) {
                title += ` - ${sectionInfo.name}`;
            }

            if (this.cloudfrontSlides.includes(i)) {
                title += ' (CloudFront)';
                dot.classList.add('cloudfront-slide');
            }

            dot.setAttribute('title', title);

            this.slideDotsContainer.appendChild(dot);
        }
    }

    getSectionForSlide(slideNumber) {
        for (const [sectionId, section] of Object.entries(this.sections)) {
            if (section.slides.includes(slideNumber)) {
                return { id: parseInt(sectionId), name: section.name, duration: section.duration };
            }
        }
        return null;
    }

    // Attempt to load a slide fragment from /slides/slide-<n>.html (returns HTML string or null)
    async loadSlideFragment(slideNumber) {
        try {
            const resp = await fetch(`slides/slide-${slideNumber}.html`, { cache: "no-cache" });
            if (!resp.ok) throw new Error('Not found');
            const text = await resp.text();
            return text;
        } catch (err) {
            // fragment not available; fallback to inline slides already present in DOM
            return null;
        }
    }

    updateSlideCounter() {
        this.currentSlideSpan.textContent = this.currentSlide;
        this.totalSlidesSpan.textContent = this.totalSlides;
    }

    updateProgressBar() {
        const progress = (this.currentSlide / this.totalSlides) * 100;
        this.progressFill.style.width = `${progress}%`;
    }

    updateSectionHighlight() {
        // Remove active class from all section buttons
        this.sectionBtns.forEach(btn => btn.classList.remove('active'));

        // Find current section and highlight it
        const currentSection = this.getSectionForSlide(this.currentSlide);
        if (currentSection) {
            const currentSectionBtn = document.querySelector(`[data-section="${currentSection.id}"]`);
            if (currentSectionBtn) {
                currentSectionBtn.classList.add('active');
            }
        }
    }

    updateNavigationButtons() {
        // Update previous button
        this.prevBtn.disabled = this.currentSlide === 1;

        // Update next button
        this.nextBtn.disabled = this.currentSlide === this.totalSlides;

        // Update button text for different scenarios
        if (this.currentSlide === this.totalSlides) {
            this.nextBtn.innerHTML = 'Kết thúc 🎯';
        } else if (this.cloudfrontSlides.includes(this.currentSlide + 1)) {
            this.nextBtn.innerHTML = 'CloudFront →';
        } else {
            this.nextBtn.innerHTML = 'Tiếp →';
        }

        // Update previous button text
        if (this.currentSlide === 1) {
            this.prevBtn.innerHTML = '🏠 Bắt đầu';
        } else if (this.cloudfrontSlides.includes(this.currentSlide - 1)) {
            this.prevBtn.innerHTML = '← CloudFront';
        } else {
            this.prevBtn.innerHTML = '← Trước';
        }
    }

    updateSlideDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index + 1 === this.currentSlide);
        });

        // Scroll active dot into view
        const activeDot = document.querySelector('.dot.active');
        if (activeDot && this.slideDotsContainer.scrollTo) {
            const containerRect = this.slideDotsContainer.getBoundingClientRect();
            const dotRect = activeDot.getBoundingClientRect();

            if (dotRect.left < containerRect.left || dotRect.right > containerRect.right) {
                activeDot.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
        }
    }

    async goToSlide(slideNumber) {
        if (slideNumber < 1 || slideNumber > this.totalSlides || slideNumber === this.currentSlide) {
            return;
        }

        // Try to load fragment (if available) before performing transition
        const fragmentHtml = await this.loadSlideFragment(slideNumber);
        const slideContainer = document.querySelector('.slide-container');

        if (fragmentHtml) {
            // If slide with id doesn't exist yet, insert it
            if (!document.getElementById(`slide-${slideNumber}`)) {
                const temp = document.createElement('div');
                temp.innerHTML = fragmentHtml.trim();
                const newSlide = temp.firstElementChild;
                // Ensure the new slide is positioned absolutely like others
                newSlide.style.position = 'absolute';
                newSlide.style.top = '0';
                newSlide.style.left = '0';
                newSlide.style.width = '100%';
                newSlide.style.height = '100%';
                newSlide.style.boxSizing = 'border-box';
                slideContainer.appendChild(newSlide);

                // Refresh internal slides NodeList
                this.slides = document.querySelectorAll('.slide');
            }
        }

        // Determine current and target elements by id to work with dynamic slides
        const currentSlideElement = document.getElementById(`slide-${this.currentSlide}`) || this.slides[this.currentSlide - 1];
        const targetSlideElement = document.getElementById(`slide-${slideNumber}`) || this.slides[slideNumber - 1];

        if (!currentSlideElement || !targetSlideElement) {
            // If for some reason elements are missing, abort
            console.warn('Slide elements missing for transition', this.currentSlide, slideNumber);
            return;
        }

        // Determine transition direction
        const isNext = slideNumber > this.currentSlide;

        // Special handling for CloudFront slides
        if (this.cloudfrontSlides.includes(slideNumber)) {
            console.log(`🌐 Chuyển đến CloudFront slide ${slideNumber}`);
        }

        // Remove active class from current slide
        currentSlideElement.classList.remove('active');
        currentSlideElement.classList.remove('fade-in');

        // Add transition class
        if (isNext) {
            currentSlideElement.classList.add('prev');
        } else {
            currentSlideElement.style.transform = 'translateX(-100%)';
        }

        // Update current slide
        this.currentSlide = slideNumber;

        // Activate new slide with a slight delay for smooth transition
        setTimeout(() => {
            // Reset all slides
            this.slides.forEach(slide => {
                slide.classList.remove('active', 'prev');
                slide.style.transform = '';
            });

            // Also ensure any dynamically added slide elements are included
            const allSlides = document.querySelectorAll('.slide');
            allSlides.forEach(s => s.classList.remove('active', 'prev'));

            // Activate target slide
            targetSlideElement.classList.add('active', 'fade-in');

            // Update UI elements
            this.updateSlideCounter();
            this.updateNavigationButtons();
            this.updateSlideDots();
            this.updateProgressBar();
            this.updateSectionHighlight();

            // Announce slide change for accessibility
            this.announceSlideChange();

            // Update URL hash for bookmarking
            this.updateURL();

        }, 50);
    }

    goToNextSlide() {
        if (this.currentSlide < this.totalSlides) {
            this.goToSlide(this.currentSlide + 1);
        }
    }

    goToPrevSlide() {
        if (this.currentSlide > 1) {
            this.goToSlide(this.currentSlide - 1);
        }
    }

    goToSection(sectionId) {
        const section = this.sections[sectionId];
        if (section && section.slides.length > 0) {
            // Go to the first slide of the section
            console.log(`📖 Chuyển đến phần ${sectionId}: ${section.name} (${section.duration})`);
            this.goToSlide(section.slides[0]);
        }
    }

    // Quick navigation to CloudFront section
    goToCloudFrontSection() {
        console.log('🌐 Chuyển đến phần CloudFront');
        this.goToSlide(20); // First CloudFront slide
    }

    handleKeydown(event) {
        return

        switch(event.key) {
            case 'ArrowRight':
            case ' ': // Spacebar
                event.preventDefault();
                this.goToNextSlide();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.goToPrevSlide();
                break;
            case 'Home':
                event.preventDefault();
                this.goToSlide(1);
                break;
            case 'End':
                event.preventDefault();
                this.goToSlide(this.totalSlides);
                break;
            case 'Escape':
                // Could be used for fullscreen exit
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
            // Section shortcuts
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
                    if (event.ctrlKey /*|| event.metaKey*/) {
                        event.preventDefault();
                        const sectionId = parseInt(event.key);
                        if (this.sections[sectionId]) {
                            this.goToSection(sectionId);
                        }
                    }
                    break;
            // CloudFront quick access
            case 'c':
            case 'C':
                // if (event.ctrlKey /*|| event.metaKey*/) {
                //     event.preventDefault();
                //     this.goToCloudFrontSection();
                // }
                break;
        }
    }

    announceSlideChange() {
        // Create accessibility announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';

        const slideTitle = this.slides[this.currentSlide - 1].querySelector('h1').textContent;
        const sectionInfo = this.getSectionForSlide(this.currentSlide);
        const sectionName = sectionInfo ? sectionInfo.name : '';

        let announcementText = `Slide ${this.currentSlide} của ${this.totalSlides}: ${slideTitle}. Phần: ${sectionName}`;

        if (this.cloudfrontSlides.includes(this.currentSlide)) {
            announcementText += '. Nội dung CloudFront mới.';
        }

        announcement.textContent = announcementText;

        document.body.appendChild(announcement);

        // Remove announcement after a brief delay
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    updateURL() {
        // Update browser URL hash for bookmarking
        const sectionInfo = this.getSectionForSlide(this.currentSlide);
        let hashName = 'slide';

        if (sectionInfo) {
            hashName = sectionInfo.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
        }

        if (this.cloudfrontSlides.includes(this.currentSlide)) {
            hashName += '-cloudfront';
        }

        history.replaceState(null, null, `#${hashName}-${this.currentSlide}`);
    }

    // Method to go to slide by title (useful for programmatic navigation)
    goToSlideByTitle(title) {
        const slideIndex = Array.from(this.slides).findIndex(slide => {
            const h1 = slide.querySelector('h1');
            return h1 && h1.textContent.toLowerCase().includes(title.toLowerCase());
        });

        if (slideIndex !== -1) {
            this.goToSlide(slideIndex + 1);
        }
    }

    // Method to get current slide info
    getCurrentSlideInfo() {
        const currentSlideElement = this.slides[this.currentSlide - 1];
        const title = currentSlideElement.querySelector('h1')?.textContent || 'Untitled';
        const sectionInfo = this.getSectionForSlide(this.currentSlide);

        return {
            number: this.currentSlide,
            total: this.totalSlides,
            title: title,
            section: sectionInfo,
            id: currentSlideElement.id,
            isCloudFront: this.cloudfrontSlides.includes(this.currentSlide)
        };
    }

    // CloudFront specific navigation methods
    goToFirstCloudFrontSlide() {
        this.goToSlide(20);
    }

    goToLastCloudFrontSlide() {
        this.goToSlide(23);
    }

    isCurrentSlideCloudFront() {
        return this.cloudfrontSlides.includes(this.currentSlide);
    }

    getCloudFrontProgress() {
        if (!this.isCurrentSlideCloudFront()) {
            return 0;
        }
        const currentIndex = this.cloudfrontSlides.indexOf(this.currentSlide);
        return ((currentIndex + 1) / this.cloudfrontSlides.length) * 100;
    }

    // Auto-advance functionality (optional, not activated by default)
    startAutoAdvance(intervalMs = 18000) { // Slightly longer for CloudFront slides
        this.autoAdvanceInterval = setInterval(() => {
            if (this.currentSlide < this.totalSlides) {
                // Pause longer on CloudFront slides
                const nextInterval = this.cloudfrontSlides.includes(this.currentSlide + 1) ? intervalMs * 1.5 : intervalMs;
                this.goToNextSlide();
            } else {
                this.stopAutoAdvance();
            }
        }, intervalMs);
    }

    stopAutoAdvance() {
        if (this.autoAdvanceInterval) {
            clearInterval(this.autoAdvanceInterval);
            this.autoAdvanceInterval = null;
        }
    }

    // Fullscreen toggle functionality
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.log(`Error attempting to exit fullscreen: ${err.message}`);
            });
        }
    }

    // Method to navigate to specific sections for demo purposes
    navigateToSection(sectionName) {
        const sectionMap = {
            'intro': 1,
            'introduction': 1,
            'iam': 2,
            'network': 3,
            'data': 4,
            'cloudfront': 4, // CloudFront is in section 4
            'monitoring': 5,
            'scenarios': 6,
            'best-practices': 7,
            'practices': 7
        };

        const sectionId = sectionMap[sectionName.toLowerCase()];
        if (sectionId) {
            this.goToSection(sectionId);
        }
    }

    // Export presentation data (useful for analytics)
    getSessionData() {
        return {
            totalSlides: this.totalSlides,
            currentSlide: this.currentSlide,
            sections: this.sections,
            cloudfrontSlides: this.cloudfrontSlides,
            currentSlideInfo: this.getCurrentSlideInfo(),
            timestamp: new Date().toISOString(),
            version: '2.0-cloudfront'
        };
    }

    // Initialize from URL hash if present
    initFromURL() {
        const hash = window.location.hash;
        if (hash) {
            const slideMatch = hash.match(/-(\d+)$/);
            if (slideMatch) {
                const slideNumber = parseInt(slideMatch[1]);
                if (slideNumber >= 1 && slideNumber <= this.totalSlides) {
                    this.goToSlide(slideNumber);
                }
            }
        }
    }

    // Performance tracking for CloudFront slides
    trackSlidePerformance() {
        if (this.isCurrentSlideCloudFront()) {
            const slideInfo = this.getCurrentSlideInfo();
            console.log(`📊 CloudFront slide performance: ${slideInfo.title}`);

            // Could implement analytics here
            return {
                slide: this.currentSlide,
                section: 'CloudFront',
                timestamp: Date.now(),
                title: slideInfo.title
            };
        }
        return null;
    }

    // Get training progress summary
    getTrainingProgress() {
        const sectionInfo = this.getSectionForSlide(this.currentSlide);
        const totalSections = Object.keys(this.sections).length;
        const currentSectionId = sectionInfo ? sectionInfo.id : 1;

        return {
            currentSlide: this.currentSlide,
            totalSlides: this.totalSlides,
            currentSection: currentSectionId,
            totalSections: totalSections,
            sectionProgress: ((currentSectionId - 1) / totalSections) * 100,
            slideProgress: (this.currentSlide / this.totalSlides) * 100,
            isCloudFrontSection: this.isCurrentSlideCloudFront(),
            cloudFrontProgress: this.getCloudFrontProgress(),
            estimatedTimeRemaining: this.getEstimatedTimeRemaining()
        };
    }

    // Calculate estimated time remaining
    getEstimatedTimeRemaining() {
        const remainingSlides = this.totalSlides - this.currentSlide;
        const averageTimePerSlide = 5; // minutes
        return remainingSlides * averageTimePerSlide;
    }
}

// Utility functions
function addTouchSupport() {
    let startX = 0;
    let endX = 0;
    let startY = 0;
    let endY = 0;

    document.addEventListener('touchstart', e => {
        startX = e.changedTouches[0].screenX;
        startY = e.changedTouches[0].screenY;
    });

    document.addEventListener('touchend', e => {
        endX = e.changedTouches[0].screenX;
        endY = e.changedTouches[0].screenY;
        handleSwipe();
    });

    function handleSwipe() {
        const threshold = 100;
        const differenceX = startX - endX;
        const differenceY = Math.abs(startY - endY);

        // Only process horizontal swipes (avoid vertical scrolling conflicts)
        if (Math.abs(differenceX) > threshold && differenceY < threshold) {
            if (differenceX > 0) {
                // Swipe left - next slide
                presentation.goToNextSlide();
            } else {
                // Swipe right - previous slide
                presentation.goToPrevSlide();
            }
        }
    }
}

// Additional keyboard shortcuts
function addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only handle shortcuts if not typing in an input
        if (e.target.tagName.toLowerCase() !== 'input' && e.target.tagName.toLowerCase() !== 'textarea') {
            switch(e.key.toLowerCase()) {
                case 'f':
                    if (e.ctrlKey /*|| e.metaKey*/) {
                        e.preventDefault();
                        presentation.toggleFullscreen();
                    }
                    break;
                case 'r':
                    if (e.ctrlKey /*|| e.metaKey*/) {
                        e.preventDefault();
                        presentation.goToSlide(1);
                    }
                    break;
                case 'p':
                    if (e.ctrlKey /*|| e.metaKey*/) {
                        e.preventDefault();
                        console.log('Presentation Data:', presentation.getSessionData());
                        console.log('Training Progress:', presentation.getTrainingProgress());
                    }
                    break;
                case 'a':
                    if (e.ctrlKey /*|| e.metaKey*/) {
                        e.preventDefault();
                        // Toggle auto-advance
                        if (presentation.autoAdvanceInterval) {
                            presentation.stopAutoAdvance();
                            console.log('Auto-advance stopped');
                        } else {
                            presentation.startAutoAdvance();
                            console.log('Auto-advance started (18s interval)');
                        }
                    }
                    break;
                // Quick navigation to sections
                case 'i':
                    if (e.altKey) {
                        e.preventDefault();
                        presentation.navigateToSection('intro');
                    }
                    break;
                case 'm':
                    if (e.altKey) {
                        e.preventDefault();
                        presentation.navigateToSection('monitoring');
                    }
                    break;
                case 's':
                    if (e.altKey) {
                        e.preventDefault();
                        presentation.navigateToSection('scenarios');
                    }
                    break;
                case 'b':
                    if (e.altKey) {
                        e.preventDefault();
                        presentation.navigateToSection('best-practices');
                    }
                    break;
                case 'c':
                    if (e.altKey) {
                        e.preventDefault();
                        presentation.goToCloudFrontSection();
                    }
                    break;
            }
        }
    });
}

// Enhanced loading experience
function showLoadingState() {
    // Add loading class to body
    document.body.classList.add('loading');

    // Remove loading state after everything is loaded
    window.addEventListener('load', () => {
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');

        // Initialize from URL if present
        presentation.initFromURL();
    });
}

// Handle visibility change (useful for presentations)
function handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden - pause any auto-advance
            if (presentation.autoAdvanceInterval) {
                presentation.stopAutoAdvance();
                console.log('Auto-advance paused (page hidden)');
            }
        } else {
            // Page is visible - could resume auto-advance if needed
            console.log('Page is now visible');
        }
    });
}

// Add presentation controls overlay (for presenter mode)
function addPresenterControls() {
    const controlsToggle = document.createElement('button');
    controlsToggle.innerHTML = '🎮';
    controlsToggle.style.position = 'fixed';
    controlsToggle.style.top = '20px';
    controlsToggle.style.right = '20px';
    controlsToggle.style.zIndex = '1000';
    controlsToggle.style.background = 'rgba(35, 47, 62, 0.9)';
    controlsToggle.style.color = 'white';
    controlsToggle.style.border = 'none';
    controlsToggle.style.borderRadius = '50%';
    controlsToggle.style.width = '50px';
    controlsToggle.style.height = '50px';
    controlsToggle.style.cursor = 'pointer';
    controlsToggle.style.fontSize = '20px';
    controlsToggle.title = 'Toggle Presenter Controls';

    let controlsVisible = false;

    controlsToggle.addEventListener('click', () => {
        controlsVisible = !controlsVisible;
        if (controlsVisible) {
            showPresenterInfo();
        } else {
            hidePresenterInfo();
        }
    });

    document.body.appendChild(controlsToggle);

    function showPresenterInfo() {
        const info = presentation.getCurrentSlideInfo();
        const progress = presentation.getTrainingProgress();
        const infoPanel = document.createElement('div');
        infoPanel.id = 'presenter-info';
        infoPanel.style.position = 'fixed';
        infoPanel.style.top = '80px';
        infoPanel.style.right = '20px';
        infoPanel.style.background = 'rgba(35, 47, 62, 0.95)';
        infoPanel.style.color = 'white';
        infoPanel.style.padding = '20px';
        infoPanel.style.borderRadius = '10px';
        infoPanel.style.zIndex = '999';
        infoPanel.style.minWidth = '300px';
        infoPanel.style.fontSize = '14px';

        infoPanel.innerHTML = `
            <h3 style="margin-top: 0; color: #FF9900;">Presenter Controls</h3>
            <p><strong>Current:</strong> ${info.number}/${info.total}</p>
            <p><strong>Title:</strong> ${info.title}</p>
            <p><strong>Section:</strong> ${info.section ? info.section.name : 'N/A'}</p>
            <p><strong>Duration:</strong> ${info.section ? info.section.duration : 'N/A'}</p>
            ${info.isCloudFront ? '<p><strong>🌐 CloudFront Slide</strong></p>' : ''}
            <div style="background: #4A90E2; height: 4px; border-radius: 2px; margin: 10px 0;">
                <div style="background: #FF9900; height: 100%; width: ${progress.slideProgress}%; border-radius: 2px;"></div>
            </div>
            <p><strong>Progress:</strong> ${Math.round(progress.slideProgress)}%</p>
            <p><strong>Time Left:</strong> ~${progress.estimatedTimeRemaining} minutes</p>
            <hr style="border-color: #666;">
            <p><strong>Shortcuts:</strong></p>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px;">
                <li>Arrow keys: Navigate</li>
                <li>Ctrl+F: Fullscreen</li>
                <li>Ctrl+1-7: Jump to section</li>
                <li>Alt+C: CloudFront section</li>
                <li>Alt+I/M/S/B: Quick navigation</li>
                <li>Ctrl+A: Toggle auto-advance</li>
                <li>Ctrl+P: Print session data</li>
            </ul>
        `;

        document.body.appendChild(infoPanel);
    }

    function hidePresenterInfo() {
        const infoPanel = document.getElementById('presenter-info');
        if (infoPanel) {
            infoPanel.remove();
        }
    }
}

// Initialize presentation when DOM is loaded
let presentation;

document.addEventListener('DOMContentLoaded', () => {
    // Show loading state
    showLoadingState();

    // Initialize presentation
    presentation = new AWSSecurityPresentation();

    // Add touch support for mobile
    addTouchSupport();

    // Add keyboard shortcuts
    addKeyboardShortcuts();

    // Handle visibility changes
    handleVisibilityChange();

    // Add presenter controls (optional)
    addPresenterControls();

    // Add focus management for accessibility
    document.addEventListener('focusin', (e) => {
        if (e.target.closest('.slide:not(.active)')) {
            e.target.blur();
        }
    });

/* Allow inspection by default. Presenter mode can enable stricter behavior. */
window.PRESENTER_MODE = false;

// Prevent context menu on right-click only when presenter mode enabled
        document.addEventListener('contextmenu', (e) => {
            if (!window.PRESENTER_MODE) return; // allow inspect unless presenter mode enabled
            if (e.target.closest('.slide')) {
                e.preventDefault();
            }
        });

    // Console message for developers and presenters
    console.log('🛡️ AWS Security Training với CloudFront đã load thành công!');
    console.log('📊 Tổng số slides: 28 (tăng từ 25)');
    console.log('🌐 CloudFront slides mới: 20, 21, 22, 23');
    console.log('📚 Sections: Introduction, IAM, Network Security, Data Protection & CloudFront, Logging & Monitoring, Security Scenarios, Best Practices');
    console.log('⏱️  Thời gian training: 2 tiếng 15 phút (tăng 15 phút)');
    console.log('⌨️  Keyboard shortcuts:');
    console.log('   Arrow keys: Navigate slides');
    console.log('   Home/End: First/Last slide');
    console.log('   Ctrl+F: Toggle fullscreen');
    console.log('   Ctrl+R: Return to first slide');
    console.log('   Ctrl+1-7: Jump to specific section');
    console.log('   Alt+C: Jump to CloudFront section');
    console.log('   Alt+I/M/S/B: Quick section navigation');
    console.log('   Ctrl+A: Toggle auto-advance');
    console.log('   Ctrl+P: Print session data');
    console.log('🎮 Click the control button (top-right) for presenter mode');
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
    presentation.initFromURL();
});

// Handle page unload (cleanup)
window.addEventListener('beforeunload', (e) => {
    if (presentation.autoAdvanceInterval) {
        presentation.stopAutoAdvance();
    }
});

// Export for global access (useful for testing and demos)
window.AWSSecurityPresentation = AWSSecurityPresentation;

// CloudFront specific utilities
window.CloudFrontUtils = {
    goToCloudFront: () => presentation.goToCloudFrontSection(),
    isCloudFrontSlide: () => presentation.isCurrentSlideCloudFront(),
    getCloudFrontProgress: () => presentation.getCloudFrontProgress(),
    trackPerformance: () => presentation.trackSlidePerformance()
};
