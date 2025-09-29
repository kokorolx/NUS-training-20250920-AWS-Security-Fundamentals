// javascript
/**
 * Create a PDF from images in a folder.
 *
 * Usage:
 *   node scripts/images-to-pdf.js [imagesDir] [outPdf]
 *
 * Defaults:
 *   imagesDir: ./images (falls back to ./scripts/images)
 *   outPdf:    ./images.pdf
 *
 * Requires: pdf-lib
 *   npm install pdf-lib
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

function isImageFile(name) {
  return /\.(png|jpe?g)$/i.test(name);
}

function sortFilenames(a, b) {
  // Numeric-aware sort (1,2,10)
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function imagesToPdf(imagesDir, outPath) {
  // Prefer provided dir, otherwise try ./images then ./scripts/images
  const candidates = [imagesDir, path.join(process.cwd(), 'images'), path.join(process.cwd(), 'scripts', 'images')].filter(Boolean);
  let foundDir = null;
  for (const d of candidates) {
    try {
      const st = await fs.stat(d);
      if (st.isDirectory()) {
        foundDir = d;
        break;
      }
    } catch (e) {
      // ignore
    }
  }
  if (!foundDir) throw new Error('No images directory found. Tried: ' + candidates.join(', '));

  const entries = await fs.readdir(foundDir);
  const imgs = entries.filter(isImageFile).sort(sortFilenames);
  if (imgs.length === 0) throw new Error('No image files (*.png, *.jpg, *.jpeg) found in ' + foundDir);

  const pdfDoc = await PDFDocument.create();

  for (const file of imgs) {
    const filePath = path.join(foundDir, file);
    const bytes = await fs.readFile(filePath);
    let embedded;
    if (/\.png$/i.test(file)) {
      embedded = await pdfDoc.embedPng(bytes);
    } else {
      embedded = await pdfDoc.embedJpg(bytes);
    }

    // pdf-lib image objects expose width and height
    const width = embedded.width;
    const height = embedded.height;

    // Create a page sized to the image and draw it at full size
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outPath, pdfBytes);
  return outPath;
}

// CLI entry
(async () => {
  try {
    const argDir = process.argv[2];
    const argOut = process.argv[3];
    const defaultOut = path.join(process.cwd(), 'images.pdf');
    const outPath = argOut || defaultOut;

    const written = await imagesToPdf(argDir, outPath);
    // Use console.log for easy capture in scripts
    console.log('Wrote PDF to', written);
  } catch (err) {
    console.error('Error creating PDF from images:', err);
    process.exitCode = 1;
  }
})();
