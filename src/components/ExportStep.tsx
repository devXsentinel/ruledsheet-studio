import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { TemplateConfig, LayoutResult, HandwritingSettings } from '../types';
import { generateHandwritingPdf, generateAlignmentTestPdf, downloadPdf } from '../utils/pdfGenerator';
import {
  Download,
  Printer,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  RotateCcw,
  Sliders,
  FileCheck2
} from 'lucide-react';

interface Props {
  template: TemplateConfig;
  layout: LayoutResult;
  settings: HandwritingSettings;
  onUpdateSettings?: (settings: HandwritingSettings | ((prev: HandwritingSettings) => HandwritingSettings)) => void;
  onBackToPreview: () => void;
}

export const ExportStep: React.FC<Props> = ({
  template,
  layout,
  settings,
  onUpdateSettings,
  onBackToPreview
}) => {
  const [isExportingPreview, setIsExportingPreview] = useState(false);
  const [isExportingPrint, setIsExportingPrint] = useState(false);
  const [isExportingTest, setIsExportingTest] = useState(false);

  const handleExportPreview = async () => {
    setIsExportingPreview(true);
    try {
      const pdfBytes = await generateHandwritingPdf(layout, template, settings, true);
      downloadPdf(pdfBytes, `Assignment_Preview_${template.paperSize}.pdf`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err: any) {
      alert(`Export error: ${err?.message || 'Could not generate Preview PDF'}`);
    } finally {
      setIsExportingPreview(false);
    }
  };

  const handleExportPrint = async () => {
    setIsExportingPrint(true);
    try {
      const pdfBytes = await generateHandwritingPdf(layout, template, settings, false);
      downloadPdf(pdfBytes, `Assignment_Print_TextOnly_${template.paperSize}.pdf`);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
    } catch (err: any) {
      alert(`Export error: ${err?.message || 'Could not generate Print PDF'}`);
    } finally {
      setIsExportingPrint(false);
    }
  };

  const handleExportTest = async () => {
    setIsExportingTest(true);
    try {
      const pdfBytes = await generateAlignmentTestPdf(template, settings);
      downloadPdf(pdfBytes, `Alignment_Print_Test_Sheet.pdf`);
    } catch (err: any) {
      alert(`Export error: ${err?.message || 'Could not generate Test Sheet'}`);
    } finally {
      setIsExportingTest(false);
    }
  };

  const handleNudgeOffset = (deltaMm: number) => {
    if (onUpdateSettings) {
      onUpdateSettings(prev => ({
        ...prev,
        baselineOffsetMm: Math.round((prev.baselineOffsetMm + deltaMm) * 10) / 10
      }));
    }
  };

  const handleSetOffset = (valMm: number) => {
    if (onUpdateSettings) {
      onUpdateSettings(prev => ({
        ...prev,
        baselineOffsetMm: Math.round(valMm * 10) / 10
      }));
    }
  };

  return (
    <div className="step-container animate-in">
      
      {/* Hero Header */}
      <div className="step-hero-card">
        <span className="pill-badge pill-badge-blue">
          <Sparkles size={13} />
          Step 4 &bull; Export Vector PDFs
        </span>
        <h1 className="step-hero-title">Download Assignment PDFs</h1>
        <p className="step-hero-desc">
          Both PDF variants share the <strong>exact same frozen layout</strong> and physical coordinates. Calibrated for standard A4 pre-printed ruled sheets.
        </p>
      </div>

      {/* Critical Printing Instructions Callout */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-xl)',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fca5a5', fontWeight: 800, fontSize: '0.95rem' }}>
            <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>CRITICAL PRINTER SETUP &bull; Prevent Text Misalignment</span>
          </div>
          <button
            onClick={handleExportTest}
            disabled={isExportingTest}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
            title="Print a 1-page test sheet to verify printer feeding before printing your whole assignment"
          >
            <FileCheck2 size={14} color="#ef4444" />
            {isExportingTest ? 'Preparing Test...' : 'Download 1-Page Test Sheet'}
          </button>
        </div>

        <div style={{ fontSize: '0.8125rem', color: '#fecaca', lineHeight: 1.6 }}>
          When printing the <strong>Text Only PDF</strong> onto your physical ruled sheets, your printer driver MUST NOT scale or resize the document:
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem', marginTop: '0.65rem' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.2rem' }}>1. PRINT SCALE SETTING</div>
              <div style={{ fontSize: '0.75rem', color: '#ffffff' }}>
                Select <strong>&quot;Actual Size&quot;</strong> or <strong>100%</strong>.<br />
                <span style={{ color: '#f87171' }}>NEVER select &quot;Fit to Page&quot; or &quot;Fit to Printable Area&quot;</span> (that shrinks the page by ~4% and displaces the lines).
              </div>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.2rem' }}>2. PAPER SIZE</div>
              <div style={{ fontSize: '0.75rem', color: '#ffffff' }}>
                Ensure paper size is set to <strong>A4</strong> (210 &times; 297 mm) in your printer dialog, not US Letter.
              </div>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.2rem' }}>3. PRINTER TRAY ALIGNMENT</div>
              <div style={{ fontSize: '0.75rem', color: '#ffffff' }}>
                Snug the paper tray guides against the A4 sheets so paper feeds straight without skew.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Baseline Nudge Tool on Export Screen */}
      {onUpdateSettings && (
        <div className="control-card" style={{ gap: '0.85rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={16} color="var(--accent-primary)" />
              <span className="control-title" style={{ color: '#ffffff', margin: 0 }}>
                Printer Roller Baseline Fine-Tuning
              </span>
            </div>
            <span className="pill-badge pill-badge-blue">
              Current: {settings.baselineOffsetMm > 0 ? `+${settings.baselineOffsetMm}` : settings.baselineOffsetMm} mm
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            If your physical printer's paper pickup roller feeds paper slightly higher or lower, use these nudge buttons to adjust the baseline across all pages without going back:
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Quick Nudge:</span>
            <button onClick={() => handleNudgeOffset(-1.0)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
              -1.0mm (Higher)
            </button>
            <button onClick={() => handleNudgeOffset(-0.5)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
              -0.5mm
            </button>
            <button
              onClick={() => handleSetOffset(0.0)}
              className={`btn ${settings.baselineOffsetMm === 0 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{ fontSize: '0.6875rem', padding: '0.25rem 0.6rem' }}
            >
              0.0mm (Calibrated Default)
            </button>
            <button onClick={() => handleNudgeOffset(0.5)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
              +0.5mm
            </button>
            <button onClick={() => handleNudgeOffset(1.0)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
              +1.0mm (Lower)
            </button>
          </div>
        </div>
      )}

      {/* Two Export Options */}
      <div className="grid-two-cols">
        
        {/* Card 1: Print-Ready PDF (Text Only) */}
        <div className="export-card featured">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="export-card-icon">
                <Printer size={26} />
              </div>
              <span className="pill-badge pill-badge-blue" style={{ background: '#2563eb', color: '#ffffff', border: 'none' }}>
                Primary For Printing
              </span>
            </div>

            <div>
              <h2 className="export-card-title">Export Print PDF (Text Only)</h2>
              <p className="export-card-desc">
                Contains <strong>only your handwritten text</strong> on a clean transparent background. No sheet photograph, no ruled lines, no university logo.
              </p>
            </div>

            <ul className="export-checklist" style={{ marginTop: '0.5rem' }}>
              <li>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Zero template pixels or paper background</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Feeds into printer with real pre-printed ruled sheets</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Line 1 starts at 53.20mm (cleanly below header double rule)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="#10b981" />
                <span>{layout.totalPageCount} page{layout.totalPageCount > 1 ? 's' : ''} &bull; Exact 7.28mm line pitch</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleExportPrint}
            disabled={isExportingPrint}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            <Download size={18} />
            {isExportingPrint ? 'Generating Print PDF...' : 'Download Print PDF (Text Only)'}
          </button>
        </div>

        {/* Card 2: Preview PDF (With Background) */}
        <div className="export-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="export-card-icon" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                <Eye size={26} />
              </div>
              <span className="pill-badge pill-badge-blue">
                Digital Submission
              </span>
            </div>

            <div>
              <h2 className="export-card-title">Export Preview PDF (With Sheet)</h2>
              <p className="export-card-desc">
                Renders handwritten text directly onto the <strong>calibrated ruled paper template</strong>. Ideal for online classroom submission or verification.
              </p>
            </div>

            <ul className="export-checklist" style={{ marginTop: '0.5rem' }}>
              <li>
                <CheckCircle2 size={16} color="#60a5fa" />
                <span>Includes university logo, header, and ruled lines</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="#60a5fa" />
                <span>Matches on-screen studio preview 1:1</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="#60a5fa" />
                <span>Complete self-contained assignment document</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleExportPreview}
            disabled={isExportingPreview}
            className="btn btn-secondary btn-lg"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            <Download size={18} />
            {isExportingPreview ? 'Generating Preview PDF...' : 'Download Preview PDF (With Sheet)'}
          </button>
        </div>

      </div>

      {/* Layout Details */}
      <div className="control-card" style={{ gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="control-title">
            <Info size={15} color="var(--accent-primary)" />
            Frozen Layout Specs
          </span>
          <button onClick={onBackToPreview} className="btn btn-ghost btn-sm" style={{ color: '#60a5fa' }}>
            <RotateCcw size={13} />
            Back to Studio Preview
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Total Pages</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono' }}>
              {layout.totalPageCount}
            </div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Font Style</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#60a5fa' }}>
              {settings.fontFamily}
            </div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Font Size</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', fontFamily: 'JetBrains Mono' }}>
              {settings.fontSizePt} pt
            </div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Baseline Offset</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#a78bfa', fontFamily: 'JetBrains Mono' }}>
              {settings.baselineOffsetMm} mm
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
