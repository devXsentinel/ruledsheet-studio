
/**
 * Deterministic pseudo-random number generator for natural handwriting micro-jitter.
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { LayoutResult, TemplateConfig, HandwritingSettings } from '../types';
import { MM_TO_PT } from './layoutEngine';

/**
 * Cache for loaded font ArrayBuffers to avoid re-fetching on multiple exports
 */
const fontBufferCache = new Map<string, ArrayBuffer>();
const fontBase64Cache = new Map<string, string>();

async function getFontBytes(fontFamily: string): Promise<ArrayBuffer> {
  const fontFileMap: Record<string, string> = {
    'Bad Script': '/fonts/BadScript-Regular.ttf',
    'Mynerve': '/fonts/Mynerve-Regular.ttf',
    'Covered By Your Grace': '/fonts/CoveredByYourGrace-Regular.ttf',
    'Reenie Beanie': '/fonts/ReenieBeanie-Regular.ttf',
    'Dawning of a New Day': '/fonts/DawningOfANewDay-Regular.ttf',
    'Shadows Into Light': '/fonts/ShadowsIntoLight-Regular.ttf',
    'Homemade Apple': '/fonts/HomemadeApple-Regular.ttf',
    'Caveat': '/fonts/Caveat-Regular.ttf',
    'Kalam': '/fonts/Kalam-Regular.ttf',
    'Patrick Hand': '/fonts/PatrickHand-Regular.ttf'
  };

  const url = fontFileMap[fontFamily] || fontFileMap['Bad Script'] || fontFileMap['Caveat'];

  if (fontBufferCache.has(url)) {
    return fontBufferCache.get(url)!;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load font from ${url}`);
  }
  const buf = await res.arrayBuffer();
  fontBufferCache.set(url, buf);
  return buf;
}

async function getFontBase64(fontFamily: string): Promise<string> {
  if (fontBase64Cache.has(fontFamily)) {
    return fontBase64Cache.get(fontFamily)!;
  }
  const buf = await getFontBytes(fontFamily);
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  fontBase64Cache.set(fontFamily, b64);
  return b64;
}

/**
 * Helper to parse hex color (#rrggbb) into pdf-lib rgb(r, g, b)
 */
function parseHexColor(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return rgb(0.1, 0.1, 0.1);
}

/**
 * Converts an SVG Data URL into high-resolution PNG bytes using an offscreen canvas
 * so pdf-lib can embed vector flowcharts into the exported PDF.
 * Injects the chosen TrueType handwriting font into the SVG before rasterization.
 */
async function svgDataUrlToPngBytes(svgDataUrl: string, fontFamily?: string): Promise<Uint8Array> {
  let targetUrl = svgDataUrl;
  if (fontFamily) {
    try {
      const b64 = await getFontBase64(fontFamily);
      const prefix = 'data:image/svg+xml;charset=utf-8,';
      if (svgDataUrl.startsWith(prefix)) {
        let svgText = decodeURIComponent(svgDataUrl.slice(prefix.length));
        const fontFaceTag = `<defs><style>
@font-face {
  font-family: '${fontFamily}';
  src: url('data:font/truetype;charset=utf-8;base64,${b64}') format('truetype');
  font-weight: normal;
  font-style: normal;
}
</style></defs>`;
        svgText = svgText.replace(/(<svg[^>]*>)/i, `$1\n${fontFaceTag}`);
        targetUrl = prefix + encodeURIComponent(svgText);
      }
    } catch (err) {
      console.warn('Could not embed font into SVG for PDF rasterization:', err);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || 680;
      const h = img.naturalHeight || 750;
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
          } else {
            reject(new Error('Canvas blob creation failed'));
          }
        }, 'image/png');
      } else {
        reject(new Error('Canvas 2D context unavailable'));
      }
    };
    img.onerror = (e) => reject(e);
    img.src = targetUrl;
  });
}

/**
 * Common PDF building logic that uses the EXACT frozen LayoutResult for both
 * Preview PDF (with template background) and Print PDF (text-only, transparent).
 */
export async function generateHandwritingPdf(
  layout: LayoutResult,
  template: TemplateConfig,
  settings: HandwritingSettings,
  includeBackground: boolean
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load and embed the chosen handwriting font
  let embeddedFont;
  try {
    const fontBytes = await getFontBytes(settings.fontFamily);
    embeddedFont = await pdfDoc.embedFont(fontBytes, {
      subset: false,
      features: { calt: true, liga: true }
    });
  } catch (err) {
    console.warn('Could not embed custom font in PDF, falling back to standard Helvetica:', err);
    embeddedFont = await pdfDoc.embedStandardFont('Helvetica' as any);
  }

  // Pre-load background image if preview mode is requested
  let embeddedImage: any = null;
  if (includeBackground && template.imageUrl) {
    try {
      const imgRes = await fetch(template.imageUrl);
      const imgBytes = await imgRes.arrayBuffer();
      // Inspect image signature or try embedding as JPEG or PNG
      try {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      } catch {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      }
    } catch (err) {
      console.warn('Could not load template background image for PDF:', err);
    }
  }

  // Calculate physical page dimensions in PDF points
  const pageWidthPt = template.pageWidthMm * MM_TO_PT;
  const pageHeightPt = template.pageHeightMm * MM_TO_PT;

  // Render each page from the frozen layout
  for (let pIdx = 0; pIdx < layout.pages.length; pIdx++) {
    const layoutPage = layout.pages[pIdx];
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    // Draw background image if preview mode
    if (includeBackground && embeddedImage) {
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: pageWidthPt,
        height: pageHeightPt
      });
    }

    // Draw text lines at exact physical coordinates
    // PDF coordinates: origin (0,0) is bottom-left
    // baselineY in PDF points = (pageHeightMm - baselineYMm) * MM_TO_PT
    let seed = 101;
    for (const line of layoutPage.lines) {
      if ((!line.text || line.text.trim().length === 0) && !line.marginPrefix) continue;

      const basePdfX = line.xMm * MM_TO_PT;
      const basePdfY = (template.pageHeightMm - line.baselineYMm) * MM_TO_PT;
      const color = parseHexColor(line.color);

      // Render Margin Prefix (e.g. Q.1, Ans. on the left of index line)
      if (line.marginPrefix && line.marginPrefix.trim().length > 0) {
        const marginX = (line.marginXMm || settings.marginPrefixXMm || template.writingArea.marginLabelXMm || 19.5) * MM_TO_PT;
        try {
          page.drawText(line.marginPrefix, {
            x: marginX,
            y: basePdfY,
            size: line.fontSizePt,
            font: embeddedFont,
            color: color,
            lineHeight: line.fontSizePt
          });
        } catch {
          const sanitized = line.marginPrefix.replace(/[^\x00-\x7F]/g, '?');
          page.drawText(sanitized, {
            x: marginX,
            y: basePdfY,
            size: line.fontSizePt,
            font: embeddedFont,
            color: color,
            lineHeight: line.fontSizePt
          });
        }
      }

      if (settings.naturalVariation) {
        // Natural humanized rendering: word-by-word micro-jitter and organic spacing
        const words = line.text.split(' ');
        let currentX = basePdfX;
        const spaceWidth = embeddedFont.widthOfTextAtSize(' ', line.fontSizePt);

        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          const word = words[wIdx];
          if (!word) {
            currentX += spaceWidth;
            continue;
          }

          // Subtle word-level baseline micro-jitter (+/- 0.12mm = +/- 0.35pt)
          const wordJitterPt = (pseudoRandom(seed++) - 0.5) * 0.7;
          const wordY = basePdfY + wordJitterPt;

          // Subtle ink pressure variation (+/- 2% lightness)
          const colorVariation = (pseudoRandom(seed++) - 0.5) * 0.035;
          const wordColor = rgb(
            Math.max(0, Math.min(1, color.red + colorVariation)),
            Math.max(0, Math.min(1, color.green + colorVariation)),
            Math.max(0, Math.min(1, color.blue + colorVariation))
          );

          try {
            page.drawText(word, {
              x: currentX,
              y: wordY,
              size: line.fontSizePt,
              font: embeddedFont,
              color: wordColor,
              lineHeight: line.fontSizePt
            });
          } catch {
            const sanitized = word.replace(/[^\x00-\x7F]/g, '?');
            page.drawText(sanitized, {
              x: currentX,
              y: wordY,
              size: line.fontSizePt,
              font: embeddedFont,
              color: wordColor,
              lineHeight: line.fontSizePt
            });
          }

          const wordWidth = embeddedFont.widthOfTextAtSize(word, line.fontSizePt);
          // Humanized space width between words (+/- 12%)
          const naturalSpace = spaceWidth * (0.88 + pseudoRandom(seed++) * 0.24);
          currentX += wordWidth + naturalSpace;
        }
      } else {
        // Standard uniform rendering
        try {
          page.drawText(line.text, {
            x: basePdfX,
            y: basePdfY,
            size: line.fontSizePt,
            font: embeddedFont,
            color: color,
            lineHeight: line.fontSizePt
          });
        } catch {
          const sanitized = line.text.replace(/[^\x00-\x7F]/g, '?');
          page.drawText(sanitized, {
            x: basePdfX,
            y: basePdfY,
            size: line.fontSizePt,
            font: embeddedFont,
            color: color,
            lineHeight: line.fontSizePt
          });
        }
      }
    }

    // Render tables on this page
    if (layoutPage.tables && layoutPage.tables.length > 0) {
      for (const tbl of layoutPage.tables) {
        // 1. Draw table grid lines (outer border, horizontal row dividers, and vertical column dividers)
        for (const gl of tbl.gridLines) {
          const x1Pt = gl.x1Mm * MM_TO_PT;
          const y1Pt = (template.pageHeightMm - gl.y1Mm) * MM_TO_PT;
          const x2Pt = gl.x2Mm * MM_TO_PT;
          const y2Pt = (template.pageHeightMm - gl.y2Mm) * MM_TO_PT;
          const lineColor = parseHexColor(gl.color);

          page.drawLine({
            start: { x: x1Pt, y: y1Pt },
            end: { x: x2Pt, y: y2Pt },
            thickness: gl.strokeWidthPt,
            color: lineColor
          });
        }

        // 2. Draw table cell handwritten text
        for (const cell of tbl.cells) {
          if (!cell.text || cell.text.trim().length === 0) continue;
          const cellPdfX = cell.xMm * MM_TO_PT;
          const cellPdfY = (template.pageHeightMm - cell.baselineYMm) * MM_TO_PT;
          const cellColor = parseHexColor(cell.color);

          try {
            page.drawText(cell.text, {
              x: cellPdfX,
              y: cellPdfY,
              size: tbl.fontSizePt,
              font: embeddedFont,
              color: cellColor,
              lineHeight: tbl.fontSizePt
            });
          } catch {
            const sanitized = cell.text.replace(/[^\x00-\x7F]/g, '?');
            page.drawText(sanitized, {
              x: cellPdfX,
              y: cellPdfY,
              size: tbl.fontSizePt,
              font: embeddedFont,
              color: cellColor,
              lineHeight: tbl.fontSizePt
            });
          }
        }
      }
    }

    // Render images / diagrams on this page
    if (layoutPage.images && layoutPage.images.length > 0) {
      for (const img of layoutPage.images) {
        try {
          let pdfImg: any = null;
          if (img.imageUrl.startsWith('data:image/svg+xml')) {
            try {
              const pngBytes = await svgDataUrlToPngBytes(img.imageUrl, settings.fontFamily);
              pdfImg = await pdfDoc.embedPng(pngBytes);
            } catch (svgErr) {
              console.warn('Could not rasterize vector SVG for PDF:', svgErr);
            }
          } else if (img.imageUrl.startsWith('data:image/png')) {
            const base64Data = img.imageUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            pdfImg = await pdfDoc.embedPng(bytes);
          } else if (img.imageUrl.startsWith('data:image/jpeg') || img.imageUrl.startsWith('data:image/jpg')) {
            const base64Data = img.imageUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            pdfImg = await pdfDoc.embedJpg(bytes);
          } else {
            const imgRes = await fetch(img.imageUrl);
            const imgBytes = await imgRes.arrayBuffer();
            try {
              pdfImg = await pdfDoc.embedPng(imgBytes);
            } catch {
              pdfImg = await pdfDoc.embedJpg(imgBytes);
            }
          }

          if (pdfImg) {
            const xPt = img.xMm * MM_TO_PT;
            const yPt = (template.pageHeightMm - (img.yMm + img.heightMm)) * MM_TO_PT;
            const widthPt = img.widthMm * MM_TO_PT;
            const heightPt = img.heightMm * MM_TO_PT;

            page.drawImage(pdfImg, {
              x: xPt,
              y: yPt,
              width: widthPt,
              height: heightPt
            });

            if (img.caption && img.caption.trim().length > 0 && !img.isMatrix) {
              const captionYPt = (template.pageHeightMm - (img.yMm + img.heightMm + 4)) * MM_TO_PT;
              page.drawText(img.caption, {
                x: xPt + widthPt / 2 - 20,
                y: captionYPt,
                size: 9,
                font: embeddedFont,
                color: parseHexColor('#000000')
              });
            }
          }
        } catch (imgErr) {
          console.warn('Could not embed image in PDF:', imgErr);
        }
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Triggers a direct browser file download for the generated PDF bytes.
 */
export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates a 1-page quick alignment test sheet.
 * Prints 3 calibrated lines with margin markers so the user can verify
 * physical printer line alignment with 1 test sheet without wasting ink/paper.
 */
export async function generateAlignmentTestPdf(
  template: TemplateConfig,
  settings: HandwritingSettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let embeddedFont;
  try {
    const fontBytes = await getFontBytes(settings.fontFamily);
    embeddedFont = await pdfDoc.embedFont(fontBytes, {
      subset: false,
      features: { calt: true, liga: true }
    });
  } catch (err) {
    embeddedFont = await pdfDoc.embedStandardFont('Helvetica' as any);
  }

  const helvetica = await pdfDoc.embedStandardFont('Helvetica' as any);

  const pageWidthPt = template.pageWidthMm * MM_TO_PT;
  const pageHeightPt = template.pageHeightMm * MM_TO_PT;
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  const lines = template.linesMm;
  const leftXPt = template.writingArea.leftMarginMm * MM_TO_PT;

  // Header guide line (small text in margin indicating test sheet)
  page.drawText('--- STANDARD A4 PRINT CALIBRATION TEST (Set Printer Scale to 100% / Actual Size) ---', {
    x: leftXPt,
    y: (template.pageHeightMm - 20) * MM_TO_PT,
    size: 7,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  });

  // Test lines with margin prefix (Q.1, Ans. on left of index line)
  const testItems = [
    { prefix: 'Q.1', text: 'Alignment Test: Text sits flush on Ruled Line 1, label in left margin.', color: rgb(0.07, 0.09, 0.15) },
    { prefix: 'Ans.', text: 'Labels Q.1 and Ans. sit to the left of the vertical double index rule.', color: rgb(0.12, 0.23, 0.54) },
    { prefix: '', text: 'Set printer scale to 100% (Actual Size). Ruled line pitch is exactly 7.30mm.', color: rgb(0.12, 0.23, 0.54) }
  ];

  const marginXPt = (settings.marginPrefixXMm || template.writingArea.marginLabelXMm || 19.5) * MM_TO_PT;
  const indexLineXPt = (template.writingArea.indexLineXMm || 29.13) * MM_TO_PT;

  // Draw alignment marker at index line
  page.drawLine({
    start: { x: indexLineXPt, y: (template.pageHeightMm - 24) * MM_TO_PT },
    end: { x: indexLineXPt, y: (template.pageHeightMm - 44) * MM_TO_PT },
    thickness: 0.5,
    color: rgb(0.8, 0.2, 0.2)
  });

  for (let i = 0; i < Math.min(testItems.length, lines.length); i++) {
    const lineMm = lines[i];
    const baselineYMm = lineMm + settings.baselineOffsetMm;
    const pdfY = (template.pageHeightMm - baselineYMm) * MM_TO_PT;

    // Small alignment tick mark in margin:
    page.drawLine({
      start: { x: leftXPt - 8, y: pdfY },
      end: { x: leftXPt - 2, y: pdfY },
      thickness: 0.5,
      color: rgb(0.2, 0.4, 0.9)
    });

    if (testItems[i].prefix) {
      page.drawText(testItems[i].prefix, {
        x: marginXPt,
        y: pdfY,
        size: settings.fontSizePt,
        font: embeddedFont,
        color: testItems[i].color
      });
    }

    page.drawText(testItems[i].text, {
      x: leftXPt,
      y: pdfY,
      size: settings.fontSizePt,
      font: embeddedFont,
      color: testItems[i].color
    });
  }

  return await pdfDoc.save();
}
