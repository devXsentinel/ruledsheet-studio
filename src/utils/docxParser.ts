import mammoth from 'mammoth';
import { DocumentBlock, DocxImportSummary, BlockType } from '../types';

export interface ParseDocxResult {
  blocks: DocumentBlock[];
  summary: DocxImportSummary;
}

/**
 * Parses a .docx File object in the browser using mammoth,
 * extracting structured paragraphs and applying intelligent Q&A classification.
 */
export async function parseDocxFile(file: File): Promise<ParseDocxResult> {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new Error('Please select a valid Microsoft Word (.docx) document.');
  }

  const arrayBuffer = await file.arrayBuffer();

  try {
    // Extract HTML to preserve headings, lists, and paragraphs
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    if (!html || html.trim().length === 0) {
      throw new Error('The Word document appears to be empty or has no readable text.');
    }

    // Parse HTML DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = doc.body.children;

    const rawBlocks: { text: string; tag: string; isList: boolean }[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const tag = node.tagName.toLowerCase();

      if (tag === 'ul' || tag === 'ol') {
        const listItems = node.querySelectorAll('li');
        listItems.forEach((li, idx) => {
          const txt = li.textContent?.trim() || '';
          if (txt) {
            const bullet = tag === 'ol' ? `${idx + 1}. ` : '• ';
            rawBlocks.push({ text: bullet + txt, tag: 'li', isList: true });
          }
        });
      } else {
        const txt = node.textContent?.trim() || '';
        if (txt) {
          rawBlocks.push({ text: txt, tag, isList: false });
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

    const blocks = classifyBlocks(rawBlocks);

    const wordCount = blocks.reduce((acc, b) => acc + b.text.split(/\s+/).filter(Boolean).length, 0);
    const questionsDetected = blocks.filter(b => b.type === 'question' || b.type === 'heading').length;
    const answersDetected = blocks.filter(b => b.type === 'answer').length;

    const summary: DocxImportSummary = {
      fileName: file.name,
      fileSizeBytes: file.size,
      paragraphCount: blocks.length,
      wordCount,
      questionsDetected,
      answersDetected
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
 * Classifies raw paragraph blocks into Question, Answer, Heading, or Normal,
 * automatically separating margin tags (Q.1, Ans.) from body text.
 */
export function classifyBlocks(
  items: { text: string; tag: string; isList: boolean }[]
): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let inQuestionContext = false;

  for (let i = 0; i < items.length; i++) {
    const { text, tag, isList } = items[i];
    const id = `block_${i}_${Date.now()}`;
    const cleanText = text.trim();

    // Check if heading
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
 * Parses plain text pasted or edited by the user into structured blocks.
 */
export function parsePlainText(raw: string): DocumentBlock[] {
  const paragraphs = raw.split(/\r?\n\s*\r?\n|\r?\n/).map(p => p.trim()).filter(Boolean);
  const items = paragraphs.map(p => ({
    text: p,
    tag: p.startsWith('#') ? 'h2' : 'p',
    isList: /^[•\-\*]|\d+\.\s/.test(p)
  }));
  return classifyBlocks(items);
}

/**
 * Built-in realistic sample assignment text for instant testing
 */
export const SAMPLE_ASSIGNMENT_TEXT = `Q.1 Explain the difference between Microprocessor and Microcontroller with suitable examples.
Ans. A Microprocessor contains only the central processing unit (CPU) on a single integrated chip, requiring external memory (RAM, ROM) and I/O ports to function as a complete system (e.g., Intel Core i7, 8085). In contrast, a Microcontroller integrates a CPU, memory, timers, and I/O peripherals onto a single chip, making it ideal for dedicated embedded control systems (e.g., Arduino ATmega328, 8051).

Q.2 What are the primary functions of an Operating System? Discuss process scheduling.
Ans. An Operating System acts as an intermediary between computer hardware and the user. Its main functions include processor management, memory allocation, device driver management, file system organization, and system security.
Process scheduling determines which active process in memory receives CPU execution time, maximizing CPU utilization and system throughput using algorithms like Round Robin and Priority Scheduling.

Q.3 Describe the advantages of Cloud Computing in modern enterprise architecture.
Ans. Cloud Computing provides high scalability, on-demand resource provisioning, cost efficiency through pay-as-you-go pricing, and disaster recovery. It allows enterprises to deploy applications globally without maintaining physical server infrastructure.

Q.4 Write short notes on:
1. Cache Memory: A high-speed volatile storage placed close to the processor to bridge the CPU-DRAM speed gap.
2. Virtual Memory: An OS feature allowing execution of programs exceeding physical RAM using disk paging.`;
