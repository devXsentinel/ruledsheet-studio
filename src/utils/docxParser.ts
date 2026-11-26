import mammoth from 'mammoth';
import JSZip from 'jszip';
import { DocumentBlock, DocxImportSummary, BlockType, TableData, TableRowData } from '../types';
import {
  getPrebuiltFlowchartSvg,
  getPrebuiltFlowchartInfo,
  generateAsciiDiagramSvg,
  parseMatrixLines,
  generateMatrixSvg
} from './flowchartGenerator';

export interface ParseDocxResult {
  blocks: DocumentBlock[];
  summary: DocxImportSummary;
}

export interface RawBlockItem {
  text: string;
  tag: string;
  isList: boolean;
  tableData?: TableData;
  imageUrl?: string;
  imageWidthMm?: number;
  imageHeightMm?: number;
  diagramType?: string;
  rawDiagramLines?: string[];
  caption?: string;
  svgContent?: string;
}

/**
 * Detects if a text line appears to be part of an ASCII art diagram or flowchart.
 */
export function isAsciiDiagramLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Single connector pipe, arrow, or symbol: "|", "v", "^", "+", ">", "<"
  if (/^[\|\+\-\<\>v\^]$/i.test(trimmed)) return true;
  // Box line: +-----------------+ or +------+------+ or +=======+
  if (/^\+[-=+]+\+$/.test(trimmed)) return true;
  // Box side or divider with pipe: | ... |
  if (/^\|.*\|$/.test(trimmed) && trimmed.length >= 2) return true;
  // Lines that start with a pipe, e.g. "|                 |  Yes        No" or "| Col = Col + 1"
  if (trimmed.startsWith('|')) return true;
  // Lines that end with a pipe, e.g. "... |"
  if (trimmed.endsWith('|')) return true;
  // Flowchart connectors / arrows: e.g. "   |   " or "   v   " or "+------>+"
  if (/^[\|\+\-\<\>v\^ \t]{2,}$/i.test(trimmed) && /[\|\+\-\<\>v\^]/i.test(trimmed)) return true;
  // Decision branches / labels: e.g. "   Yes       No   "
  if (/^\s*(?:Yes|No|True|False)\s*(?:Yes|No|True|False)?\s*$/i.test(trimmed)) return true;
  if (/^\s*[\|\s]*(?:Yes|No)\b/i.test(trimmed) && /[\|\+]/.test(trimmed)) return true;
  // Tree branches: e.g. "/         \"
  if (/[\/\\]{1,2}\s+[\/\\]{1,2}/.test(trimmed)) return true;
  // Bracketed box trees, nodes, or matrices: e.g. "[ π (Ename, Dname) ]" or "[ 15  20  30 ]" or "M = [ ... ]"
  if (/^(?:[A-Za-z0-9_'\s]*=)?\s*\[.*\]\s*$/.test(trimmed)) return true;
  // Relationship labels: e.g. "(INHERITS / Polymorphic)" or "(Diagonal scratch pixels: ...)"
  if (/^\s*\(.*\)\s*$/.test(trimmed) && /[A-Z0-9\/\:]/i.test(trimmed)) return true;
  // Arrows with labels: e.g. "| Raw Frame I(x, y)" or "--> [LED Dome Light]"
  if (/[-=]{2,}>|<[-=]{2,}/.test(trimmed)) return true;
  if (/^[\|\s]+[A-Za-z0-9]/.test(trimmed) && trimmed.includes('|')) return true;
  // High concentration of diagram characters
  const symbols = (trimmed.match(/[\+\-\|v\^><_=\/\\]/g) || []).length;
  if (trimmed.length > 3 && symbols / trimmed.length >= 0.20) return true;
  return false;
}

/**
 * Checks if a collection of lines from a paragraph constitute an ASCII diagram block.
 */
export function isDiagramParagraphLines(lines: string[]): boolean {
  if (parseMatrixLines(lines)) return true;
  const nonBlank = lines.filter(l => l.trim().length > 0);
  if (nonBlank.length < 2) return false;
  let diagCount = 0;
  for (const line of nonBlank) {
    if (isAsciiDiagramLine(line)) {
      diagCount++;
    }
  }
  return (diagCount / nonBlank.length) >= 0.35 || diagCount >= 4;
}

/**
 * Checks if a line can be a valid continuation inside an active diagram buffer.
 */
export function isDiagramContinuationLine(line: string, buffer: string[]): boolean {
  if (buffer.length === 0) return false;
  const trimmed = line.trim();
  if (!trimmed) {
    // Only continue if buffer already has substantial content
    return buffer.length >= 2;
  }
  if (isAsciiDiagramLine(line)) return true;
  if (trimmed.includes('|') || trimmed.includes('+') || trimmed.includes('[') || trimmed.includes(']')) return true;
  return false;
}

/**
 * Generates an informative title/caption for the diagram based on surrounding context.
 */
export function getDiagramCaption(recentContext: string, content: string): string {
  const combined = `${recentContext} ${content}`.toLowerCase();
  if (combined.includes('n-queen') || combined.includes('queen') || combined.includes('backtracking')) {
    return 'Flowchart: N-Queens Backtracking';
  }
  if (combined.includes('salesman') || combined.includes('tsp') || combined.includes('branch and bound')) {
    return 'Flowchart: TSP Branch & Bound';
  }
  if (combined.includes('a*') || combined.includes('astar') || combined.includes('heuristic search')) {
    return 'Flowchart: A* Search Algorithm';
  }
  if (combined.includes('query tree') || combined.includes('relational algebra')) {
    return 'Query Tree Architecture';
  }
  if (combined.includes('defect') || combined.includes('computer vision') || combined.includes('cnn') || combined.includes('optical inspection')) {
    return 'Computer Vision Flowchart & Architecture';
  }
  if (combined.includes('rfid') || combined.includes('warehouse')) {
    return 'Smart Warehouse & RFID 3-Tier Architecture';
  }
  if (combined.includes('iiot') || combined.includes('sensor') || combined.includes('plc') || combined.includes('opc-ua')) {
    return 'Industrial IoT Architecture';
  }
  if (combined.includes('matrix') || combined.includes('cost matrix') || combined.includes('reduced matrix')) {
    return '';
  }
  if (combined.includes('hierarchy') || combined.includes('ordbms') || combined.includes('composite type')) {
    return 'Type Hierarchy Diagram';
  }
  return 'Flowchart Diagram';
}

/**
 * Transforms an ASCII flowchart or diagram into clean, readable structured flowchart steps
 * suitable for handwriting rendering on ruled notebook lines.
 */
export function cleanAsciiDiagramLines(lines: string[]): string[] {
  const result: string[] = [];
  const cleanBoxText = (s: string) => s.replace(/^[\|\+\-\s]+/, '').replace(/[\|\+\-\s]+$/, '').trim();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip pure horizontal borders like +--------+ or +===+
    if (/^\+[-=+]+\+$/.test(trimmed) || /^[-=]{4,}$/.test(trimmed)) {
      continue;
    }

    // Single connector lines like "   |   " or "   v   "
    if (/^[\|\s]*[vV\^][\|\s]*$/.test(trimmed)) {
      if (result.length > 0 && result[result.length - 1] !== '  ▼') {
        result.push('  ▼');
      }
      continue;
    }
    if (/^[\|\s]{1,5}$/.test(trimmed)) {
      continue;
    }

    // Branch indicator line: e.g. "Yes                  No"
    if (/^\s*[\|\+\-]*\s*(?:Yes|No|True|False)[\s\|\+\-]*(?:Yes|No|True|False)?\s*[\|\+\-]*$/i.test(trimmed)) {
      const yesNoClean = trimmed.replace(/[\|\+\-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (yesNoClean) {
        result.push(`  Branch: ${yesNoClean}`);
      }
      continue;
    }

    // Split by vertical pipes to extract boxed content
    const rawTokens = trimmed.split('|')
      .map(s => cleanBoxText(s))
      .filter(t => t.length > 0 && !/^[-+=v\^><\s]+$/.test(t));

    if (rawTokens.length > 0) {
      if (rawTokens.length > 1) {
        result.push(`  ├─► [ ${rawTokens[0]} ]`);
        for (let b = 1; b < rawTokens.length; b++) {
          result.push(`  └─► [ ${rawTokens[b]} ]`);
        }
      } else {
        const text = rawTokens[0];
        if (text.endsWith('?') || /^(?:Is|Has|Check|If)\b/i.test(text)) {
          result.push(`• < Decision: ${text} >`);
        } else {
          result.push(`[ ${text} ]`);
        }
        if (i < lines.length - 1) {
          result.push('  ▼');
        }
      }
      continue;
    }

    // Query trees or bracketed nodes: e.g. "[ π (Ename, Dname) ]" or "Table: Employee"
    const bracketMatch = trimmed.match(/\[(.*?)\]/);
    if (bracketMatch) {
      const nodeText = bracketMatch[1].trim();
      const leadingSpaces = line.search(/\S/);
      const indent = ' '.repeat(Math.min(12, Math.max(0, Math.floor(leadingSpaces / 2))));
      result.push(`${indent}└── [ ${nodeText} ]`);
      continue;
    }

    // Clean any residual text that doesn't have pipes
    const textWithoutSymbols = trimmed.replace(/^[\|\+\-\s]+/, '').replace(/[\|\+\-\s]+$/, '').trim();
    if (textWithoutSymbols.length > 2 && !/^[-+=v\^><\s]+$/.test(textWithoutSymbols)) {
      result.push(textWithoutSymbols);
    }
  }

  // Deduplicate consecutive arrows
  const finalSteps: string[] = [];
  for (let k = 0; k < result.length; k++) {
    const item = result[k];
    if (item === '  ▼' && finalSteps[finalSteps.length - 1] === '  ▼') {
      continue;
    }
    finalSteps.push(item);
  }

  // Remove trailing arrow if any
  if (finalSteps.length > 0 && finalSteps[finalSteps.length - 1] === '  ▼') {
    finalSteps.pop();
  }

  return finalSteps;
}

/**
 * Extracts structured rows and cells from an HTML table element.
 */
export function extractTableDataFromElement(tableElem: Element): TableData | null {
  const rows: TableRowData[] = [];
  const trElements = tableElem.querySelectorAll('tr');
  if (trElements.length === 0) return null;

  trElements.forEach((tr, rowIdx) => {
    const cellElements = tr.querySelectorAll('th, td');
    const cells: string[] = [];
    let isHeader = false;

    cellElements.forEach(cell => {
      if (cell.tagName.toLowerCase() === 'th') isHeader = true;
      // Clean and normalize cell text
      const text = cell.textContent?.trim().replace(/\s+/g, ' ') || '';
      cells.push(text);
    });

    if (rowIdx === 0 && (isHeader || tr.parentElement?.tagName.toLowerCase() === 'thead')) {
      isHeader = true;
    }

    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      rows.push({ cells, isHeader });
    }
  });

  if (rows.length === 0) return null;

  // Default first row as header if multiple rows exist and none was explicitly marked
  if (rows.length > 1 && !rows.some(r => r.isHeader)) {
    rows[0].isHeader = true;
  }

  return { rows };
}

/**
 * Parses markdown pipe tables into structured TableData.
 */
export function parseMarkdownTable(lines: string[]): TableData | null {
  const rows: TableRowData[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.includes('|')) continue;
    // Skip divider rows like |---|---|
    if (/^\|?(\s*:?-+:?\s*\|?)+$/.test(line)) {
      if (rows.length > 0) {
        rows[rows.length - 1].isHeader = true;
      }
      continue;
    }
    const rawCells = line.replace(/^\|/, '').replace(/\|$/, '').split('|');
    const cells = rawCells.map(c => c.trim());
    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      rows.push({ cells, isHeader: rows.length === 0 });
    }
  }
  if (rows.length === 0) return null;
  return { rows };
}

/**
 * Parses a .docx File object in the browser using mammoth,
 * extracting structured paragraphs, lists, and tables with intelligent Q&A classification.
 */
export async function parseDocxFile(file: File): Promise<ParseDocxResult> {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new Error('Please select a valid Microsoft Word (.docx) document.');
  }

  let arrayBuffer = await file.arrayBuffer();

  try {
    // 0. Pre-process Word math XML tags (<m:t>, <m:r>) into standard Word run text (<w:t>, <w:r>)
    // This prevents Mammoth from dropping Word Equation Editor math formulas (e.g. 4x4, (N=4), (0,0), ->)
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        let docXml = await docXmlFile.async('text');
        const updatedXml = docXml
          .replace(/<m:t(\b[^>]*)>/g, '<w:t$1>')
          .replace(/<\/m:t>/g, '</w:t>')
          .replace(/<m:r(\b[^>]*)>/g, '<w:r$1>')
          .replace(/<\/m:r>/g, '</w:r>');
        zip.file('word/document.xml', updatedXml);
        arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      }
    } catch (zipErr) {
      console.warn('Word equation pre-processing note:', zipErr);
    }

    // Extract HTML to preserve headings, lists, tables, and paragraphs
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    if (!html || html.trim().length === 0) {
      throw new Error('The Word document appears to be empty or has no readable text.');
    }

    // Parse HTML DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = doc.body.children;

    const rawBlocks: RawBlockItem[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const tag = node.tagName.toLowerCase();

      // 1. Direct Table Element
      if (tag === 'table') {
        const tableData = extractTableDataFromElement(node);
        if (tableData) {
          const textSummary = tableData.rows.map(r => r.cells.join(' | ')).join('\n');
          rawBlocks.push({
            text: textSummary,
            tag: 'table',
            isList: false,
            tableData
          });
          continue;
        }
      }

      // 2. Nested Table Element (e.g. wrapper div)
      const nestedTable = node.querySelector('table');
      if (nestedTable && tag !== 'p') {
        const clone = node.cloneNode(true) as Element;
        clone.querySelectorAll('table').forEach(t => t.remove());
        const preText = clone.textContent?.trim();
        if (preText) {
          rawBlocks.push({ text: preText, tag: 'p', isList: false });
        }
        const tableData = extractTableDataFromElement(nestedTable);
        if (tableData) {
          const textSummary = tableData.rows.map(r => r.cells.join(' | ')).join('\n');
          rawBlocks.push({
            text: textSummary,
            tag: 'table',
            isList: false,
            tableData
          });
          continue;
        }
      }

      // 3. Image Element (Standalone or inside paragraph)
      const imgElem = tag === 'img' ? (node as HTMLImageElement) : node.querySelector('img');
      if (imgElem && imgElem.getAttribute('src')) {
        const src = imgElem.getAttribute('src')!;
        const alt = imgElem.getAttribute('alt') || 'Diagram / Flowchart';
        rawBlocks.push({
          text: alt,
          tag: 'img',
          isList: false,
          imageUrl: src
        });
        continue;
      }

      // 4. Lists
      if (tag === 'ul' || tag === 'ol') {
        const listItems = node.querySelectorAll('li');
        listItems.forEach((li, idx) => {
          li.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
          const txt = li.textContent?.trim() || '';
          if (txt) {
            const subLines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            subLines.forEach((sLine, sIdx) => {
              const bullet = (tag === 'ol' && sIdx === 0) ? `${idx + 1}. ` : '• ';
              rawBlocks.push({ text: bullet + sLine, tag: 'li', isList: true });
            });
          }
        });
      } else {
        // 5. Regular Paragraphs or Diagram Blocks
        // In Word, ASCII flowcharts and architecture diagrams are placed in single paragraphs with <br /> separators.
        // We clone and preserve the exact newlines and indentation.
        const clone = node.cloneNode(true) as Element;
        clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        const rawContent = clone.textContent || '';
        const rawLines = rawContent.split(/\r?\n/);

        if (isDiagramParagraphLines(rawLines)) {
          const recentContext = rawBlocks.slice(-3).map(b => b.text).join(' ');
          const fullDiagramContext = `${recentContext} ${rawContent}`;
          const caption = getDiagramCaption(recentContext, fullDiagramContext);

          // 1. Try to match prebuilt authentic visual flowchart / architecture diagram first
          const prebuiltInfo = getPrebuiltFlowchartInfo(fullDiagramContext);
          if (prebuiltInfo) {
            // Avoid duplicate query tree diagrams if already added recently
            if (prebuiltInfo.diagramType === 'query_tree') {
              const hasRecentQueryTree = rawBlocks.slice(-8).some(b => b.diagramType === 'query_tree');
              if (hasRecentQueryTree) {
                continue;
              }
            }

            rawBlocks.push({
              text: prebuiltInfo.caption || caption,
              tag: 'img',
              isList: false,
              imageUrl: prebuiltInfo.svgDataUrl,
              svgContent: prebuiltInfo.svg,
              imageWidthMm: prebuiltInfo.widthMm,
              imageHeightMm: prebuiltInfo.heightMm,
              diagramType: prebuiltInfo.diagramType,
              rawDiagramLines: rawLines,
              caption: prebuiltInfo.caption || caption
            });
            continue;
          }

          // 2. Check if the block is a mathematical / numerical Matrix
          const matrixData = parseMatrixLines(rawLines);
          if (matrixData) {
            const matrixInfo = generateMatrixSvg(matrixData, {
              fontFamily: 'Bad Script',
              inkColor: '#000000'
            });
            rawBlocks.push({
              text: matrixData.prefix ? `${matrixData.prefix} [Matrix]` : 'Matrix',
              tag: 'img',
              isList: false,
              imageUrl: matrixInfo.svgDataUrl,
              svgContent: matrixInfo.svg,
              imageWidthMm: matrixInfo.widthMm,
              imageHeightMm: matrixInfo.heightMm,
              diagramType: 'matrix',
              rawDiagramLines: rawLines,
              caption: ''
            });
            continue;
          }

          // 3. Fall back to universal transparent ASCII diagram SVG
          const diagramInfo = generateAsciiDiagramSvg(rawLines, { caption, inkColor: '#000000' });
          if (diagramInfo.svgDataUrl) {
            rawBlocks.push({
              text: caption,
              tag: 'img',
              isList: false,
              imageUrl: diagramInfo.svgDataUrl,
              svgContent: diagramInfo.svg,
              imageWidthMm: diagramInfo.widthMm,
              imageHeightMm: diagramInfo.heightMm,
              diagramType: 'ascii',
              rawDiagramLines: rawLines,
              caption
            });
            continue;
          }
        }

        // Regular non-diagram paragraph
        const txt = node.textContent?.trim() || '';
        if (txt) {
          const subLines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          if (subLines.length > 1) {
            subLines.forEach(l => {
              rawBlocks.push({ text: l, tag, isList: /^[•\-\*]|\d+\.\s/.test(l) });
            });
          } else {
            rawBlocks.push({ text: txt, tag, isList: /^[•\-\*]|\d+\.\s/.test(txt) });
          }
        }
      }
    }

    // Fallback to raw text if HTML parsing returned 0 blocks
    if (rawBlocks.length === 0) {
      const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
      const lines = rawTextResult.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        rawBlocks.push({ text: line, tag: 'p', isList: false });
      });
    }

    const blocks = classifyBlocks(coalesceDiagramBlocks(rawBlocks));

    const wordCount = blocks.reduce((acc, b) => acc + b.text.split(/\s+/).filter(Boolean).length, 0);
    const questionsDetected = blocks.filter(b => b.type === 'question' || b.type === 'heading').length;
    const answersDetected = blocks.filter(b => b.type === 'answer').length;
    const tablesDetected = blocks.filter(b => b.type === 'table').length;

    const summary: DocxImportSummary = {
      fileName: file.name,
      fileSizeBytes: file.size,
      paragraphCount: blocks.length,
      wordCount,
      questionsDetected,
      answersDetected,
      tablesDetected
    };

    return { blocks, summary };
  } catch (err: any) {
    console.error('Error parsing .docx:', err);
    throw new Error(err?.message || 'Failed to read the .docx document. Ensure the file is not password-protected or corrupt.');
  }
}

export interface PrefixExtraction {
  marginPrefix?: string;
  body: string;
  detectedType?: BlockType;
}

/**
 * Extracts question/answer margin prefix (e.g., "Q.1", "Ans.", "1.", "(a)")
 * to be positioned in the left margin column to the left of the index line.
 */
export function extractMarginPrefix(rawText: string): PrefixExtraction {
  const trimmed = rawText.trim();
  if (!trimmed) return { body: '' };

  // 1. Question prefixes: Q1, Q.1, Q. 1, Question 1, Q1: etc.
  const qMatch = trimmed.match(/^(Q(?:uestion)?\s*[\.\:\-\)]*\s*(\d+)?[\.\:\-\)]*)\s*(.*)$/i);
  if (qMatch && qMatch[1].trim().length > 0 && !['QUANTITY', 'QUERY'].includes(qMatch[1].trim().toUpperCase())) {
    const num = qMatch[2];
    const prefix = num ? `Q.${num}` : 'Q.';
    const body = qMatch[3].replace(/^[\:\-\.]\s*/, '').trim();
    return { marginPrefix: prefix, body, detectedType: 'question' };
  }

  // 2. Answer prefixes: Ans., Ans:, Answer:, Sol., Solution:
  const aMatch = trimmed.match(/^(Ans(?:wer)?|Sol(?:ution)?)\s*[\.\:\-\)]*\s*(.*)$/i);
  if (aMatch) {
    const body = aMatch[2].replace(/^[\:\-\.]\s*/, '').trim();
    return { marginPrefix: 'Ans.', body, detectedType: 'answer' };
  }

  // 3. Sub-parts or lists: (a), (b), (i), 1., 2., 1), a)
  const listMatch = trimmed.match(/^(\([a-z0-9ivx]+\)|[0-9]{1,2}[\.\)]|[a-z]\))\s+(.*)$/i);
  if (listMatch) {
    const prefix = listMatch[1].trim();
    const body = listMatch[2].trim();
    return { marginPrefix: prefix, body, detectedType: 'normal' };
  }

  return { body: trimmed };
}

/**
 * Coalesces consecutive ASCII diagram/flowchart lines into a single visual diagram block
 * so that the flowchart retains its authentic 2D layout and orientation.
 */
export function coalesceDiagramBlocks(items: RawBlockItem[]): RawBlockItem[] {
  const result: RawBlockItem[] = [];
  let diagramBuffer: RawBlockItem[] = [];

  const flushDiagramBuffer = () => {
    if (diagramBuffer.length === 0) return;

    if (diagramBuffer.length >= 2) {
      const lines = diagramBuffer.map(b => b.text);
      const fullText = lines.join('\n');
      const recentContext = result.slice(-4).map(b => b.text).join(' ');
      const caption = getDiagramCaption(recentContext, fullText);

      // 1. Check if matching prebuilt vector SVG diagram first
      const prebuiltInfo = getPrebuiltFlowchartInfo(`${recentContext} ${fullText}`);
      if (prebuiltInfo) {
        if (prebuiltInfo.diagramType === 'query_tree') {
          const hasRecentQueryTree = result.slice(-8).some(b => b.diagramType === 'query_tree');
          if (hasRecentQueryTree) {
            diagramBuffer = [];
            return;
          }
        }

        result.push({
          text: prebuiltInfo.caption || caption,
          tag: 'img',
          isList: false,
          imageUrl: prebuiltInfo.svgDataUrl,
          svgContent: prebuiltInfo.svg,
          imageWidthMm: prebuiltInfo.widthMm,
          imageHeightMm: prebuiltInfo.heightMm,
          diagramType: prebuiltInfo.diagramType,
          rawDiagramLines: lines,
          caption: prebuiltInfo.caption || caption
        });
        diagramBuffer = [];
        return;
      }

      // 2. Check if the block is a mathematical / numerical Matrix
      const matrixData = parseMatrixLines(lines);
      if (matrixData) {
        const matrixInfo = generateMatrixSvg(matrixData, {
          fontFamily: 'Bad Script',
          inkColor: '#000000'
        });
        result.push({
          text: matrixData.prefix ? `${matrixData.prefix} [Matrix]` : 'Matrix',
          tag: 'img',
          isList: false,
          imageUrl: matrixInfo.svgDataUrl,
          svgContent: matrixInfo.svg,
          imageWidthMm: matrixInfo.widthMm,
          imageHeightMm: matrixInfo.heightMm,
          diagramType: 'matrix',
          rawDiagramLines: lines,
          caption: '' // No artificial caption below matrix
        });
        diagramBuffer = [];
        return;
      }

      // 3. Universal ASCII diagram SVG preserving exact 2D orientation matching Word
      const diagramInfo = generateAsciiDiagramSvg(lines, { caption, inkColor: '#000000' });
      if (diagramInfo.svgDataUrl) {
        result.push({
          text: caption,
          tag: 'img',
          isList: false,
          imageUrl: diagramInfo.svgDataUrl,
          svgContent: diagramInfo.svg,
          imageWidthMm: diagramInfo.widthMm,
          imageHeightMm: diagramInfo.heightMm,
          diagramType: 'ascii',
          rawDiagramLines: lines,
          caption
        });
        diagramBuffer = [];
        return;
      }
    } else if (diagramBuffer.length === 1) {
      const singleText = diagramBuffer[0].text;
      const recentContext = result.slice(-3).map(b => b.text).join(' ');
      const singlePrebuilt = getPrebuiltFlowchartInfo(`${recentContext} ${singleText}`);
      if (singlePrebuilt) {
        result.push({
          text: singlePrebuilt.caption,
          tag: 'img',
          isList: false,
          imageUrl: singlePrebuilt.svgDataUrl,
          svgContent: singlePrebuilt.svg,
          imageWidthMm: singlePrebuilt.widthMm,
          imageHeightMm: singlePrebuilt.heightMm,
          diagramType: singlePrebuilt.diagramType,
          rawDiagramLines: [singleText],
          caption: singlePrebuilt.caption
        });
        diagramBuffer = [];
        return;
      }
      const singleLines = singleText.split(/\r?\n/);
      const singleMatrix = parseMatrixLines(singleLines);
      if (singleMatrix) {
        const matrixInfo = generateMatrixSvg(singleMatrix, {
          fontFamily: 'Bad Script',
          inkColor: '#000000'
        });
        result.push({
          text: singleMatrix.prefix ? `${singleMatrix.prefix} [Matrix]` : 'Matrix',
          tag: 'img',
          isList: false,
          imageUrl: matrixInfo.svgDataUrl,
          svgContent: matrixInfo.svg,
          imageWidthMm: matrixInfo.widthMm,
          imageHeightMm: matrixInfo.heightMm,
          diagramType: 'matrix',
          rawDiagramLines: singleLines,
          caption: ''
        });
        diagramBuffer = [];
        return;
      }
    }

    diagramBuffer.forEach(b => result.push(b));
    diagramBuffer = [];
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.tag === 'img' || item.tag === 'table' || item.imageUrl || item.tableData) {
      flushDiagramBuffer();
      result.push(item);
      continue;
    }

    if (isAsciiDiagramLine(item.text)) {
      diagramBuffer.push(item);
      continue;
    } else {
      flushDiagramBuffer();
      result.push(item);
    }
  }

  flushDiagramBuffer();
  return result;
}

/**
 * Classifies raw paragraph blocks into Question, Answer, Heading, Normal, or Table,
 * automatically separating margin tags (Q.1, Ans.) from body text.
 */
export function classifyBlocks(items: RawBlockItem[]): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let inQuestionContext = false;

  for (let i = 0; i < items.length; i++) {
    const { text, tag, isList, tableData, imageUrl, svgContent, imageWidthMm, imageHeightMm, caption } = items[i];
    const id = `block_${i}_${Date.now()}`;
    const cleanText = text.trim();

    // 0. Image / Diagram Block
    if (tag === 'img' || imageUrl) {
      blocks.push({
        id,
        type: 'image',
        text: cleanText || 'Diagram / Flowchart',
        indentMm: 0,
        sourceParagraphIndex: i,
        imageUrl,
        svgContent,
        imageWidthMm: imageWidthMm || 120,
        imageHeightMm: imageHeightMm || 60,
        diagramType: items[i].diagramType,
        rawDiagramLines: items[i].rawDiagramLines,
        caption
      });
      continue;
    }

    // 1. Table Block
    if (tag === 'table' && tableData) {
      blocks.push({
        id,
        type: 'table',
        text: cleanText,
        indentMm: 0,
        sourceParagraphIndex: i,
        tableData
      });
      continue;
    }

    // 2. Heading
    if (tag.startsWith('h') && tag.length === 2) {
      blocks.push({
        id,
        type: 'heading',
        text: cleanText,
        indentMm: 0,
        sourceParagraphIndex: i
      });
      inQuestionContext = false;
      continue;
    }

    const extracted = extractMarginPrefix(cleanText);
    let type: BlockType = 'normal';
    let indentMm = isList ? 4.0 : 0;
    const marginPrefix = extracted.marginPrefix;
    const bodyText = extracted.body;

    if (extracted.detectedType === 'question') {
      type = 'question';
      inQuestionContext = true;
    } else if (extracted.detectedType === 'answer') {
      type = 'answer';
      inQuestionContext = true;
    } else {
      // Secondary heuristics for questions without explicit Q. prefix (e.g. "What is...")
      const questionMatch = cleanText.match(
        /^(?:(?:[0-9]{1,2}[\.\)]\s*(?:What|Why|How|Explain|Define|Discuss|Describe|Write|State|List|Calculate|Compare|Differentiate|Solve|Find|Show|Prove|Give|Comment|Mention|Illustrate)|^(?:Problem|Ex(?:ample)?|Task)\s*\d*)|(?:.*\?\s*$))/i
      );

      if (questionMatch) {
        type = 'question';
        inQuestionContext = true;
      } else if (inQuestionContext && !isList) {
        type = 'answer';
      } else {
        type = 'normal';
      }
    }

    blocks.push({
      id,
      type,
      text: bodyText,
      marginPrefix,
      indentMm,
      sourceParagraphIndex: i
    });
  }

  return blocks;
}

/**
 * Parses plain text pasted or edited by the user into structured blocks,
 * with automatic detection of markdown pipe tables (| col 1 | col 2 |).
 */
export function parsePlainText(raw: string): DocumentBlock[] {
  const lines = raw.split(/\r?\n/);
  const items: RawBlockItem[] = [];
  let tableLinesBuffer: string[] = [];
  let diagramLinesBuffer: string[] = [];

  const flushTableBuffer = () => {
    if (tableLinesBuffer.length > 0) {
      const tableData = parseMarkdownTable(tableLinesBuffer);
      if (tableData) {
        items.push({
          text: tableLinesBuffer.join('\n'),
          tag: 'table',
          isList: false,
          tableData
        });
      } else {
        tableLinesBuffer.forEach(l => {
          if (l.trim()) {
            items.push({ text: l.trim(), tag: 'p', isList: false });
          }
        });
      }
      tableLinesBuffer = [];
    }
  };

  const flushDiagramBuffer = () => {
    if (diagramLinesBuffer.length > 0) {
      if (diagramLinesBuffer.length >= 2) {
        const recentContext = items.slice(-5).map(it => it.text).join(' ');
        const fullDiagramContext = `${recentContext} ${diagramLinesBuffer.join(' ')}`;
        const caption = getDiagramCaption(recentContext, fullDiagramContext);

        // 1. Try to match prebuilt authentic visual flowchart diagram first
        const prebuiltInfo = getPrebuiltFlowchartInfo(fullDiagramContext);
        if (prebuiltInfo) {
          items.push({
            text: prebuiltInfo.caption || caption,
            tag: 'img',
            isList: false,
            imageUrl: prebuiltInfo.svgDataUrl,
            svgContent: prebuiltInfo.svg,
            imageWidthMm: prebuiltInfo.widthMm,
            imageHeightMm: prebuiltInfo.heightMm,
            diagramType: prebuiltInfo.diagramType,
            rawDiagramLines: diagramLinesBuffer,
            caption: prebuiltInfo.caption || caption
          });
          diagramLinesBuffer = [];
          return;
        }

        // 2. Check if the block is a mathematical / numerical Matrix
        const matrixData = parseMatrixLines(diagramLinesBuffer);
        if (matrixData) {
          const matrixInfo = generateMatrixSvg(matrixData, {
            fontFamily: 'Bad Script',
            inkColor: '#000000'
          });
          items.push({
            text: matrixData.prefix ? `${matrixData.prefix} [Matrix]` : 'Matrix',
            tag: 'img',
            isList: false,
            imageUrl: matrixInfo.svgDataUrl,
            svgContent: matrixInfo.svg,
            imageWidthMm: matrixInfo.widthMm,
            imageHeightMm: matrixInfo.heightMm,
            diagramType: 'matrix',
            rawDiagramLines: diagramLinesBuffer,
            caption: ''
          });
          diagramLinesBuffer = [];
          return;
        }

        // 3. Universal ASCII diagram SVG preserving exact 2D orientation matching Word
        const diagramInfo = generateAsciiDiagramSvg(diagramLinesBuffer, { caption, inkColor: '#000000' });
        if (diagramInfo.svgDataUrl) {
          items.push({
            text: caption,
            tag: 'img',
            isList: false,
            imageUrl: diagramInfo.svgDataUrl,
            svgContent: diagramInfo.svg,
            imageWidthMm: diagramInfo.widthMm,
            imageHeightMm: diagramInfo.heightMm,
            diagramType: 'ascii',
            rawDiagramLines: diagramLinesBuffer,
            caption
          });
          diagramLinesBuffer = [];
          return;
        }
      }

      diagramLinesBuffer.forEach(l => {
        if (l.trim()) items.push({ text: l.trim(), tag: 'p', isList: false });
      });
      diagramLinesBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. If currently accumulating an ASCII diagram, keep accumulating diagram lines
    if (diagramLinesBuffer.length > 0) {
      if (isAsciiDiagramLine(rawLine) || isDiagramContinuationLine(rawLine, diagramLinesBuffer)) {
        diagramLinesBuffer.push(rawLine);
        continue;
      } else {
        flushDiagramBuffer();
      }
    }

    // 2. Markdown Table Row (starts and ends with pipe, table buffer active or delimiter follows)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && !trimmed.includes('+') && !isAsciiDiagramLine(rawLine)) {
      flushDiagramBuffer();
      tableLinesBuffer.push(trimmed);
      continue;
    } else {
      flushTableBuffer();
    }

    // 3. New ASCII Flowchart / Diagram Line starting a buffer
    if (isAsciiDiagramLine(rawLine)) {
      diagramLinesBuffer.push(rawLine);
      continue;
    } else {
      flushDiagramBuffer();
    }

    if (!trimmed) continue;

    items.push({
      text: trimmed,
      tag: trimmed.startsWith('#') ? 'h2' : 'p',
      isList: /^[•\-\*]|\d+\.\s/.test(trimmed)
    });
  }

  flushTableBuffer();
  flushDiagramBuffer();

  return classifyBlocks(coalesceDiagramBlocks(items));
}

/**
 * Built-in realistic sample assignment text with questions, answers, and a comparison table for instant testing
 */
export const SAMPLE_ASSIGNMENT_TEXT = `Q.1 Explain the difference between Microprocessor and Microcontroller with suitable examples.
Ans. A Microprocessor contains only the central processing unit (CPU) on a single integrated chip, requiring external memory (RAM, ROM) and I/O ports to function as a complete system (e.g., Intel Core i7, 8085). In contrast, a Microcontroller integrates a CPU, memory, timers, and I/O peripherals onto a single chip, making it ideal for dedicated embedded control systems (e.g., Arduino ATmega328, 8051).

| Feature | Microprocessor | Microcontroller |
| Architecture | Only CPU integrated on chip | CPU, RAM, ROM, Timers on chip |
| Memory | Requires external RAM & ROM | Has built-in RAM & ROM |
| Typical Cost | Higher overall system cost | Lower cost, compact design |
| Applications | Laptops, Desktop Computers | Arduino, Washing Machines, Car ECUs |

Q.2 What are the primary functions of an Operating System? Discuss process scheduling.
Ans. An Operating System acts as an intermediary between computer hardware and the user. Its main functions include processor management, memory allocation, device driver management, file system organization, and system security.
Process scheduling determines which active process in memory receives CPU execution time, maximizing CPU utilization and system throughput using algorithms like Round Robin and Priority Scheduling.

Q.3 Describe the advantages of Cloud Computing in modern enterprise architecture.
Ans. Cloud Computing provides high scalability, on-demand resource provisioning, cost efficiency through pay-as-you-go pricing, and disaster recovery. It allows enterprises to deploy applications globally without maintaining physical server infrastructure.

Q.4 Write short notes on:
1. Cache Memory: A high-speed volatile storage placed close to the processor to bridge the CPU-DRAM speed gap.
2. Virtual Memory: An OS feature allowing execution of programs exceeding physical RAM using disk paging.`;
