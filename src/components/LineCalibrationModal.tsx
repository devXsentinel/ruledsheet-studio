import React, { useState, useRef } from 'react';
import { TemplateConfig } from '../types';
import { detectRuledLinesFromImage } from '../utils/lineDetector';
import { DEFAULT_SANDIP_LINES_MM, DEFAULT_TEMPLATE } from '../utils/defaultTemplate';
import {
  X,
  Wand2,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  MoveVertical,
  Sliders,
  ChevronDown,
  Layers
} from 'lucide-react';

interface Props {
  template: TemplateConfig;
  onSave: (updated: TemplateConfig) => void;
  onClose: () => void;
}

export const LineCalibrationModal: React.FC<Props> = ({ template, onSave, onClose }) => {
  const [lines, setLines] = useState<number[]>([...template.linesMm].sort((a, b) => a - b));
  const [leftMarginMm, setLeftMarginMm] = useState<number>(template.writingArea.leftMarginMm);
  const [rightMarginMm, setRightMarginMm] = useState<number>(template.writingArea.rightMarginMm);
  const [baselineOffsetMm, setBaselineOffsetMm] = useState<number>((template.baselineOffsetMm === -1.2 || template.baselineOffsetMm === undefined) ? 0.0 : template.baselineOffsetMm);
  const [pageWidthMm, setPageWidthMm] = useState<number>(template.pageWidthMm);
  const [pageHeightMm, setPageHeightMm] = useState<number>(template.pageHeightMm);
  const [paperSize, setPaperSize] = useState(template.paperSize);
  const [rotationDeg, setRotationDeg] = useState(template.rotationDeg || 0);

  const [zoom, setZoom] = useState<number>(0.85);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(0.5);
  const [showSpacingGenerator, setShowSpacingGenerator] = useState<boolean>(false);
  const [genFirstLineY, setGenFirstLineY] = useState<number>(lines[0] || 47.4);
  const [genSpacingMm, setGenSpacingMm] = useState<number>(7.3);
  const [genLineCount, setGenLineCount] = useState<number>(lines.length || 33);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'controls'>('canvas');

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect lines using canvas pixel processing
  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      const result = await detectRuledLinesFromImage(
        template.imageUrl,
        pageWidthMm,
        pageHeightMm,
        sensitivity
      );
      if (result.linesMm.length > 0) {
        setLines(result.linesMm.sort((a, b) => a - b));
        setLeftMarginMm(result.writingArea.leftMarginMm);
        setRightMarginMm(result.writingArea.rightMarginMm);
        setSelectedLineIndex(null);
      }
    } catch (err: any) {
      alert(`Line detection error: ${err?.message || 'Could not detect lines'}`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Generate uniform lines from first line and spacing
  const handleGenerateUniform = () => {
    const newLines: number[] = [];
    let curr = genFirstLineY;
    for (let i = 0; i < genLineCount; i++) {
      if (curr > pageHeightMm - 5) break;
      newLines.push(Math.round(curr * 100) / 100);
      curr += genSpacingMm;
    }
    setLines(newLines);
    setShowSpacingGenerator(false);
  };

  // Reset to default Sandip calibration
  const handleResetDefault = () => {
    if (confirm('Reset lines and margins to default Sandip University calibration?')) {
      setLines([...DEFAULT_SANDIP_LINES_MM]);
      setLeftMarginMm(DEFAULT_TEMPLATE.writingArea.leftMarginMm);
      setRightMarginMm(DEFAULT_TEMPLATE.writingArea.rightMarginMm);
      setBaselineOffsetMm(DEFAULT_TEMPLATE.baselineOffsetMm);
      setPageWidthMm(DEFAULT_TEMPLATE.pageWidthMm);
      setPageHeightMm(DEFAULT_TEMPLATE.pageHeightMm);
      setPaperSize(DEFAULT_TEMPLATE.paperSize);
      setSelectedLineIndex(null);
    }
  };

  const handleAddLineAtClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickYMm = Math.round(((clickY / rect.height) * pageHeightMm) * 100) / 100;
    const updated = [...lines, clickYMm].sort((a, b) => a - b);
    setLines(updated);
    setSelectedLineIndex(updated.indexOf(clickYMm));
  };

  const handleDeleteLine = (index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    setLines(updated);
    setSelectedLineIndex(null);
  };

  const handleUpdateLine = (index: number, newYMm: number) => {
    const updated = [...lines];
    updated[index] = Math.round(newYMm * 100) / 100;
    setLines(updated.sort((a, b) => a - b));
  };

  const handleShiftAllLines = (deltaMm: number) => {
    setLines(lines.map(y => Math.round((y + deltaMm) * 100) / 100));
  };

  const handleSave = () => {
    const updated: TemplateConfig = {
      ...template,
      paperSize,
      pageWidthMm,
      pageHeightMm,
      rotationDeg,
      baselineOffsetMm,
      linesMm: [...lines].sort((a, b) => a - b),
      writingArea: {
        leftMarginMm,
        rightMarginMm,
        firstLineYMm: lines[0] || 53.20,
        lastLineYMm: lines[lines.length - 1] || 278.88
      }
    };
    onSave(updated);
    onClose();
  };

  const toYPercent = (mm: number) => `${(mm / pageHeightMm) * 100}%`;
  const toXPercent = (mm: number) => `${(mm / pageWidthMm) * 100}%`;

  return (
    <div className="modal-overlay">
      <div className="modal-window">
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MoveVertical size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Template Line Calibrator
                <span className="pill-badge pill-badge-blue">{lines.length} writing lines</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Inspect, fine-tune, or auto-detect ruled writing lines for physical print accuracy.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button onClick={handleResetDefault} className="btn btn-secondary btn-sm" title="Reset to default calibration">
              <RotateCcw size={13} />
              <span className="hide-on-mobile">Reset Default</span>
            </button>
            <button onClick={handleSave} className="btn btn-primary btn-sm" title="Save calibration">
              <Check size={14} />
              <span>Save</span>
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.35rem' }} title="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher for Modal */}
        <div className="mobile-modal-tabs">
          <button
            onClick={() => setMobileTab('canvas')}
            className={`mobile-modal-tab-btn ${mobileTab === 'canvas' ? 'active' : ''}`}
          >
            <MoveVertical size={14} />
            <span>Visual Sheet</span>
          </button>
          <button
            onClick={() => setMobileTab('controls')}
            className={`mobile-modal-tab-btn ${mobileTab === 'controls' ? 'active' : ''}`}
          >
            <Sliders size={14} />
            <span>Line Sliders & Tuning</span>
          </button>
        </div>

        {/* Body */}
        <div className={`modal-body mobile-tab-${mobileTab}`}>
          
          {/* Visual Canvas Area */}
          <div className={`modal-canvas-area custom-scrollbar ${mobileTab === 'canvas' ? 'active' : ''}`} ref={containerRef}>
            
            {/* Visual zoom floating tools */}
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 20, display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(15, 23, 42, 0.85)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', backdropFilter: 'blur(8px)' }}>
              <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="btn btn-ghost btn-sm">
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'JetBrains Mono', padding: '0 0.25rem', color: 'var(--text-secondary)' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} className="btn btn-ghost btn-sm">
                <ZoomIn size={13} />
              </button>
              <button onClick={() => setZoom(0.85)} className="btn btn-ghost btn-sm">
                <Maximize2 size={12} />
              </button>
            </div>

            <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 20, background: 'rgba(15, 23, 42, 0.85)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', fontSize: '0.6875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
              Click sheet to add line &bull; Click line to adjust
            </div>

            {/* Scaled Template with Overlay */}
            <div
              style={{
                position: 'relative',
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                boxShadow: 'var(--shadow-paper)',
                background: '#ffffff',
                flexShrink: 0,
                cursor: 'crosshair'
              }}
            >
              <img
                src={template.imageUrl}
                alt="Calibration"
                style={{
                  width: '600px',
                  height: `${Math.round(600 * (pageHeightMm / pageWidthMm))}px`,
                  display: 'block',
                  pointerEvents: 'none'
                }}
              />

              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                onClick={handleAddLineAtClick}
              >
                {/* Left Margin */}
                <line
                  x1={toXPercent(leftMarginMm)}
                  y1="0"
                  x2={toXPercent(leftMarginMm)}
                  y2="100%"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                {/* Right Margin */}
                <line
                  x1={toXPercent(rightMarginMm)}
                  y1="0"
                  x2={toXPercent(rightMarginMm)}
                  y2="100%"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                {/* Lines */}
                {lines.map((lineY, idx) => {
                  const isSelected = selectedLineIndex === idx;
                  const baselineY = lineY + baselineOffsetMm;

                  return (
                    <g key={idx}>
                      <line
                        x1={toXPercent(leftMarginMm - 5)}
                        y1={toYPercent(lineY)}
                        x2={toXPercent(rightMarginMm + 5)}
                        y2={toYPercent(lineY)}
                        stroke={isSelected ? '#3b82f6' : 'rgba(239, 68, 68, 0.85)'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLineIndex(idx);
                        }}
                      />

                      <line
                        x1={toXPercent(leftMarginMm)}
                        y1={toYPercent(baselineY)}
                        x2={toXPercent(rightMarginMm)}
                        y2={toYPercent(baselineY)}
                        stroke="rgba(59, 130, 246, 0.45)"
                        strokeWidth="1"
                        strokeDasharray="2 3"
                      />

                      <text
                        x={toXPercent(leftMarginMm - 7)}
                        y={toYPercent(lineY + 1.2)}
                        fontSize="9"
                        fill={isSelected ? '#3b82f6' : '#ef4444'}
                        textAnchor="end"
                        style={{ fontFamily: 'JetBrains Mono', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLineIndex(idx);
                        }}
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

          </div>

          {/* Sidebar Controls */}
          <div className={`modal-sidebar custom-scrollbar ${mobileTab === 'controls' ? 'active' : ''}`}>
            {/* Mobile return to sheet view button */}
            <div className="mobile-modal-return-banner">
              <button onClick={() => setMobileTab('canvas')} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', gap: '0.4rem' }}>
                <MoveVertical size={14} />
                <span>View Calibrated Sheet</span>
              </button>
            </div>
            
            {/* Auto Detect Tool */}
            <div className="control-card">
              <span className="control-title">
                <Wand2 size={14} color="var(--accent-primary)" />
                Auto-Detection
              </span>
              <button
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
              >
                <Wand2 size={14} />
                {isDetecting ? 'Analyzing Pixels...' : 'Auto-Detect Lines on Sheet'}
              </button>

              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">Sensitivity:</span>
                  <span className="slider-val-badge">{Math.round(sensitivity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={sensitivity}
                  onChange={e => setSensitivity(parseFloat(e.target.value))}
                  className="slider-input"
                />
              </div>
            </div>

            {/* Baseline Offset Slider */}
            <div className="control-card" style={{ background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.25)' }}>
              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label" style={{ color: '#c4b5fd' }}>Baseline Offset:</span>
                  <span className="slider-val-badge" style={{ color: '#a78bfa' }}>
                    {baselineOffsetMm > 0 ? `+${baselineOffsetMm}mm` : `${baselineOffsetMm}mm`}
                  </span>
                </div>
                <p style={{ fontSize: '0.6875rem', color: '#cbd5e1', lineHeight: 1.4, margin: '0.2rem 0' }}>
                  Fine-tune text baseline relative to detected lines (0.0mm aligns flush on line).
                </p>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.1"
                  value={baselineOffsetMm}
                  onChange={e => setBaselineOffsetMm(parseFloat(e.target.value))}
                  className="slider-input"
                />
                <div className="slider-hints" style={{ color: '#94a3b8' }}>
                  <span>-3.0 mm (Higher)</span>
                  <span style={{ color: '#a78bfa', fontWeight: 700 }}>0.0 mm (On Line)</span>
                  <span>+3.0 mm (Lower)</span>
                </div>
              </div>
            </div>

            {/* Margins */}
            <div className="control-card">
              <span className="control-title">
                <Layers size={14} color="#10b981" />
                Margins (mm)
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#10b981' }}>Left Margin:</div>
                  <input
                    type="number"
                    step="0.5"
                    value={leftMarginMm}
                    onChange={e => setLeftMarginMm(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.35rem', fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#ffffff' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#f59e0b' }}>Right Limit:</div>
                  <input
                    type="number"
                    step="0.5"
                    value={rightMarginMm}
                    onChange={e => setRightMarginMm(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.35rem', fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#ffffff' }}
                  />
                </div>
              </div>
            </div>

            {/* Selected Line Adjuster */}
            <div className="control-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="control-title">Line Tuning</span>
                {selectedLineIndex !== null && (
                  <span className="pill-badge pill-badge-blue">Line #{selectedLineIndex + 1}</span>
                )}
              </div>

              {selectedLineIndex !== null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span>Position Y:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={lines[selectedLineIndex]}
                      onChange={e => handleUpdateLine(selectedLineIndex, parseFloat(e.target.value) || 0)}
                      style={{ width: '70px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.4rem', fontFamily: 'JetBrains Mono', textAlign: 'right' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button onClick={() => handleUpdateLine(selectedLineIndex, lines[selectedLineIndex] - 0.5)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      -0.5mm
                    </button>
                    <button onClick={() => handleUpdateLine(selectedLineIndex, lines[selectedLineIndex] + 0.5)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      +0.5mm
                    </button>
                    <button onClick={() => handleDeleteLine(selectedLineIndex)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} title="Delete line">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                  Click any red line to adjust its position.
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span>Nudge all lines:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => handleShiftAllLines(-0.5)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.45rem' }}>
                    -0.5
                  </button>
                  <button onClick={() => handleShiftAllLines(0.5)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.45rem' }}>
                    +0.5
                  </button>
                </div>
              </div>
            </div>

            {/* Uniform Line Generator */}
            <div className="control-card">
              <button
                onClick={() => setShowSpacingGenerator(!showSpacingGenerator)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}
              >
                <span>Uniform Grid Generator</span>
                <ChevronDown size={14} style={{ transform: showSpacingGenerator ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {showSpacingGenerator && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                    <span>First Line Y:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={genFirstLineY}
                      onChange={e => setGenFirstLineY(parseFloat(e.target.value) || 0)}
                      style={{ width: '60px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.35rem', textAlign: 'right' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                    <span>Spacing (mm):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={genSpacingMm}
                      onChange={e => setGenSpacingMm(parseFloat(e.target.value) || 0)}
                      style={{ width: '60px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.35rem', textAlign: 'right' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                    <span>Line Count:</span>
                    <input
                      type="number"
                      value={genLineCount}
                      onChange={e => setGenLineCount(parseInt(e.target.value) || 0)}
                      style={{ width: '60px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.35rem', textAlign: 'right' }}
                    />
                  </div>
                  <button onClick={handleGenerateUniform} className="btn btn-secondary btn-sm" style={{ marginTop: '0.25rem', color: 'var(--accent-primary)' }}>
                    Apply Uniform Grid
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div>
            Format: <strong style={{ color: '#ffffff' }}>{paperSize} ({pageWidthMm} &times; {pageHeightMm} mm)</strong> &bull; Writing Width: <strong style={{ color: '#ffffff' }}>{Math.round((rightMarginMm - leftMarginMm) * 10) / 10} mm</strong>
          </div>
          <div>100% Offline Pixel Processing &bull; Calibrated for Sandip University</div>
        </div>

      </div>
    </div>
  );
};
