import {
  DocumentBlock,
  TemplateConfig,
  HandwritingSettings,
  LayoutLine,
  LayoutPage,
  LayoutResult,
  LayoutTable,
  LayoutTableCell,
  LayoutTableGridLine
} from '../types';
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
 * Places text and tables onto ruled lines across pages, calculating exact physical mm and pt coordinates.
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
  let pageTables: LayoutTable[] = [];
  let totalLinesCount = 0;
  let globalLineSeed = 42;

  function ensurePage() {
    while (pages.length <= currentPageIndex) {
      pages.push({
        pageIndex: pages.length,
        lines: [],
        tables: []
      });
    }
  }

  function advanceToNextPage() {
    ensurePage();
    if (pageLines.length > 0) {
      pages[currentPageIndex].lines = [...pageLines];
      pageLines = [];
    }
    if (pageTables.length > 0) {
      pages[currentPageIndex].tables = [...pageTables];
      pageTables = [];
    }
    currentPageIndex++;
    currentLineIndex = 0;
  }

  for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
    const block = blocks[bIndex];
    if ((!block.text || block.text.trim().length === 0) && !block.marginPrefix && !block.tableData) continue;

    // 1. Force Page Break: if block has pageBreakBefore and we are not already at the clean top of a blank page
    if (block.pageBreakBefore && (currentLineIndex > 0 || (currentPageIndex === 0 && (pageLines.length > 0 || pageTables.length > 0)))) {
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

    // 3. TABLE BLOCK LAYOUT ON RULED LINES
    if (block.type === 'table' && block.tableData && block.tableData.rows.length > 0) {
      // Natural 1-line gap before table if not at top of page
      if (currentLineIndex > 0 && currentLineIndex < linesMm.length - 2) {
        currentLineIndex += 1;
      }

      const blockIndentMm = block.indentMm || 0;
      const tableLeftX = template.writingArea.leftMarginMm + blockIndentMm;
      const tableRightX = effectiveRightMarginMm;
      const tableWidth = Math.max(30, tableRightX - tableLeftX);
      const numCols = Math.max(1, ...block.tableData.rows.map(r => r.cells.length));

      // Calculate column widths
      const colWidths: number[] = [];
      if (block.tableData.colWidthsRatio && block.tableData.colWidthsRatio.length === numCols) {
        const sumRatio = block.tableData.colWidthsRatio.reduce((a, b) => a + b, 0);
        for (let c = 0; c < numCols; c++) {
          colWidths.push((block.tableData.colWidthsRatio[c] / sumRatio) * tableWidth);
        }
      } else {
        for (let c = 0; c < numCols; c++) {
          colWidths.push(tableWidth / numCols);
        }
      }

      // Column start X coordinates
      const colStarts: number[] = [];
      let colX = tableLeftX;
      for (let c = 0; c < numCols; c++) {
        colStarts.push(colX);
        colX += colWidths[c];
      }

      const tableFontSizePt = block.fontSizePt || (settings.fontSizePt > 13 ? settings.fontSizePt - 2.5 : settings.fontSizePt);
      const cellPaddingX = 2.0;
      const defaultPitchMm = linesMm.length > 1 ? (linesMm[linesMm.length - 1] - linesMm[0]) / (linesMm.length - 1) : 7.3;

      // Base stroke thickness for table lines (default bold 1.8pt, outer 2.1pt)
      const baseBorderWidthPt = block.tableData.borderWidthPt || 1.8;
      const outerBorderWidthPt = Math.round((baseBorderWidthPt + 0.3) * 10) / 10;
      const headerBorderWidthPt = Math.round((baseBorderWidthPt + 0.2) * 10) / 10;
      const dividerBorderWidthPt = baseBorderWidthPt;

      const gridColor = block.tableData.borderColor || (settings.smartQaColors ? '#1e3a8a' : (block.colorOverride || settings.normalColor || '#1e3a8a'));

      let activeTableOnPage: LayoutTable | null = null;
      let tablePageTopY = 0;
      let lastRowBottomY = 0;

      // Ensure space for at least 1 row on current page; otherwise advance to fresh page
      if (currentLineIndex + 2 >= linesMm.length) {
        advanceToNextPage();
      }

      const finishTableOnPage = () => {
        if (!activeTableOnPage) return;
        activeTableOnPage.heightMm = Math.round((lastRowBottomY - tablePageTopY) * 100) / 100;

        // Top border (placed directly on ruled line tablePageTopY)
        activeTableOnPage.gridLines.unshift({
          x1Mm: tableLeftX,
          y1Mm: Math.round(tablePageTopY * 100) / 100,
          x2Mm: tableRightX,
          y2Mm: Math.round(tablePageTopY * 100) / 100,
          strokeWidthPt: outerBorderWidthPt,
          color: gridColor
        });

        // Vertical boundaries (Left outer, Right outer)
        activeTableOnPage.gridLines.push({
          x1Mm: tableLeftX,
          y1Mm: Math.round(tablePageTopY * 100) / 100,
          x2Mm: tableLeftX,
          y2Mm: Math.round(lastRowBottomY * 100) / 100,
          strokeWidthPt: outerBorderWidthPt,
          color: gridColor
        });
        activeTableOnPage.gridLines.push({
          x1Mm: tableRightX,
          y1Mm: Math.round(tablePageTopY * 100) / 100,
          x2Mm: tableRightX,
          y2Mm: Math.round(lastRowBottomY * 100) / 100,
          strokeWidthPt: outerBorderWidthPt,
          color: gridColor
        });

        // Vertical column dividers
        for (let c = 1; c < numCols; c++) {
          activeTableOnPage.gridLines.push({
            x1Mm: Math.round(colStarts[c] * 100) / 100,
            y1Mm: Math.round(tablePageTopY * 100) / 100,
            x2Mm: Math.round(colStarts[c] * 100) / 100,
            y2Mm: Math.round(lastRowBottomY * 100) / 100,
            strokeWidthPt: dividerBorderWidthPt,
            color: gridColor
          });
        }

        activeTableOnPage = null;
      };

      for (let rIdx = 0; rIdx < block.tableData.rows.length; rIdx++) {
        const row = block.tableData.rows[rIdx];

        // Wrap cell text
        const wrappedCells: string[][] = [];
        for (let c = 0; c < numCols; c++) {
          const cellText = row.cells[c] || '';
          const maxTextWidthPt = Math.max(10, colWidths[c] - (cellPaddingX * 2)) * MM_TO_PT;
          const lines = wrapText(cellText, maxTextWidthPt, settings.fontFamily, tableFontSizePt);
          wrappedCells.push(lines);
        }
        const rowLinesCount = Math.max(1, ...wrappedCells.map(w => w.length));

        // Advance to next page if row exceeds remaining page lines
        if (currentLineIndex + rowLinesCount >= linesMm.length) {
          finishTableOnPage();
          advanceToNextPage();
        }

        // Initialize table on this page if starting
        if (!activeTableOnPage) {
          // Top horizontal line is placed DIRECTLY on physical ruled line linesMm[currentLineIndex]
          tablePageTopY = linesMm[currentLineIndex];

          activeTableOnPage = {
            id: `tbl_${block.id}_p${currentPageIndex}_${rIdx}`,
            blockId: block.id,
            pageIndex: currentPageIndex,
            xMm: tableLeftX,
            yMm: tablePageTopY,
            widthMm: tableWidth,
            heightMm: 0,
            cells: [],
            gridLines: [],
            fontFamily: settings.fontFamily,
            fontSizePt: tableFontSizePt
          };
          pageTables.push(activeTableOnPage);
        }

        // Place cell texts on the ruled lines within this row
        for (let k = 0; k < rowLinesCount; k++) {
          // Each subline k sits in the ruled slot ending at lineIdx
          const lineIdx = currentLineIndex + 1 + k;
          // Baseline sits neatly on the ruled line, with 0.75mm lift so descenders rest on the line
          let baselineY = linesMm[lineIdx] - 0.75 + settings.baselineOffsetMm;
          if (settings.naturalVariation) {
            baselineY += (pseudoRandom(globalLineSeed++) - 0.5) * 0.2;
          }

          for (let c = 0; c < numCols; c++) {
            const lineText = wrappedCells[c]?.[k];
            if (lineText && lineText.trim().length > 0) {
              const cellColor = row.isHeader
                ? (settings.smartQaColors ? settings.questionColor : settings.normalColor)
                : (settings.smartQaColors ? settings.answerColor : settings.normalColor);

              activeTableOnPage.cells.push({
                text: lineText,
                xMm: Math.round((colStarts[c] + cellPaddingX) * 100) / 100,
                baselineYMm: Math.round(baselineY * 100) / 100,
                widthMm: Math.round((colWidths[c] - (cellPaddingX * 2)) * 100) / 100,
                isHeader: row.isHeader,
                color: cellColor
              });
            }
          }
        }

        // The horizontal line under this row is placed DIRECTLY on linesMm[currentLineIndex + rowLinesCount]
        const rowEndLineIndex = currentLineIndex + rowLinesCount;
        const rowBottomY = linesMm[rowEndLineIndex];
        lastRowBottomY = rowBottomY;

        const isHeaderRow = !!row.isHeader;
        const isLastRowOfTable = rIdx === block.tableData.rows.length - 1;
        const rowLineWidthPt = isLastRowOfTable
          ? outerBorderWidthPt
          : isHeaderRow
          ? headerBorderWidthPt
          : dividerBorderWidthPt;

        activeTableOnPage.gridLines.push({
          x1Mm: tableLeftX,
          y1Mm: Math.round(rowBottomY * 100) / 100,
          x2Mm: tableRightX,
          y2Mm: Math.round(rowBottomY * 100) / 100,
          strokeWidthPt: rowLineWidthPt,
          color: isHeaderRow && settings.smartQaColors ? settings.questionColor : gridColor
        });

        currentLineIndex += rowLinesCount;
        totalLinesCount += rowLinesCount;
      }

      finishTableOnPage();

      // Ruled line gap after table
      currentLineIndex += 1;
      if (currentLineIndex >= linesMm.length) {
        advanceToNextPage();
      }

      continue; // Done with table block
    }

    // 4. Orphan prevention: if block is heading or question with <= 1 line left before page ends,
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

  // Push remaining lines and tables on the last page
  if (pageLines.length > 0 || pageTables.length > 0) {
    ensurePage();
    pages[currentPageIndex].lines = [...pageLines];
    if (pageTables.length > 0) {
      pages[currentPageIndex].tables = [...pageTables];
    }
  }

  // Ensure at least 1 page exists
  if (pages.length === 0) {
    pages.push({ pageIndex: 0, lines: [], tables: [] });
  }

  return {
    pages,
    totalPageCount: pages.length,
    totalLinesCount,
    warnings
  };
}
