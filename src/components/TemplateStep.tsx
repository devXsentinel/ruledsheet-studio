import React, { useRef } from 'react';
import { TemplateConfig } from '../types';
import { Sliders, Upload, RotateCcw, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Layers } from 'lucide-react';

interface Props {
  template: TemplateConfig;
  onOpenCalibration: () => void;
  onUpdateTemplate: (template: TemplateConfig) => void;
  onResetTemplate: () => void;
  onNext: () => void;
}

export const TemplateStep: React.FC<Props> = ({
  template,
  onOpenCalibration,
  onUpdateTemplate,
  onResetTemplate,
  onNext
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      const updated: TemplateConfig = {
        ...template,
        id: `template-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        imageUrl,
        isDefault: false
      };
      onUpdateTemplate(updated);
      onOpenCalibration();
    };
    reader.readAsDataURL(file);
  };

  const lineCount = template.linesMm.length;
  const usableWidthMm = Math.round((template.writingArea.rightMarginMm - template.writingArea.leftMarginMm) * 10) / 10;

  return (
    <div className="step-container animate-in">
      
      {/* Hero Header */}
      <div className="step-hero-card">
        <span className="pill-badge pill-badge-blue">
          <Sparkles size={13} />
          Step 1 &bull; Ruled Paper Setup
        </span>
        <h1 className="step-hero-title">Ruled Page Template</h1>
        <p className="step-hero-desc">
          Your text will align directly onto this sheet&apos;s pre-printed horizontal rules. The default <strong>ruled sheet</strong> is pre-calibrated with 33 writing lines, double vertical margin, and A4 paper size.
        </p>
      </div>

      {/* Main Grid: Template Preview + Details */}
      <div className="grid-two-cols">
        
        {/* Left: Template Thumbnail Card */}
        <div className="control-card" style={{ alignItems: 'center', textAlign: 'center', padding: '1.75rem' }}>
          <div
            onClick={onOpenCalibration}
            style={{
              position: 'relative',
              cursor: 'pointer',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-paper)',
              maxWidth: '300px',
              border: '2px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <img
              src={template.imageUrl}
              alt={template.name}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(37, 99, 235, 0.4)',
                opacity: 0,
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(2px)'
              }}
              className="hover-overlay"
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            >
              <button className="btn btn-primary btn-sm">
                <Sliders size={14} />
                Open Line Calibrator
              </button>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Click sheet to inspect or adjust ruled lines
            </span>
          </div>
        </div>

        {/* Right: Specifications & Primary Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="control-card">
            <div className="control-card-header">
              <span className="control-title">
                <Layers size={15} color="var(--accent-primary)" />
                Sheet Specifications
              </span>
              {template.isDefault && (
                <span className="pill-badge pill-badge-green">
                  <CheckCircle2 size={12} />
                  Default Ruled Sheet
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Paper Format</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {template.paperSize} ({template.pageWidthMm} &times; {template.pageHeightMm} mm)
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Writing Lines</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.15rem' }}>
                  {lineCount} ruled lines
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Left Writing Margin</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#34d399', marginTop: '0.15rem' }}>
                  {template.writingArea.leftMarginMm} mm
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Usable Width</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {usableWidthMm} mm
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '0.25rem' }}>
              Text baseline sits flush on each detected rule line (<strong>{template.baselineOffsetMm > 0 ? `+${template.baselineOffsetMm}` : template.baselineOffsetMm}mm</strong> offset). Writing area begins at <strong>{template.writingArea.firstLineYMm}mm</strong> below header and ends at <strong>{template.writingArea.lastLineYMm}mm</strong>.
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={onOpenCalibration} className="btn btn-secondary" style={{ flex: 1 }}>
                <Sliders size={16} />
                Calibrate Lines & Margins
              </button>

              <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary" title="Upload another sheet image">
                <Upload size={16} />
                Upload Other Sheet
              </button>
              <input type="file" ref={fileInputRef} onChange={handleCustomImageUpload} accept="image/*" style={{ display: 'none' }} />

              {!template.isDefault && (
                <button onClick={onResetTemplate} className="btn btn-secondary" title="Reset to default template">
                  <RotateCcw size={16} />
                </button>
              )}
            </div>

            <button onClick={onNext} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Continue to Word Document Import
              <ArrowRight size={18} />
            </button>
          </div>

        </div>

      </div>

      {/* Privacy Guarantee Note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem', color: '#a7f3d0' }}>
        <ShieldCheck size={22} color="#34d399" style={{ flexShrink: 0 }} />
        <span>
          <strong>100% Offline &amp; Local:</strong> All image processing, calibration, and document rendering happens strictly in your browser. No files are transmitted to any server.
        </span>
      </div>

    </div>
  );
};
