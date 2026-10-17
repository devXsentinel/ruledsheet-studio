export type PaperSize = 'A4' | 'Letter' | 'Custom';

export interface WritingArea {
  leftMarginMm: number;
  rightMarginMm: number;
  firstLineYMm: number;
  lastLineYMm: number;
  indexLineXMm?: number; // X coordinate of vertical index rule (~29.13mm)
  marginLabelXMm?: number; // X coordinate for Q/Ans in left margin (default 8.0mm)
}

export interface TemplateConfig {
  id: string;
  name: string;
  imageUrl: string;
  paperSize: PaperSize;
  pageWidthMm: number;
  pageHeightMm: number;
  writingArea: WritingArea;
  linesMm: number[]; // Exact y-coordinate of each ruled line on the page in mm
  baselineOffsetMm: number; // Offset from rule line to text baseline (negative = text sits above line)
  rotationDeg: number;
  isDefault?: boolean;
}

export type BlockType = 'question' | 'answer' | 'heading' | 'normal';
export type TextAlignment = 'left' | 'center' | 'right';

export interface DocumentBlock {
  id: string;
  type: BlockType;
  text: string;
  prefix?: string; // e.g. "Q.1", "Ans.", "1."
  marginPrefix?: string; // Text placed in the left margin column (left of index line)
  indentMm: number;
  colorOverride?: string;
  sourceParagraphIndex?: number;
  pageBreakBefore?: boolean; // Forces block to start on a new page
  emptyLinesBefore?: number; // Blank ruled lines before this block
  alignment?: TextAlignment; // 'left' | 'center' | 'right'
  fontSizePt?: number; // Custom font size in pt (Word-style per-line/block formatting)
}

export interface LayoutLine {
  id: string;
  blockId: string;
  pageIndex: number; // 0-based
  lineIndexOnPage: number;
  text: string;
  marginPrefix?: string; // Text rendered in the left margin column (e.g. "Q.1", "Ans.")
  marginXMm?: number; // X coordinate for marginPrefix in mm (default 8.0mm)
  xMm: number;
  baselineYMm: number;
  color: string;
  fontFamily: string;
  fontSizePt: number;
  letterSpacing: number;
  isQuestion: boolean;
  alignment?: TextAlignment;
  isFirstLineOfBlock?: boolean;
  hasPageBreakBefore?: boolean;
}

export interface LayoutPage {
  pageIndex: number;
  lines: LayoutLine[];
}

export interface LayoutResult {
  pages: LayoutPage[];
  totalPageCount: number;
  totalLinesCount: number;
  overflowText?: string;
  warnings: string[];
}

export interface HandwritingSettings {
  fontFamily:
    | 'Bad Script'
    | 'Mynerve'
    | 'Covered By Your Grace'
    | 'Reenie Beanie'
    | 'Dawning of a New Day'
    | 'Shadows Into Light'
    | 'Homemade Apple'
    | 'Caveat'
    | 'Kalam'
    | 'Patrick Hand';
  fontSizePt: number;
  smartQaColors: boolean;
  questionColor: string;
  answerColor: string;
  normalColor: string;
  baselineOffsetMm: number;
  letterSpacing: number; // -1 to 3
  wordSpacing: number; // -2 to 5
  lineSpacingMultiplier: number; // 1 = use every line, 2 = skip a line
  naturalVariation: boolean; // subtle natural variation in baseline and letter spacing
  placePrefixInMargin: boolean; // true = place Q.1, Ans., etc. to the left of index line
  marginPrefixXMm?: number; // X position for Q/Ans margin label (default 19.5mm, close to index rule)
  rightMarginMm?: number; // Right writing boundary / line fill limit in mm (default 201.0mm)
}

export interface DocxImportSummary {
  fileName: string;
  fileSizeBytes: number;
  paragraphCount: number;
  wordCount: number;
  questionsDetected: number;
  answersDetected: number;
}
