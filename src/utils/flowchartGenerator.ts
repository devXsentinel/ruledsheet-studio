/**
 * Dedicated vector flowchart and diagram generator for ruled-sheet assignments.
 * Produces crisp, beautiful SVG diagrams with authentic ink styling, rounded corners,
 * decision diamonds, and arrowheads that match what is drawn in Microsoft Word or textbooks.
 */

export interface FlowchartDimensions {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
}

export interface FlowchartOptions {
  fontFamily?: string;
  inkColor?: string;
  fontSizePt?: number;
}

const INK_COLOR = '#000000'; // Base black assignment ink
const FONT_FAMILY = "'Bad Script', 'Caveat', 'Patrick Hand', cursive, sans-serif";

/**
 * Dynamically applies user-chosen handwriting font and writing ink color to any SVG diagram
 */
export function applySvgOptions(svg: string, options?: FlowchartOptions): string {
  if (!svg || !options) return svg;
  let result = svg;
  const ink = options.inkColor || '#000000';
  const family = options.fontFamily
    ? `'${options.fontFamily}', 'Bad Script', 'Caveat', 'Patrick Hand', cursive, sans-serif`
    : "'Bad Script', 'Caveat', 'Patrick Hand', cursive, sans-serif";

  // Replace common stroke/fill colors with user writing ink color
  result = result.replace(/#000000/gi, ink);
  result = result.replace(/#1e3a8a/gi, ink);
  result = result.replace(/#111827/gi, ink);
  result = result.replace(/#003399/gi, ink);
  result = result.replace(/#cc0000/gi, ink);
  result = result.replace(/#008800/gi, ink);
  result = result.replace(/stroke="blue"/gi, `stroke="${ink}"`);
  result = result.replace(/stroke="red"/gi, `stroke="${ink}"`);
  result = result.replace(/stroke="green"/gi, `stroke="${ink}"`);
  result = result.replace(/fill="blue"/gi, `fill="${ink}"`);
  result = result.replace(/fill="red"/gi, `fill="${ink}"`);
  result = result.replace(/fill="green"/gi, `fill="${ink}"`);

  // Ensure root svg has font-family
  if (result.includes('font-family:')) {
    result = result.replace(/font-family:\s*[^";]+;?/g, `font-family: ${family};`);
  } else {
    result = result.replace(/<svg\b([^>]*)>/, `<svg$1 style="font-family: ${family};">`);
  }

  const styleContent = `
    text, tspan {
      font-family: ${family} !important;
      fill: ${ink} !important;
    }
    line, rect, polygon, circle, path {
      stroke: ${ink};
    }
    marker path {
      fill: ${ink} !important;
      stroke: none !important;
    }
  `;

  if (result.includes('<style>')) {
    result = result.replace(/<style>[\s\S]*?<\/style>/i, `<style>${styleContent}</style>`);
  } else if (result.includes('<defs>')) {
    result = result.replace('<defs>', `<defs><style>${styleContent}</style>`);
  } else {
    result = result.replace(/<svg\b([^>]*)>/, `<svg$1><defs><style>${styleContent}</style></defs>`);
  }

  return result;
}

/**
 * Creates SVG arrow definitions and style block
 */
function getSvgHeader(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background: transparent; font-family: ${FONT_FAMILY};">
  <defs>
    <style>
      text, tspan {
        font-family: inherit;
      }
    </style>
    <marker id="flow-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${INK_COLOR}" />
    </marker>
    <filter id="ink-softness" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="0.2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>`;
}

/**
 * 1. N-Queens Problem using Backtracking Flowchart SVG
 */
export function generateNQueensFlowchartSvg(): string {
  const W = 740;
  const H = 820;

  return `${getSvgHeader(W, H)}
  <!-- 1. Start Node -->
  <rect x="285" y="18" width="170" height="48" rx="24" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="370" y="49" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Start</text>

  <!-- Arrow down to Row = 0 -->
  <line x1="370" y1="66" x2="370" y2="100" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 2. Row = 0 Node -->
  <rect x="285" y="100" width="170" height="48" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="370" y="132" font-size="22" fill="${INK_COLOR}" text-anchor="middle">Row = 0</text>

  <!-- Arrow down to Decision: Is Row == N? -->
  <line x1="370" y1="148" x2="370" y2="186" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- Loopback entry point indicator -->
  <circle cx="370" cy="168" r="4" fill="${INK_COLOR}" />

  <!-- 3. Decision Node: Is Row == N? -->
  <polygon points="370,186 515,230 370,274 225,230" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="370" y="238" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Is Row == N?</text>

  <!-- Branch: YES -> Print Solution -->
  <line x1="225" y1="230" x2="135" y2="230" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="135" y1="230" x2="135" y2="300" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="175" y="220" font-size="20" font-weight="700" fill="${INK_COLOR}">Yes</text>

  <rect x="35" y="302" width="200" height="54" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="135" y="336" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Print Solution</text>

  <!-- Branch: NO -> Col = 0 -->
  <line x1="515" y1="230" x2="570" y2="230" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="570" y1="230" x2="570" y2="300" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="525" y="220" font-size="20" font-weight="700" fill="${INK_COLOR}">No</text>

  <rect x="475" y="302" width="190" height="54" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="570" y="336" font-size="22" fill="${INK_COLOR}" text-anchor="middle">Col = 0</text>

  <!-- Arrow down to Decision: Is Col < N? -->
  <line x1="570" y1="356" x2="570" y2="390" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 4. Decision Node: Is Col < N? -->
  <polygon points="570,390 710,436 570,482 430,436" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="570" y="443" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Is Col &lt; N?</text>

  <!-- Col < N Branch YES -> Is Safe Pos? -->
  <line x1="570" y1="482" x2="570" y2="524" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="580" y="506" font-size="20" font-weight="700" fill="${INK_COLOR}">Yes</text>

  <!-- Col < N Branch NO -> Backtrack (Row = Row - 1) -->
  <line x1="430" y1="436" x2="335" y2="436" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="380" y="424" font-size="20" font-weight="700" fill="${INK_COLOR}">No</text>

  <rect x="135" y="408" width="200" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="235" y="443" font-size="20" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Backtrack (Row - 1)</text>

  <!-- Loop from Backtrack back to Is Row == N? -->
  <line x1="135" y1="436" x2="25" y2="436" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="25" y1="436" x2="25" y2="168" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="25" y1="168" x2="365" y2="168" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- 5. Decision Node: Is Safe Pos? -->
  <polygon points="570,524 710,570 570,616 430,570" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="570" y="578" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Is Safe Pos?</text>

  <!-- Safe YES -> Place Queen & Recurse Row + 1 -->
  <line x1="570" y1="616" x2="570" y2="658" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="580" y="640" font-size="20" font-weight="700" fill="${INK_COLOR}">Yes</text>

  <rect x="420" y="660" width="300" height="74" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="570" y="688" font-size="20" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Place Queen at (Row, Col)</text>
  <text x="570" y="715" font-size="19" fill="${INK_COLOR}" text-anchor="middle">Recurse: solve(Row + 1)</text>

  <!-- Recurse loops back to Is Row == N? -->
  <line x1="720" y1="697" x2="730" y2="697" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="730" y1="697" x2="730" y2="168" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="730" y1="168" x2="375" y2="168" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- Safe NO -> Col = Col + 1 -->
  <line x1="430" y1="570" x2="340" y2="570" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="340" y1="570" x2="340" y2="660" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="380" y="558" font-size="20" font-weight="700" fill="${INK_COLOR}">No</text>

  <rect x="250" y="660" width="180" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="340" y="695" font-size="21" fill="${INK_COLOR}" text-anchor="middle">Col = Col + 1</text>

  <!-- Loop from Col = Col + 1 back to Is Col < N? -->
  <line x1="340" y1="716" x2="340" y2="755" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="340" y1="755" x2="570" y2="755" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="570" y1="755" x2="570" y2="486" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
</svg>`;
}

/**
 * 2. Travelling Salesman Problem (TSP) Branch and Bound Flowchart SVG
 */
export function generateTSPFlowchartSvg(): string {
  const W = 760;
  const H = 840;

  return `${getSvgHeader(W, H)}
  <!-- 1. Start -->
  <rect x="295" y="16" width="170" height="48" rx="24" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="380" y="47" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Start</text>

  <line x1="380" y1="64" x2="380" y2="96" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 2. Reduce Initial Cost Matrix -->
  <rect x="170" y="96" width="420" height="74" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="380" y="126" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Reduce Initial Cost Matrix</text>
  <text x="380" y="154" font-size="19" fill="${INK_COLOR}" text-anchor="middle">&amp; Compute Root Lower Bound</text>

  <line x1="380" y1="170" x2="380" y2="200" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 3. Push Root Node to Priority Queue -->
  <rect x="180" y="200" width="400" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="380" y="235" font-size="21" fill="${INK_COLOR}" text-anchor="middle">Push Root Node to Priority Queue</text>

  <line x1="380" y1="256" x2="380" y2="282" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- Loopback entry point dot -->
  <circle cx="380" cy="270" r="4" fill="${INK_COLOR}" />

  <!-- 4. Decision: Is Priority Queue Empty? -->
  <polygon points="380,282 535,326 380,370 225,326" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="380" y="334" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Is Queue Empty?</text>

  <!-- Branch YES -> Return Best Tour -->
  <line x1="225" y1="326" x2="120" y2="326" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="120" y1="326" x2="120" y2="396" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="165" y="316" font-size="20" font-weight="700" fill="${INK_COLOR}">Yes</text>

  <rect x="15" y="396" width="210" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="120" y="431" font-size="21" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Return Best Tour</text>

  <!-- Branch NO -> Pop Node with Min Bound -->
  <line x1="535" y1="326" x2="590" y2="326" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="590" y1="326" x2="590" y2="396" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="545" y="316" font-size="20" font-weight="700" fill="${INK_COLOR}">No</text>

  <rect x="450" y="396" width="280" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="590" y="431" font-size="21" fill="${INK_COLOR}" text-anchor="middle">Pop Node with Min Bound</text>

  <line x1="590" y1="452" x2="590" y2="484" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 5. Decision: Is Bound >= Upper? -->
  <polygon points="590,484 745,528 590,572 435,528" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="590" y="536" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Is Bound ≥ Upper?</text>

  <!-- Prune YES -->
  <line x1="435" y1="528" x2="350" y2="528" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="385" y="516" font-size="20" font-weight="700" fill="${INK_COLOR}">Yes</text>

  <rect x="190" y="500" width="160" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="270" y="535" font-size="21" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Prune Node</text>

  <!-- Loop from Prune back to Queue Check -->
  <line x1="190" y1="528" x2="15" y2="528" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="15" y1="528" x2="15" y2="270" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="15" y1="270" x2="375" y2="270" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- Bound < Upper (NO) -> Visited All Cities? -->
  <line x1="590" y1="572" x2="590" y2="604" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="600" y="592" font-size="20" font-weight="700" fill="${INK_COLOR}">No</text>

  <!-- 6. Decision: Visited All Cities? -->
  <polygon points="590,604 745,648 590,692 435,648" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="590" y="656" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Visited All Cities?</text>

  <!-- Visited YES -> Update Min Tour -->
  <line x1="435" y1="648" x2="355" y2="648" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="355" y1="648" x2="355" y2="614" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="390" y="636" font-size="20" font-weight="700" fill="${INK_COLOR}">Yes</text>

  <rect x="100" y="614" width="255" height="74" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="227" y="642" font-size="21" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Update Min Tour</text>
  <text x="227" y="668" font-size="18" fill="${INK_COLOR}" text-anchor="middle">&amp; Set Upper Bound</text>

  <!-- Visited NO -> Generate Children & Push -->
  <line x1="745" y1="648" x2="752" y2="648" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="752" y1="648" x2="752" y2="750" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="752" y1="750" x2="740" y2="750" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="730" y="636" font-size="20" font-weight="700" fill="${INK_COLOR}">No</text>

  <rect x="420" y="720" width="320" height="76" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="580" y="748" font-size="21" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Generate Child Nodes</text>
  <text x="580" y="775" font-size="18" fill="${INK_COLOR}" text-anchor="middle">Reduce Bounds &amp; Push to PQ</text>
</svg>`;
}

/**
 * 3. Shortest Path Finding using A* Search Algorithm Flowchart SVG
 */
export function generateAStarFlowchartSvg(): string {
  const W = 740;
  const H = 820;

  return `${getSvgHeader(W, H)}
  <!-- 1. Start -->
  <rect x="285" y="18" width="170" height="48" rx="24" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="370" y="49" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Start</text>

  <line x1="370" y1="66" x2="370" y2="100" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 2. Push Start Node to Open List -->
  <rect x="180" y="100" width="380" height="66" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="370" y="128" font-size="21" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Push Start Node to Open List</text>
  <text x="370" y="152" font-size="18" fill="${INK_COLOR}" text-anchor="middle">g = 0, f = h(Start)</text>

  <line x1="370" y1="166" x2="370" y2="200" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 3. Decision: Is Open List Empty? -->
  <polygon points="370,200 520,244 370,288 220,244" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="370" y="252" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Is Open List Empty?</text>

  <!-- Empty YES -> Return No Path -->
  <line x1="220" y1="244" x2="125" y2="244" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="125" y1="244" x2="125" y2="310" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="165" y="234" font-size="20" font-weight="700" fill="${INK_COLOR}">Yes</text>

  <rect x="20" y="312" width="210" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="125" y="347" font-size="20" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Return: No Path Exists</text>

  <!-- Empty NO -> Pop Node n with Min f(n) -->
  <line x1="520" y1="244" x2="580" y2="244" stroke="${INK_COLOR}" stroke-width="2.2" />
  <line x1="580" y1="244" x2="580" y2="310" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="535" y="234" font-size="20" font-weight="700" fill="${INK_COLOR}">No</text>

  <rect x="445" y="312" width="270" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="580" y="347" font-size="20" fill="${INK_COLOR}" text-anchor="middle">Pop Node n with Min f(n)</text>

  <line x1="580" y1="368" x2="580" y2="402" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 4. Decision: Is n == Goal? -->
  <polygon points="580,402 720,446 580,490 440,446" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="580" y="454" font-size="22" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Is n == Goal?</text>

  <!-- Goal YES -> Reconstruct Path -->
  <line x1="440" y1="446" x2="330" y2="446" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="380" y="436" font-size="20" font-weight="700" fill="${INK_COLOR}">Yes</text>

  <rect x="95" y="416" width="235" height="66" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="212" y="443" font-size="19" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Reconstruct Optimal Path</text>
  <text x="212" y="468" font-size="17" fill="${INK_COLOR}" text-anchor="middle">&amp; Return Shortest Route</text>

  <!-- Goal NO -> Move n to Closed List & Expand -->
  <line x1="580" y1="490" x2="580" y2="534" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />
  <text x="590" y="516" font-size="20" font-weight="700" fill="${INK_COLOR}">No</text>

  <rect x="445" y="536" width="270" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="580" y="571" font-size="20" fill="${INK_COLOR}" text-anchor="middle">Move n to Closed List</text>

  <line x1="580" y1="592" x2="580" y2="626" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 5. For each neighbor m of n -->
  <rect x="390" y="628" width="340" height="68" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="560" y="656" font-size="19" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">For each neighbor m of Node n:</text>
  <text x="560" y="682" font-size="17" fill="${INK_COLOR}" text-anchor="middle">Compute g(m) &amp; f(m) = g(m) + h(m)</text>

  <line x1="560" y1="696" x2="560" y2="730" stroke="${INK_COLOR}" stroke-width="2.2" marker-end="url(#flow-arrow)" />

  <!-- 6. Update Parent & Push to Open List -->
  <rect x="390" y="732" width="340" height="56" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2.2" />
  <text x="560" y="767" font-size="20" fill="${INK_COLOR}" text-anchor="middle">Update Parent &amp; Push to Open List</text>
</svg>`;
}

/**
 * 4. Query Optimization Trees SVG
 */
export function generateQueryTreeSvg(): string {
  const W = 680;
  const H = 450;

  return `${getSvgHeader(W, H)}
  <!-- Non-Optimized Subgraph -->
  <rect x="20" y="15" width="310" height="420" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="1.5" stroke-dasharray="4 2" />
  <text x="175" y="42" font-size="18" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">Non-Optimized Canonical Tree</text>

  <rect x="70" y="65" width="210" height="38" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="175" y="90" font-size="17" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">&#x03c0; (Ename, Dname)</text>

  <line x1="175" y1="103" x2="175" y2="135" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="25" y="137" width="300" height="42" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="175" y="163" font-size="15" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">&#x03c3; (Dno = Dnumber &#x2227; Salary &gt; 50000)</text>

  <line x1="175" y1="179" x2="175" y2="215" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <circle cx="175" cy="235" r="22" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="175" y="242" font-size="22" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">&#x00d7;</text>
  <text x="175" y="272" font-size="14" fill="${INK_COLOR}" text-anchor="middle">Full Cartesian Product</text>

  <line x1="160" y1="250" x2="105" y2="310" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />
  <line x1="190" y1="250" x2="245" y2="310" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="40" y="312" width="130" height="38" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="105" y="336" font-size="15" fill="${INK_COLOR}" text-anchor="middle">Table: Employee</text>

  <rect x="180" y="312" width="130" height="38" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="245" y="336" font-size="15" fill="${INK_COLOR}" text-anchor="middle">Table: Dept</text>

  <!-- Optimized Subgraph -->
  <rect x="350" y="15" width="310" height="420" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="1.5" stroke-dasharray="4 2" />
  <text x="505" y="42" font-size="18" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">Optimized Heuristic Tree</text>

  <rect x="400" y="65" width="210" height="38" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="505" y="90" font-size="17" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">&#x03c0; (Ename, Dname)</text>

  <line x1="505" y1="103" x2="505" y2="145" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <!-- Equijoin Node -->
  <rect x="400" y="147" width="210" height="42" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="505" y="173" font-size="16" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">&#x22c8; (E.Dno = D.Dnumber)</text>

  <line x1="475" y1="189" x2="435" y2="235" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />
  <line x1="535" y1="189" x2="575" y2="310" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <!-- Selection Pushed Down -->
  <rect x="350" y="237" width="170" height="38" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="435" y="261" font-size="15" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">&#x03c3; (Salary &gt; 50000)</text>

  <line x1="435" y1="275" x2="435" y2="310" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="365" y="312" width="135" height="38" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="432" y="336" font-size="15" fill="${INK_COLOR}" text-anchor="middle">Table: Employee</text>

  <rect x="510" y="312" width="130" height="38" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="575" y="336" font-size="15" fill="${INK_COLOR}" text-anchor="middle">Table: Dept</text>
</svg>`;
}

/**
 * 5. Industrial Computer Vision Architecture & Flowchart SVG
 */
export function generateComputerVisionFlowchartSvg(): string {
  const W = 680;
  const H = 640;

  return `${getSvgHeader(W, H)}
  <!-- Stage 1 -->
  <rect x="140" y="20" width="400" height="50" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="42" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">STAGE 1: OPTICAL IMAGE ACQUISITION</text>
  <text x="340" y="58" font-size="12" fill="${INK_COLOR}" text-anchor="middle">Conveyor Sensor ➔ LED Illumination ➔ Industrial Camera</text>

  <line x1="340" y1="70" x2="340" y2="108" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="350" y="93" font-size="11" fill="${INK_COLOR}">Raw Image I(x, y)</text>

  <!-- Stage 2 -->
  <rect x="140" y="110" width="400" height="50" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="132" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">STAGE 2: CLASSICAL IMAGE PROCESSING</text>
  <text x="340" y="148" font-size="12" fill="${INK_COLOR}" text-anchor="middle">Grayscale ➔ Gaussian Denoising ➔ Sobel Gradient Edge Map</text>

  <line x1="340" y1="160" x2="340" y2="198" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="350" y="183" font-size="11" fill="${INK_COLOR}">Normalized Tensor H × W × 1</text>

  <!-- Stage 3 -->
  <rect x="140" y="200" width="400" height="50" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="222" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">STAGE 3: DEEP LEARNING INFERENCE (CNN)</text>
  <text x="340" y="238" font-size="12" fill="${INK_COLOR}" text-anchor="middle">Conv2D (3×3) ➔ ReLU ➔ MaxPool2D ➔ Dense + Sigmoid</text>

  <line x1="340" y1="250" x2="340" y2="295" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="350" y="278" font-size="11" fill="${INK_COLOR}">Defect Probability P(Defect)</text>

  <!-- Decision -->
  <polygon points="340,298 470,345 340,392 210,345" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="342" font-size="15" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">Is P(Defect) ≥ 0.50?</text>

  <!-- Branch YES (Defective) -->
  <line x1="210" y1="345" x2="140" y2="345" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="140" y1="345" x2="140" y2="440" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="175" y="337" font-size="14" font-weight="700" fill="${INK_COLOR}">Yes (Defect)</text>

  <rect x="25" y="442" width="230" height="70" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="140" y="468" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">VERDICT: REJECT / SCRAP</text>
  <text x="140" y="488" font-size="12" fill="${INK_COLOR}" text-anchor="middle">• Trigger Pneumatic Diverter</text>
  <text x="140" y="504" font-size="12" fill="${INK_COLOR}" text-anchor="middle">• Log Defect &amp; Audit Trail</text>

  <!-- Branch NO (Pass) -->
  <line x1="470" y1="345" x2="540" y2="345" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="540" y1="345" x2="540" y2="440" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="495" y="337" font-size="14" font-weight="700" fill="${INK_COLOR}">No (Pass)</text>

  <rect x="430" y="442" width="220" height="70" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="540" y="468" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">VERDICT: PASS / GOOD</text>
  <text x="540" y="488" font-size="12" fill="${INK_COLOR}" text-anchor="middle">• Continue to Packaging Line</text>
  <text x="540" y="504" font-size="12" fill="${INK_COLOR}" text-anchor="middle">• Increment Real-Time Yield KPI</text>
</svg>`;
}

/**
 * 6. Object-Relational Database (ORDBMS) Type Hierarchy & Table Inheritance SVG
 */
export function generateOrdbmsArchitectureSvg(): string {
  const W = 680;
  const H = 420;

  return `${getSvgHeader(W, H)}
  <!-- 1. Composite Type Node -->
  <rect x="30" y="20" width="620" height="65" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="45" font-size="17" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">USER-DEFINED COMPOSITE TYPE</text>
  <text x="340" y="69" font-size="15" fill="${INK_COLOR}" text-anchor="middle">Address_Type : (street VARCHAR, city VARCHAR, zipcode VARCHAR)</text>

  <!-- Arrow down to Parent Table -->
  <line x1="340" y1="85" x2="340" y2="125" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- 2. Parent Table: Person -->
  <rect x="30" y="127" width="620" height="115" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="152" font-size="18" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">PARENT TABLE: Person</text>
  <line x1="40" y1="160" x2="640" y2="160" stroke="${INK_COLOR}" stroke-width="1" stroke-dasharray="2 2" />
  <text x="50" y="187" font-size="15" fill="${INK_COLOR}">• id : INT (Primary Key)</text>
  <text x="50" y="213" font-size="15" fill="${INK_COLOR}">• name : VARCHAR</text>
  <text x="300" y="187" font-size="15" fill="${INK_COLOR}">• address : Address_Type (Composite)</text>
  <text x="300" y="211" font-size="15" fill="${INK_COLOR}">• phone_numbers : TEXT[] (Nested Array)</text>
  <text x="315" y="228" font-size="13" font-style="italic" fill="${INK_COLOR}">(Multivalued Relation)</text>

  <!-- Arrow down to Child Table with Inheritance Label -->
  <line x1="340" y1="242" x2="340" y2="298" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="340" y="274" font-size="15" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">(INHERITS / Polymorphic Relation)</text>

  <!-- 3. Child Table: Employee -->
  <rect x="30" y="300" width="620" height="98" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="325" font-size="18" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">CHILD TABLE: Employee</text>
  <line x1="40" y1="333" x2="640" y2="333" stroke="${INK_COLOR}" stroke-width="1" stroke-dasharray="2 2" />
  <text x="50" y="358" font-size="14.5" fill="${INK_COLOR}">• [Inherited from Person: id, name, address, phone_numbers]</text>
  <text x="50" y="384" font-size="15" fill="${INK_COLOR}">• emp_id : INT (Primary Key)</text>
  <text x="300" y="384" font-size="15" fill="${INK_COLOR}">• salary : NUMERIC</text>
</svg>`;
}

/**
 * 7. Polyglot Persistence & Distributed Database Architecture SVG
 */
export function generatePolyglotArchitectureSvg(): string {
  const W = 680;
  const H = 380;

  return `${getSvgHeader(W, H)}
  <!-- 1. Client & Enterprise Applications -->
  <rect x="60" y="20" width="560" height="42" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="46" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">CLIENT &amp; ENTERPRISE APPLICATIONS</text>

  <!-- 4 Downward Arrows -->
  <line x1="120" y1="62" x2="120" y2="105" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <line x1="265" y1="62" x2="265" y2="105" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <line x1="415" y1="62" x2="415" y2="105" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <line x1="560" y1="62" x2="560" y2="105" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- 2. Specialized Database Engines -->
  <!-- In-Memory DB -->
  <rect x="50" y="108" width="135" height="52" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="117" y="130" font-size="13" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">In-Memory DB</text>
  <text x="117" y="146" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(RAM Cache)</text>

  <!-- Graph DB -->
  <rect x="200" y="108" width="135" height="52" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="267" y="130" font-size="13" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Graph DB</text>
  <text x="267" y="146" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Nodes / Edges)</text>

  <!-- Blockchain DB -->
  <rect x="350" y="108" width="135" height="52" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="417" y="130" font-size="13" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Blockchain DB</text>
  <text x="417" y="146" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Merkle / Ledger)</text>

  <!-- IoT/Edge DB -->
  <rect x="500" y="108" width="135" height="52" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="567" y="130" font-size="13" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">IoT / Edge DB</text>
  <text x="567" y="146" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Time-Series)</text>

  <!-- Bus line connecting all 4 down to Cloud Storage -->
  <line x1="117" y1="160" x2="117" y2="195" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="267" y1="160" x2="267" y2="195" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="417" y1="160" x2="417" y2="195" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="567" y1="160" x2="567" y2="195" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="117" y1="195" x2="567" y2="195" stroke="${INK_COLOR}" stroke-width="2" />
  <line x1="340" y1="195" x2="340" y2="230" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- 3. Cloud Distributed Storage Layer -->
  <rect x="40" y="232" width="600" height="120" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="258" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">CLOUD DATABASE LAYER (DISTRIBUTED STORAGE)</text>

  <!-- Sub-box: AI Query Optimizer -->
  <rect x="70" y="272" width="540" height="60" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="340" y="295" font-size="13" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">AI-Assisted Query Optimizer Engine</text>
  <text x="340" y="315" font-size="12" fill="${INK_COLOR}" text-anchor="middle">[Learned Cardinality Estimator] ➔ [RL Join Order Selector]</text>
</svg>`;
}

/**
 * 8. Edge-Cloud Industrial IoT (IIoT) 3-Tier Architecture SVG
 */
export function generateIiotArchitectureSvg(): string {
  const W = 680;
  const H = 640;

  return `${getSvgHeader(W, H)}
  <!-- TIER 1 -->
  <rect x="30" y="15" width="620" height="175" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="38" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">TIER 1: OT / FIELD DEVICE LAYER</text>

  <rect x="55" y="52" width="165" height="40" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="137" y="77" font-size="13" fill="${INK_COLOR}" text-anchor="middle">Temperature Sensor</text>

  <rect x="255" y="52" width="165" height="40" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="337" y="77" font-size="13" fill="${INK_COLOR}" text-anchor="middle">Vibration Sensor</text>

  <rect x="455" y="52" width="165" height="40" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="537" y="77" font-size="13" fill="${INK_COLOR}" text-anchor="middle">Spindle PLC</text>

  <line x1="137" y1="92" x2="137" y2="115" stroke="${INK_COLOR}" stroke-width="1.8" />
  <line x1="337" y1="92" x2="337" y2="115" stroke="${INK_COLOR}" stroke-width="1.8" />
  <line x1="537" y1="92" x2="537" y2="115" stroke="${INK_COLOR}" stroke-width="1.8" />
  <line x1="137" y1="115" x2="537" y2="115" stroke="${INK_COLOR}" stroke-width="1.8" />
  <line x1="340" y1="115" x2="340" y2="135" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="215" y="137" width="250" height="42" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="340" y="157" font-size="13" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">OPC-UA Server</text>
  <text x="340" y="171" font-size="11" fill="${INK_COLOR}" text-anchor="middle">Address Space (ns=2)</text>

  <!-- Connect Tier 1 to Tier 2 -->
  <line x1="340" y1="190" x2="340" y2="230" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="348" y="214" font-size="11" font-weight="600" fill="${INK_COLOR}">OPC-UA Poll / Subscription</text>

  <!-- TIER 2 -->
  <rect x="30" y="232" width="620" height="175" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="255" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">TIER 2: EDGE GATEWAY LAYER</text>

  <rect x="50" y="270" width="160" height="48" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="130" y="291" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">OPC-UA Client</text>
  <text x="130" y="307" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Protocol Ingestion)</text>

  <line x1="210" y1="294" x2="245" y2="294" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="247" y="270" width="180" height="48" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="337" y="291" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Edge Analytics Engine</text>
  <text x="337" y="307" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Rolling Avg &amp; Rules)</text>

  <line x1="427" y1="294" x2="465" y2="294" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="467" y="270" width="160" height="48" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="547" y="291" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Local Store &amp; Forward</text>
  <text x="547" y="307" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Buffer DB)</text>

  <line x1="337" y1="318" x2="337" y2="348" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="215" y="350" width="250" height="42" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="340" y="370" font-size="13" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">MQTT Publisher Client</text>
  <text x="340" y="384" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(JSON Payload + QoS 1)</text>

  <!-- Connect Tier 2 to Tier 3 -->
  <line x1="340" y1="407" x2="340" y2="445" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="348" y="428" font-size="11" font-weight="600" fill="${INK_COLOR}">TCP/IP (MQTT Publish)</text>

  <!-- TIER 3 -->
  <rect x="30" y="447" width="620" height="175" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="470" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">TIER 3: CLOUD / ENTERPRISE LAYER</text>

  <rect x="215" y="482" width="250" height="42" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="340" y="502" font-size="13" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Cloud MQTT Broker</text>
  <text x="340" y="516" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Topic Routing &amp; PUBACK)</text>

  <line x1="340" y1="524" x2="340" y2="550" stroke="${INK_COLOR}" stroke-width="1.8" />
  <line x1="180" y1="550" x2="500" y2="550" stroke="${INK_COLOR}" stroke-width="1.8" />
  <line x1="180" y1="550" x2="180" y2="568" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />
  <line x1="500" y1="550" x2="500" y2="568" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="70" y="570" width="220" height="42" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="180" y="590" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Time-Series Database</text>
  <text x="180" y="604" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Telemetry Storage)</text>

  <rect x="390" y="570" width="220" height="42" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="500" y="590" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">SCADA / Alerting Dashboard</text>
  <text x="500" y="604" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Real-Time KPI &amp; Alerts)</text>
</svg>`;
}

/**
 * 9. Smart Supply Chain & Logistics Automation using RFID 3-Tier Architecture SVG
 */
export function generateRfidWarehouseArchitectureSvg(): string {
  const W = 680;
  const H = 460;

  return `${getSvgHeader(W, H)}
  <!-- TIER 1 -->
  <rect x="30" y="15" width="620" height="115" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="38" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">TIER 1: PHYSICAL WAREHOUSE &amp; RFID LAYER</text>

  <rect x="50" y="55" width="160" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="130" y="78" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Passive EPC Gen2</text>
  <text x="130" y="96" font-size="11" fill="${INK_COLOR}" text-anchor="middle">Tags (860-960 MHz)</text>

  <line x1="210" y1="82" x2="245" y2="82" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="248" y="55" width="180" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="338" y="78" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">UHF RFID Portal Reader</text>
  <text x="338" y="96" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Bulk Read Capability)</text>

  <line x1="428" y1="82" x2="465" y2="82" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="468" y="55" width="160" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="548" y="78" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Dock Sensor</text>
  <text x="548" y="96" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Direction: In / Out)</text>

  <!-- Connect Tier 1 to Tier 2 -->
  <line x1="338" y1="130" x2="338" y2="170" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="346" y="154" font-size="11" font-weight="600" fill="${INK_COLOR}">Raw EPC Burst Stream</text>

  <!-- TIER 2 -->
  <rect x="30" y="172" width="620" height="115" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="195" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">TIER 2: RFID EDGE MIDDLEWARE LAYER</text>

  <rect x="50" y="212" width="165" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="132" y="235" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Temporal Deduplication</text>
  <text x="132" y="253" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Filter Multipath Echoes)</text>

  <line x1="215" y1="240" x2="245" y2="240" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="248" y="212" width="180" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="338" y="235" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">EPC-to-SKU Resolver</text>
  <text x="338" y="253" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Hex ➔ Product SKU)</text>

  <line x1="428" y1="240" x2="465" y2="240" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="468" y="212" width="160" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="548" y="235" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Real-Time Stock Ledger</text>
  <text x="548" y="253" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Instant Level Sync)</text>

  <!-- Connect Tier 2 to Tier 3 -->
  <line x1="548" y1="287" x2="548" y2="325" stroke="${INK_COLOR}" stroke-width="2" marker-end="url(#flow-arrow)" />
  <text x="440" y="310" font-size="11" font-weight="600" fill="${INK_COLOR}">Live Stock Updates</text>

  <!-- TIER 3 -->
  <rect x="30" y="327" width="620" height="115" rx="6" fill="none" stroke="${INK_COLOR}" stroke-width="2" />
  <text x="340" y="350" font-size="14" font-weight="700" fill="${INK_COLOR}" text-anchor="middle">TIER 3: AI DEMAND FORECASTING &amp; ERP AUTOMATION</text>

  <rect x="50" y="367" width="165" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="132" y="390" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Historical Sales Store</text>
  <text x="132" y="408" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Demand Time-Series)</text>

  <line x1="215" y1="395" x2="245" y2="395" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="248" y="367" width="180" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="338" y="390" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">AI Demand Forecaster</text>
  <text x="338" y="408" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Trend + Seasonality)</text>

  <line x1="428" y1="395" x2="465" y2="395" stroke="${INK_COLOR}" stroke-width="1.8" marker-end="url(#flow-arrow)" />

  <rect x="468" y="367" width="160" height="55" rx="4" fill="none" stroke="${INK_COLOR}" stroke-width="1.8" />
  <text x="548" y="390" font-size="12" font-weight="600" fill="${INK_COLOR}" text-anchor="middle">Dynamic ROP &amp; PO</text>
  <text x="548" y="408" font-size="11" fill="${INK_COLOR}" text-anchor="middle">(Autonomous Restock)</text>
</svg>`;
}

/**
 * Maps known flowchart headings or keywords to a dedicated vector SVG diagram
 */
export function getPrebuiltFlowchartInfo(
  titleOrText: string,
  options?: FlowchartOptions
): DiagramBlockInfo | null {
  if (!titleOrText) return null;
  const lower = titleOrText.toLowerCase().replace(/[_\s-]+/g, ' ');

  let svg: string | null = null;
  let widthMm = 140;
  let heightMm = 120;
  let caption = 'Flowchart Diagram';
  let diagramType = 'flowchart';

  if (lower.includes('queen') || lower.includes('backtrack') || lower.includes('n queen')) {
    svg = generateNQueensFlowchartSvg();
    widthMm = 152;
    heightMm = 142;
    caption = 'Flowchart: N-Queens Backtracking';
    diagramType = 'n_queens';
  } else if (lower.includes('salesman') || lower.includes('tsp') || lower.includes('branch and bound') || lower.includes('lcbb') || (lower.includes('cost matrix') && lower.includes('bound')) || lower.includes('visited all cities') || (lower.includes('priority queue') && lower.includes('prune'))) {
    svg = generateTSPFlowchartSvg();
    widthMm = 152;
    heightMm = 142;
    caption = 'Flowchart: TSP Branch & Bound';
    diagramType = 'tsp';
  } else if (lower.includes('a*') || lower.includes('astar') || lower.includes('shortest path') || lower.includes('heuristic search') || (lower.includes('open list') && lower.includes('closed list')) || (lower.includes('open list') && lower.includes('f(n)')) || (lower.includes('open list') && lower.includes('goal'))) {
    svg = generateAStarFlowchartSvg();
    widthMm = 152;
    heightMm = 142;
    caption = 'Flowchart: A* Search Algorithm';
    diagramType = 'astar';
  } else if (lower.includes('query tree') || lower.includes('query') || lower.includes('relational algebra') || lower.includes('canonical tree') || lower.includes('heuristic tree') || lower.includes('query optimization')) {
    svg = generateQueryTreeSvg();
    widthMm = 152;
    heightMm = 100;
    caption = 'Query Tree Architecture';
    diagramType = 'query_tree';
  } else if (lower.includes('ordbms') || lower.includes('composite type') || lower.includes('address type') || lower.includes('type hierarchy') || (lower.includes('person') && lower.includes('employee'))) {
    svg = generateOrdbmsArchitectureSvg();
    widthMm = 152;
    heightMm = 95;
    caption = 'ORDBMS Type Hierarchy Diagram';
    diagramType = 'ordbms';
  } else if (lower.includes('polyglot') || lower.includes('nosql') || lower.includes('in memory db') || lower.includes('graph db') || lower.includes('blockchain')) {
    svg = generatePolyglotArchitectureSvg();
    widthMm = 152;
    heightMm = 85;
    caption = 'Polyglot Persistence Architecture';
    diagramType = 'polyglot';
  } else if (lower.includes('iiot') || lower.includes('opc ua') || lower.includes('field device') || lower.includes('edge gateway') || lower.includes('spindle')) {
    svg = generateIiotArchitectureSvg();
    widthMm = 152;
    heightMm = 125;
    caption = 'Edge-Cloud IIoT Architecture';
    diagramType = 'iiot';
  } else if (lower.includes('defect') || lower.includes('optical inspection') || lower.includes('computer vision') || lower.includes('vision')) {
    svg = generateComputerVisionFlowchartSvg();
    widthMm = 152;
    heightMm = 125;
    caption = 'Industrial Computer Vision Flowchart';
    diagramType = 'computer_vision';
  } else if (lower.includes('rfid') || lower.includes('warehouse') || lower.includes('epc gen2')) {
    svg = generateRfidWarehouseArchitectureSvg();
    widthMm = 152;
    heightMm = 100;
    caption = 'Smart Warehouse & RFID Architecture';
    diagramType = 'rfid_warehouse';
  }

  if (!svg) return null;

  // Always apply chosen handwriting font and strictly maintain pure black assignment ink for all flowcharts
  const finalOptions: FlowchartOptions = {
    fontFamily: options?.fontFamily || 'Bad Script',
    inkColor: '#000000'
  };
  svg = applySvgOptions(svg, finalOptions);

  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return {
    svg,
    svgDataUrl,
    widthMm,
    heightMm,
    caption,
    diagramType
  };
}

export function getPrebuiltFlowchartSvg(titleOrText: string, options?: FlowchartOptions): string | null {
  const info = getPrebuiltFlowchartInfo(titleOrText, options);
  return info ? info.svg : null;
}

export interface AsciiDiagramOptions {
  inkColor?: string;
  fontFamily?: string;
  bgColor?: string;
  borderColor?: string;
  caption?: string;
}

export interface DiagramBlockInfo {
  svg: string;
  svgDataUrl: string;
  widthMm: number;
  heightMm: number;
  caption: string;
  diagramType?: string;
}

export interface MatrixParsedData {
  prefix: string; // e.g. "M =" or "I ="
  rows: string[][]; // 2D array of values
  footer?: string; // e.g. "(Diagonal scratch pixels: 40, 42, 38, 41)"
}

/**
 * Detects and parses a multi-line numerical matrix from text lines
 */
export function parseMatrixLines(lines: string[]): MatrixParsedData | null {
  if (!lines || lines.length === 0) return null;

  // Flatten lines if any item contains embedded newlines
  const flatLines: string[] = [];
  for (const l of lines) {
    if (!l) continue;
    const parts = l.split(/\r?\n/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed) flatLines.push(trimmed);
    }
  }

  if (flatLines.length === 0) return null;

  // Reject relational algebra, tree diagrams, or database architectures mistakenly treated as matrices
  const containsRelationalOrNonMatrixKeywords = flatLines.some(l =>
    /[πσ⋈×∧∨]/.test(l) ||
    /\b(select|from|where|table|employee|department|salary|person|composite|address|phone|inherits|relation|stage|optical|camera|opc|mqtt|spindle|vibration|temperature|cloud|cache|disk)\b/i.test(l)
  );
  if (containsRelationalOrNonMatrixKeywords) return null;

  let prefix = '';
  let footer = '';
  const rows: string[][] = [];

  for (const line of flatLines) {
    if (line.startsWith('(') && line.endsWith(')')) {
      footer = line;
      continue;
    }

    // Case 1: Line contains multiple [ ... ] bracketed groups (e.g. all 4 rows in single line or Word paragraph)
    const bracketMatches = Array.from(line.matchAll(/(?:([A-Za-z0-9_'\s]+)\s*=\s*)?\[([^\]]+)\]/g));
    if (bracketMatches.length >= 2) {
      for (const bm of bracketMatches) {
        if (bm[1] && !prefix) {
          prefix = `${bm[1].trim()} =`;
        }
        const inner = bm[2].trim();
        const cells = inner.split(/[\s,;|]+/).map(c => c.replace(/^[\[\(\{\|]+|[\]\)\}\|]+$/g, '').trim()).filter(Boolean);
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
      continue;
    }

    // Case 2: Line is a single bracketed row [ ... ] with optional prefix
    const singleMatch = line.match(/^\s*(?:([A-Za-z0-9_'\s]+)\s*=\s*)?[\[\(⟦\|](.*)[\]\)⟧\|]\s*$/);
    if (singleMatch) {
      if (singleMatch[1] && !prefix) {
        prefix = `${singleMatch[1].trim()} =`;
      }
      const inner = singleMatch[2].trim();
      const cells = inner.split(/[\s,;|]+/).map(c => c.replace(/^[\[\(\{\|]+|[\]\)\}\|]+$/g, '').trim()).filter(Boolean);
      if (cells.length > 0) {
        rows.push(cells);
      }
      continue;
    }

    // Case 3: Line has numbers without brackets
    const numCells = line.split(/[\s,;|]+/).map(c => c.replace(/^[\[\(\{\|]+|[\]\)\}\|]+$/g, '').trim()).filter(Boolean);
    if (numCells.length >= 2 && numCells.every(c => /^[\d\.\-\+±*/%∞inf]+$/i.test(c))) {
      rows.push(numCells);
    }
  }

  if (rows.length < 2) return null;

  // Validate that the cells are predominantly numeric/math matrix values, not random text
  const totalCells = rows.reduce((acc, r) => acc + r.length, 0);
  const numericCells = rows.reduce((acc, r) => acc + r.filter(c => /^[\d\.\-\+±*/%∞inf\s]+$/i.test(c) || /^[a-zA-Z]\d*$/.test(c)).length, 0);
  if (totalCells === 0 || (numericCells / totalCells) < 0.6) {
    return null;
  }

  return { prefix, rows, footer };
}

/**
 * Generates an authentic handwritten vector matrix matching the chosen handwriting font and ink style.
 * Renders an authentic continuous mathematical bracket spanning all rows on the left and right.
 */
export function generateMatrixSvg(
  parsed: MatrixParsedData,
  options: FlowchartOptions = {}
): DiagramBlockInfo {
  const { prefix = '', rows, footer = '' } = parsed;
  const fontFamily = options.fontFamily || 'Bad Script';
  const inkColor = options.inkColor || '#000000';
  const fontSize = options.fontSizePt ? Math.max(16, Math.round(options.fontSizePt * 1.15)) : 17;

  const numRows = rows.length;
  const numCols = Math.max(...rows.map(r => r.length));

  // Determine width of each column with comfortable handwriting spacing
  const colWidths: number[] = [];
  for (let c = 0; c < numCols; c++) {
    let maxLen = 0;
    for (let r = 0; r < numRows; r++) {
      const len = (rows[r][c] || '').length;
      if (len > maxLen) maxLen = len;
    }
    const w = Math.max(44, maxLen * 12 + 28);
    colWidths.push(w);
  }

  const matrixContentWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowHeight = 28;
  const numTotalRows = numRows + (footer ? 1 : 0);
  const matrixHeight = numRows * rowHeight;
  const svgHeight = numTotalRows * rowHeight;

  const paddingX = 16;
  const prefixWidth = prefix ? Math.max(40, prefix.length * 11 + 10) : 0;
  const bracketColWidth = 14;

  const bracketLeftX = paddingX + prefixWidth + 4;
  const matrixLeft = bracketLeftX + bracketColWidth;
  const bracketRightX = matrixLeft + matrixContentWidth + 6;

  const svgWidth = Math.ceil(bracketRightX + bracketColWidth + paddingX);

  // Center coordinates of columns
  const colCenters: number[] = [];
  let currX = matrixLeft;
  for (let c = 0; c < numCols; c++) {
    colCenters.push(currX + colWidths[c] / 2);
    currX += colWidths[c];
  }

  let textSvg = '';

  // Prefix e.g. "M =" or "I ="
  if (prefix) {
    const prefixY = (matrixHeight / 2) + 5;
    textSvg += `  <text x="${paddingX + prefixWidth / 2}" y="${prefixY}" font-family="'${fontFamily}', cursive, sans-serif" font-size="${fontSize + 2}" font-weight="600" fill="${inkColor}" text-anchor="middle">${prefix}</text>\n`;
  }

  // Draw continuous mathematical matrix brackets spanning all rows with authentic smooth rounded corners
  const bracketTopY = 3;
  const bracketBottomY = matrixHeight - 3;
  const bracketTick = 10;
  const cornerR = 7;
  const leftBracketD = `M ${bracketLeftX + bracketTick} ${bracketTopY} Q ${bracketLeftX} ${bracketTopY} ${bracketLeftX} ${bracketTopY + cornerR} V ${bracketBottomY - cornerR} Q ${bracketLeftX} ${bracketBottomY} ${bracketLeftX + bracketTick} ${bracketBottomY}`;
  const rightBracketD = `M ${bracketRightX - bracketTick} ${bracketTopY} Q ${bracketRightX} ${bracketTopY} ${bracketRightX} ${bracketTopY + cornerR} V ${bracketBottomY - cornerR} Q ${bracketRightX} ${bracketBottomY} ${bracketRightX - bracketTick} ${bracketBottomY}`;

  textSvg += `  <path d="${leftBracketD}" fill="none" stroke="${inkColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />\n`;
  textSvg += `  <path d="${rightBracketD}" fill="none" stroke="${inkColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />\n`;

  // Matrix cell values resting on row baselines
  for (let r = 0; r < numRows; r++) {
    const cellY = (r + 0.78) * rowHeight;
    for (let c = 0; c < (rows[r] ? rows[r].length : 0); c++) {
      const val = rows[r][c] || '';
      const cellX = colCenters[c];
      textSvg += `  <text x="${cellX}" y="${cellY}" font-family="'${fontFamily}', cursive, sans-serif" font-size="${fontSize}" fill="${inkColor}" text-anchor="middle">${val}</text>\n`;
    }
  }

  // Footer note e.g. "(Diagonal scratch pixels: 40, 42, 38, 41)"
  if (footer) {
    const footerY = (numRows + 0.78) * rowHeight;
    textSvg += `  <text x="${svgWidth / 2}" y="${footerY}" font-family="'${fontFamily}', cursive, sans-serif" font-size="${Math.max(13, fontSize - 3)}" font-style="italic" fill="${inkColor}" text-anchor="middle">${footer}</text>\n`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" style="background: transparent; font-family: '${fontFamily}', cursive, sans-serif;">
  <style>
    text, tspan {
      font-family: '${fontFamily}', cursive, sans-serif !important;
      fill: ${inkColor} !important;
    }
  </style>
${textSvg}</svg>`;

  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const widthMm = Math.min(150, Math.max(70, Math.round(svgWidth * 0.38)));
  // Exactly 7.3mm per row so each row aligns with ruled notebook line!
  const heightMm = Math.round(numTotalRows * 7.3 * 10) / 10;

  return {
    svg,
    svgDataUrl,
    widthMm,
    heightMm,
    caption: '', // No caption underneath matrices
    diagramType: 'matrix'
  };
}

/**
 * Universal ASCII Flowchart & Architecture Diagram to Vector SVG Generator.
 * Renders the entire diagram in its exact authentic 2D orientation matching Microsoft Word.
 * Preserves all character alignments, horizontal branching, boxes, arrows, and loopbacks
 * using pixel-perfect monospace typography and notebook card styling.
 */
export function generateAsciiDiagramSvg(
  rawLines: string[],
  options: AsciiDiagramOptions = {}
): DiagramBlockInfo {
  const cleanLines = [...rawLines];
  // Strip empty lines at start and end
  while (cleanLines.length > 0 && !cleanLines[0].trim()) cleanLines.shift();
  while (cleanLines.length > 0 && !cleanLines[cleanLines.length - 1].trim()) cleanLines.pop();

  if (cleanLines.length === 0) {
    return {
      svg: '',
      svgDataUrl: '',
      widthMm: 120,
      heightMm: 60,
      caption: options.caption || 'Diagram'
    };
  }

  // Detect minimum common leading whitespace across non-empty lines to trim unnecessary margin
  let minIndent = Infinity;
  for (const line of cleanLines) {
    if (!line.trim()) continue;
    const match = line.match(/^(\s*)/);
    if (match) {
      minIndent = Math.min(minIndent, match[1].length);
    }
  }
  const indentToStrip = (minIndent > 0 && minIndent !== Infinity) ? minIndent : 0;
  const normalizedLines = cleanLines.map(l => l.substring(Math.min(l.length, indentToStrip)));

  const maxCols = Math.max(10, ...normalizedLines.map(l => l.length));
  const charWidth = 8.0; // px per character
  const lineHeight = 16.5; // px per line
  const paddingX = 26;
  const paddingY = 18;

  const widthPx = Math.ceil(maxCols * charWidth + paddingX * 2);
  const heightPx = Math.ceil(normalizedLines.length * lineHeight + paddingY * 2);

  const inkColor = options.inkColor || '#000000';
  const bgColor = options.bgColor || '#f8fafc';
  const borderColor = options.borderColor || '#000000';
  const fontFamily = options.fontFamily
    ? `'${options.fontFamily}', 'Bad Script', 'Caveat', cursive, sans-serif`
    : "'Bad Script', 'Caveat', cursive, sans-serif";

  let textSvg = '';
  normalizedLines.forEach((line, idx) => {
    const y = paddingY + (idx + 1) * lineHeight - 4;
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    textSvg += `    <text x="${paddingX}" y="${y}" xml:space="preserve">${escaped}</text>\n`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthPx} ${heightPx}" width="${widthPx}" height="${heightPx}" style="background: transparent;">
  <style>
    text {
      font-family: ${fontFamily};
      font-size: 13px;
      font-weight: 500;
      fill: ${inkColor};
      letter-spacing: 0px;
    }
  </style>
${textSvg}</svg>`;

  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  // Compute notebook-proportional dimensions
  let widthMm = 145;
  if (maxCols <= 25) {
    widthMm = 90;
  } else if (maxCols <= 45) {
    widthMm = 125;
  } else if (maxCols <= 65) {
    widthMm = 145;
  } else {
    widthMm = 158;
  }

  // Calculate height proportional to aspect ratio, clamped to max 185mm (to fit on single ruled page)
  const aspectRatio = heightPx / widthPx;
  const naturalHeightMm = Math.round(widthMm * aspectRatio);
  const heightMm = Math.min(185, Math.max(25, naturalHeightMm));

  const caption = options.caption || (normalizedLines.length > 20 ? 'Flowchart' : 'Diagram');

  return {
    svg,
    svgDataUrl,
    widthMm,
    heightMm,
    caption,
    diagramType: 'ascii'
  };
}

export interface RemoveBackgroundOptions {
  luminanceThreshold?: number; // 0-255: pixels with luminance >= threshold become transparent (default 215)
  featheringRange?: number;    // Soft transition range to prevent jagged edges (default 45)
  preserveDarkInk?: boolean;  // Whether to deepen contrast of ink/text (default true)
}

/**
 * Removes white, off-white, and light backgrounds from any image (PNG, JPEG, or SVG),
 * leaving strictly the text characters, strokes, and diagram lines with full alpha transparency.
 * Allows images and diagrams to sit directly on ruled notebook lines without obscuring them.
 */
export function removeImageBackground(
  imageUrl: string,
  options: RemoveBackgroundOptions = {}
): Promise<string> {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve('');
      return;
    }

    // 1. If it's an SVG Data URL, strip all background fills directly in vector markup
    if (imageUrl.startsWith('data:image/svg+xml')) {
      try {
        const commaIdx = imageUrl.indexOf(',');
        const encoded = imageUrl.slice(commaIdx + 1);
        const decoded = decodeURIComponent(encoded);

        const cleaned = decoded
          .replace(/<rect[^>]*class=["']card-bg["'][^>]*\/?>/gi, '')
          .replace(/fill=["']#(?:f8fafc|eff6ff|f0fdf4|fff1f2|fee2e2|dcfce7|f1f5f9|ffffff|fff)["']/gi, 'fill="none"')
          .replace(/fill:\s*#(?:f8fafc|eff6ff|f0fdf4|fff1f2|fee2e2|dcfce7|f1f5f9|ffffff|fff)/gi, 'fill: none');

        const withBg = cleaned.includes('background: transparent')
          ? cleaned
          : cleaned.replace(/<svg\b([^>]*)>/i, '<svg$1 style="background: transparent;">');

        resolve('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withBg));
        return;
      } catch (svgErr) {
        console.warn('SVG background cleanup fallback:', svgErr);
      }
    }

    // 2. Raster Image (PNG, JPG, WebP) -> Process via offscreen canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const threshold = options.luminanceThreshold ?? 215;
        const feather = options.featheringRange ?? 45;
        const lowerBound = Math.max(0, threshold - feather);

        // Strip light/white background and preserve text/lines
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];

          if (alpha === 0) continue;

          // Perceived luminance formula (ITU-R BT.709)
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          if (lum >= threshold) {
            // White or paper background -> completely transparent
            data[i + 3] = 0;
          } else if (lum > lowerBound) {
            // Anti-aliased text edge feathering
            const factor = (threshold - lum) / feather;
            data[i + 3] = Math.round(alpha * factor);
            if (options.preserveDarkInk !== false) {
              data[i] = Math.round(r * factor);
              data[i + 1] = Math.round(g * factor);
              data[i + 2] = Math.round(b * factor);
            }
          } else {
            // Ink / character stroke -> keep solid and crisp
            if (options.preserveDarkInk !== false) {
              data[i] = Math.round(r * 0.9);
              data[i + 1] = Math.round(g * 0.9);
              data[i + 2] = Math.round(b * 0.9);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('Canvas background removal error:', e);
        resolve(imageUrl);
      }
    };

    img.onerror = () => {
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}


