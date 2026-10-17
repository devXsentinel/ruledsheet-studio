import { TemplateConfig } from '../types';

// Physical Calibrated Lines for Sandip University A4 Assignment Sheet (210 x 297 mm)
// Measured directly from 300 DPI flatbed optical scan (2480 x 3507 px).
// Writing Line 1 begins at 46.83mm (cleanly below header text and double rule).
// Line pitch is exactly 7.30mm across 33 writing lines ending at 280.66mm.
export const DEFAULT_SANDIP_LINES_MM = [
  46.83, 54.2, 61.48, 68.85, 76.22, 83.5, 90.79, 98.15, 105.52, 112.8,
  120.17, 127.46, 134.74, 142.11, 149.39, 156.76, 163.96, 171.32, 178.61, 185.89,
  193.17, 200.46, 207.82, 215.11, 222.39, 229.67, 236.96, 244.32, 251.52, 258.81,
  266.09, 273.37, 280.66
];

export const DEFAULT_TEMPLATE: TemplateConfig = {
  id: 'sandip-university-default',
  name: 'Sandip University Assignment Sheet',
  imageUrl: '/default_template.jpg',
  paperSize: 'A4',
  pageWidthMm: 210.0,
  pageHeightMm: 297.0,
  writingArea: {
    leftMarginMm: 31.0, // Just to the right of the vertical double margin rule at 30.06mm
    rightMarginMm: 201.0, // Ruled lines end at 204.7mm; 201mm fully utilizes line width
    firstLineYMm: 46.83, // First ruled writing line below header
    lastLineYMm: 280.66, // Last ruled writing line
    indexLineXMm: 29.13, // Double vertical margin rule position
    marginLabelXMm: 19.5 // Left margin placement for Q.1, Ans., etc.
  },
  linesMm: [...DEFAULT_SANDIP_LINES_MM],
  baselineOffsetMm: 0.0, // Text baseline sits flush directly on the physical ruled lines
  rotationDeg: 0,
  isDefault: true
};

const STORAGE_KEY = 'ruled_page_template_config_v4';

export function loadSavedTemplate(): TemplateConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.linesMm) && parsed.linesMm.length === 33) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load saved template, using calibrated default:', err);
  }
  // Save calibrated v3 template
  const def = { ...DEFAULT_TEMPLATE };
  saveTemplate(def);
  return def;
}

export function saveTemplate(template: TemplateConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
  } catch (err) {
    console.error('Failed to save template to localStorage:', err);
  }
}

export function resetTemplateToDefault(): TemplateConfig {
  const reset = {
    ...DEFAULT_TEMPLATE,
    baselineOffsetMm: 0.0,
    linesMm: [...DEFAULT_SANDIP_LINES_MM],
    writingArea: {
      ...DEFAULT_TEMPLATE.writingArea,
      firstLineYMm: 46.83,
      lastLineYMm: 280.66
    }
  };
  saveTemplate(reset);
  return reset;
}
