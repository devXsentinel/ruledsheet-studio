import { WritingArea } from '../types';

export interface DetectionResult {
  linesMm: number[];
  writingArea: WritingArea;
  averageSpacingMm: number;
  confidence: number;
}

/**
 * Detects horizontal ruled lines and margin boundaries from a page image using Canvas pixel analysis.
 */
export async function detectRuledLinesFromImage(
  imageSource: string | HTMLImageElement,
  pageWidthMm: number = 210,
  pageHeightMm: number = 297,
  sensitivity: number = 0.5 // 0.1 (fewer lines) to 1.0 (more lines)
): Promise<DetectionResult> {
  const img = await resolveImage(imageSource);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Work with a reasonable resolution for speed and noise reduction
  const targetWidth = 1200;
  const scale = targetWidth / img.naturalWidth;
  const targetHeight = Math.round(img.naturalHeight * scale);

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;

  // 1. Detect vertical margin line in the left 10% - 25% zone
  const vSearchLeft = Math.round(targetWidth * 0.08);
  const vSearchRight = Math.round(targetWidth * 0.28);
  const vSearchTop = Math.round(targetHeight * 0.25);
  const vSearchBottom = Math.round(targetHeight * 0.85);

  const vColScores = new Float32Array(vSearchRight - vSearchLeft);

  for (let x = vSearchLeft; x < vSearchRight; x++) {
    let colDarkness = 0;
    for (let y = vSearchTop; y < vSearchBottom; y++) {
      const idx = (y * targetWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      colDarkness += (255 - brightness);
    }
    vColScores[x - vSearchLeft] = colDarkness;
  }

  let maxVScore = 0;
  let bestVCol = vSearchLeft;
  for (let i = 0; i < vColScores.length; i++) {
    if (vColScores[i] > maxVScore) {
      maxVScore = vColScores[i];
      bestVCol = vSearchLeft + i;
    }
  }

  // Left margin is slightly to the right of the vertical margin rule
  const leftMarginPx = bestVCol + Math.round(targetWidth * 0.01);
  const leftMarginMm = Math.round(((leftMarginPx / targetWidth) * pageWidthMm) * 10) / 10;
  const rightMarginMm = Math.round(pageWidthMm * 0.95 * 10) / 10;

  // 2. Horizontal Projection for ruled lines
  // Sample a middle horizontal strip (from 35% to 75% width) to avoid margin rules and page borders
  const hSampleLeft = Math.round(targetWidth * 0.35);
  const hSampleRight = Math.round(targetWidth * 0.75);
  const hSampleWidth = hSampleRight - hSampleLeft;

  // Skip top 14% (header/logo) and bottom 4%
  const startY = Math.round(targetHeight * 0.14);
  const endY = Math.round(targetHeight * 0.96);

  const rawProj = new Float32Array(targetHeight);

  for (let y = startY; y < endY; y++) {
    let rowDarkness = 0;
    for (let x = hSampleLeft; x < hSampleRight; x++) {
      const idx = (y * targetWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      rowDarkness += (255 - brightness);
    }
    rawProj[y] = rowDarkness / hSampleWidth;
  }

  // 3. Smooth with a 5-pixel moving average to reduce paper texture grain
  const smoothed = new Float32Array(targetHeight);
  const kernel = 2;
  for (let y = startY + kernel; y < endY - kernel; y++) {
    let sum = 0;
    for (let k = -kernel; k <= kernel; k++) {
      sum += rawProj[y + k];
    }
    smoothed[y] = sum / (kernel * 2 + 1);
  }

  // Calculate local background baseline using a wider window (e.g. 35 px)
  const bgWindow = 20;
  const relativeScore = new Float32Array(targetHeight);
  for (let y = startY + bgWindow; y < endY - bgWindow; y++) {
    let localSum = 0;
    for (let k = -bgWindow; k <= bgWindow; k++) {
      localSum += smoothed[y + k];
    }
    const localAvg = localSum / (bgWindow * 2 + 1);
    relativeScore[y] = Math.max(0, smoothed[y] - localAvg);
  }

  // 4. Peak detection with minimum distance
  // Typically ruled lines are spaced at ~6mm to 9mm on A4
  // targetHeight corresponds to 297mm.
  // 1 mm in pixels = targetHeight / pageHeightMm
  const pxPerMm = targetHeight / pageHeightMm;
  const minLineDistancePx = Math.round(5.5 * pxPerMm); // at least 5.5mm apart

  // Calculate threshold based on sensitivity
  let maxRelScore = 0;
  for (let y = startY; y < endY; y++) {
    if (relativeScore[y] > maxRelScore) maxRelScore = relativeScore[y];
  }

  const threshold = maxRelScore * (0.28 * (1.2 - sensitivity));

  const peakYCoords: number[] = [];
  for (let y = startY + 5; y < endY - 5; y++) {
    if (relativeScore[y] > threshold) {
      if (
        relativeScore[y] >= relativeScore[y - 1] &&
        relativeScore[y] >= relativeScore[y - 2] &&
        relativeScore[y] >= relativeScore[y + 1] &&
        relativeScore[y] >= relativeScore[y + 2]
      ) {
        // Check distance to previous peak
        if (
          peakYCoords.length === 0 ||
          y - peakYCoords[peakYCoords.length - 1] >= minLineDistancePx
        ) {
          peakYCoords.push(y);
        } else {
          // If too close, keep the higher peak
          const lastIdx = peakYCoords.length - 1;
          const lastY = peakYCoords[lastIdx];
          if (relativeScore[y] > relativeScore[lastY]) {
            peakYCoords[lastIdx] = y;
          }
        }
      }
    }
  }

  // Convert to millimeters
  const detectedLinesMm = peakYCoords.map(y =>
    Math.round(((y / targetHeight) * pageHeightMm) * 100) / 100
  );

  // Fallback if very few lines detected (e.g. low-contrast photo)
  if (detectedLinesMm.length < 5) {
    const defaultLines: number[] = [];
    const firstLineY = 53.20;
    const spacing = 7.28;
    let curr = firstLineY;
    while (curr <= 280.0) {
      defaultLines.push(Math.round(curr * 100) / 100);
      curr += spacing;
    }
    return {
      linesMm: defaultLines,
      writingArea: {
        leftMarginMm: Math.max(25, leftMarginMm),
        rightMarginMm,
        firstLineYMm: defaultLines[0],
        lastLineYMm: defaultLines[defaultLines.length - 1]
      },
      averageSpacingMm: spacing,
      confidence: 0.4
    };
  }

  // Calculate average spacing
  let totalSpacing = 0;
  for (let i = 1; i < detectedLinesMm.length; i++) {
    totalSpacing += detectedLinesMm[i] - detectedLinesMm[i - 1];
  }
  const averageSpacingMm = Math.round((totalSpacing / (detectedLinesMm.length - 1)) * 100) / 100;

  return {
    linesMm: detectedLinesMm,
    writingArea: {
      leftMarginMm: Math.max(15, leftMarginMm),
      rightMarginMm,
      firstLineYMm: detectedLinesMm[0],
      lastLineYMm: detectedLinesMm[detectedLinesMm.length - 1]
    },
    averageSpacingMm,
    confidence: Math.min(1.0, detectedLinesMm.length / 30)
  };
}

function resolveImage(source: string | HTMLImageElement): Promise<HTMLImageElement> {
  if (source instanceof HTMLImageElement && source.complete && source.naturalWidth > 0) {
    return Promise.resolve(source);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for line detection'));
    img.src = typeof source === 'string' ? source : source.src;
  });
}
