import { DocumentBlock, TemplateConfig, HandwritingSettings, LayoutLine, LayoutPage, LayoutResult } from '../types';
import { extractMarginPrefix } from './docxParser';

// Standard conversion factor: 1 mm = 72 / 25.4 points
export const MM_TO_PT = 72 / 25.4; // ~2.83464567
export const PT_TO_MM = 25.4 / 72; // ~0.35277778

// Offscreen canvas for accurate text measurement
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureCtx = measureCanvas.getContext('2d');
  }
  return measureCtx!;
}

/**
 * Deterministic pseudo-random number generator for subtle natural handwriting jitter.
 * Same seed always generates identical jitter values, guaranteeing frozen layout.
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * Wraps text into lines that fit within maxWidthPt using canvas text measurement.
 */
export function wrapText(
  text: string,
  maxWidthPt: number,
  fontFamily: string,
  fontSizePt: number
): string[] {
  const ctx = getMeasureContext();
  ctx.font = `${fontSizePt}pt "${fontFamily}", cursive, sans-serif`;

  if (!text) return [''];

  // Split by explicit newlines so pressing Enter forces a new ruled line
  const rawParagraphs = text.split(/\r?\n/);
  const allLines: string[] = [];

  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const pText = rawParagraphs[pIdx].trim();
    if (!pText) {
      // Empty line created by pressing Enter twice -> produces an empty blank ruled line
      if (allLines.length > 0) {
        allLines.push('');
      }
      continue;
    }

    const words = pText.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      allLines.push('');
      continue;
    }

    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const candidate = `${currentLine} ${word}`;
      const metrics = ctx.measureText(candidate);
      // ctx.measureText returns CSS pixels (96 DPI). Convert to points (72 DPI): pt = px * (72 / 96)
      const candidateWidthPt = metrics.width * (72 / 96);

      if (candidateWidthPt <= maxWidthPt) {
        currentLine = candidate;
      } else {
        allLines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      allLines.push(currentLine);
    }
  }

  return allLines.length > 0 ? allLines : [''];
}

/**
 * Single source of truth for the document layout.
 * Places text onto ruled lines across pages, calculating exact physical mm and pt coordinates.
 */
export function computeLayout(
  blocks: DocumentBlock[],
  template: TemplateConfig,
  settings: HandwritingSettings
): LayoutResult {
  const pages: LayoutPage[] = [];
  const warnings: string[] = [];
  const linesMm = template.linesMm;

  if (!linesMm || linesMm.length === 0) {
    return {
      pages: [],
      totalPageCount: 0,
      totalLinesCount: 0,
      warnings: ['No writing lines defined in template calibration.']
    };
  }

  const effectiveRightMarginMm = settings.rightMarginMm ?? template.writingArea.rightMarginMm ?? 201.0;
  const usableWidthMm = Math.max(10, effectiveRightMarginMm - template.writingArea.leftMarginMm);

  let currentPageIndex = 0;
  let currentLineIndex = 0;
  let pageLines: LayoutLine[] = [];
  let totalLinesCount = 0;
  let globalLineSeed = 42;

  function ensurePage() {
    while (pages.length <= currentPageIndex) {
      pages.push({
        pageIndex: pages.length,
        lines: []
      });
    }
  }

  function advanceToNextPage() {
    if (pageLines.length > 0) {
      ensurePage();
      pages[currentPageIndex].lines = [...pageLines];
      pageLines = [];
    }
    currentPageIndex++;
    currentLineIndex = 0;
  }

  for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
    const block = blocks[bIndex];
    if ((!block.text || block.text.trim().length === 0) && !block.marginPrefix) continue;

    // 1. Force Page Break: if block has pageBreakBefore and we are not already at the clean top of a blank page
    if (block.pageBreakBefore && (currentLineIndex > 0 || (currentPageIndex === 0 && pageLines.length > 0))) {
      advanceToNextPage();
    }

    // 2. Ruled Line Spacing before block
    if (block.emptyLinesBefore !== undefined) {
      if (block.emptyLinesBefore > 0 && currentLineIndex > 0) {
        currentLineIndex += block.emptyLinesBefore;
        if (currentLineIndex >= linesMm.length) {
          advanceToNextPage();
        }
      }
    } else if (
      (block.type === 'question' || block.type === 'heading') &&
      currentLineIndex > 0 &&
      currentLineIndex < linesMm.length - 2
    ) {
      // Default natural 1-line gap before a question if space permits
      currentLineIndex += 1;
    }

    // 3. Orphan prevention: if block is heading or question with <= 1 line left before page ends,
    // move to top of next page so it isn't stranded alone at the bottom
    if (
      (block.type === 'question' || block.type === 'heading') &&
      currentLineIndex >= linesMm.length - 1
    ) {
      advanceToNextPage();
    }

    // Determine ink color
    let color = settings.smartQaColors
      ? (block.type === 'question' || block.type === 'heading' ? settings.questionColor : settings.answerColor)
      : settings.questionColor;

    if (block.colorOverride) {
      color = block.colorOverride;
    }

    // Handle margin prefix (Q.1, Ans., etc.)
    let marginPrefix = block.marginPrefix;
    let bodyText = block.text || '';

    if (settings.placePrefixInMargin) {
      // Auto-extract from bodyText if not explicitly separated
      if (!marginPrefix) {
        const extracted = extractMarginPrefix(bodyText);
        if (extracted.marginPrefix) {
          marginPrefix = extracted.marginPrefix;
          bodyText = extracted.body;
        }
      }
    } else {
      // If margin placement is disabled, prepend prefix to body text
      if (marginPrefix) {
        bodyText = `${marginPrefix} ${bodyText}`.trim();
        marginPrefix = undefined;
      }
    }

    // Effective font size for this block (Word-style per-line/block font size override)
    const blockFontSizePt = block.fontSizePt || settings.fontSizePt;

    // Available width for this block in points (respecting indent)
    const blockIndentMm = block.indentMm || 0;
    const blockWidthMm = Math.max(20, usableWidthMm - blockIndentMm);
    const blockWidthPt = blockWidthMm * MM_TO_PT;

    // Wrap paragraph into lines using blockFontSizePt
    const wrapped = wrapText(bodyText, blockWidthPt, settings.fontFamily, blockFontSizePt);

    const leftLimitMm = template.writingArea.leftMarginMm + blockIndentMm;
    const rightLimitMm = effectiveRightMarginMm;
    const availableWidthMm = Math.max(10, rightLimitMm - leftLimitMm);

    for (let wIndex = 0; wIndex < wrapped.length; wIndex++) {
      const lineText = wrapped[wIndex];

      // If page is full, advance to next page
      if (currentLineIndex >= linesMm.length) {
        advanceToNextPage();
      }

      // Calculate horizontal alignment (xMm)
      let xMm = leftLimitMm;
      if (block.alignment === 'center' || block.alignment === 'right') {
        const ctx = getMeasureContext();
        ctx.font = `${settings.fontSizePt}pt "${settings.fontFamily}", cursive, sans-serif`;
        const lineWidthPx = ctx.measureText(lineText).width;
        const lineWidthMm = lineWidthPx * (25.4 / 96); // Convert CSS px to mm

        if (block.alignment === 'center') {
          xMm = leftLimitMm + Math.max(0, (availableWidthMm - lineWidthMm) / 2);
        } else if (block.alignment === 'right') {
          xMm = Math.max(leftLimitMm, rightLimitMm - lineWidthMm);
        }
      }

      // Baseline calculation with rule line calibration and offset
      let baselineYMm = linesMm[currentLineIndex] + settings.baselineOffsetMm;

      // Subtle natural variation (if enabled, deterministic +/- 0.15mm jitter)
      if (settings.naturalVariation) {
        const jitter = (pseudoRandom(globalLineSeed++) - 0.5) * 0.3; // -0.15mm to +0.15mm
        baselineYMm += jitter;
      }

      // Place margin prefix on the first line of the block only (close to the vertical index line)
      const lineMarginPrefix = (wIndex === 0 && settings.placePrefixInMargin) ? marginPrefix : undefined;
      const defaultMarginX = settings.marginPrefixXMm ?? template.writingArea.marginLabelXMm ?? 19.5;
      const lineMarginXMm = lineMarginPrefix ? defaultMarginX : undefined;

      const layoutLine: LayoutLine = {
        id: `line_${currentPageIndex}_${currentLineIndex}_${wIndex}`,
        blockId: block.id,
        pageIndex: currentPageIndex,
        lineIndexOnPage: currentLineIndex,
        text: lineText,
        marginPrefix: lineMarginPrefix,
        marginXMm: lineMarginXMm,
        xMm: Math.round(xMm * 100) / 100,
        baselineYMm: Math.round(baselineYMm * 100) / 100,
        color,
        fontFamily: settings.fontFamily,
        fontSizePt: blockFontSizePt, // Uses block-level font size override!
        letterSpacing: settings.letterSpacing,
        isQuestion: block.type === 'question' || block.type === 'heading',
        alignment: block.alignment || 'left',
        isFirstLineOfBlock: wIndex === 0,
        hasPageBreakBefore: !!block.pageBreakBefore && wIndex === 0
      };

      pageLines.push(layoutLine);
      totalLinesCount++;
      currentLineIndex += settings.lineSpacingMultiplier;
    }
  }

  // Push remaining lines on the last page
  if (pageLines.length > 0) {
    ensurePage();
    pages[currentPageIndex].lines = [...pageLines];
  }

  // Ensure at least 1 page exists
  if (pages.length === 0) {
    pages.push({ pageIndex: 0, lines: [] });
  }

  return {
    pages,
    totalPageCount: pages.length,
    totalLinesCount,
    warnings
  };
}
