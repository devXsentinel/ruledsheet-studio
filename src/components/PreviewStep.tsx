import React, { useState, useEffect } from 'react';
import {
  TemplateConfig,
  LayoutResult,
  HandwritingSettings,
  DocumentBlock,
  BlockType,
  TextAlignment
} from '../types';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Printer,
  Sliders,
  Layers,
  Palette,
  Type,
  CheckCircle2,
  Scissors,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  FileText,
  Bookmark,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';

interface Props {
  template: TemplateConfig;
  layout: LayoutResult;
  settings: HandwritingSettings;
  blocks: DocumentBlock[];
  onUpdateSettings: (settings: HandwritingSettings) => void;
  onUpdateBlocks: (blocks: DocumentBlock[]) => void;
  onNext: () => void;
}

export const PreviewStep: React.FC<Props> = ({
  template,
  layout,
  settings,
  blocks,
  onUpdateSettings,
  onUpdateBlocks,
  onNext
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(0.85);
  const [previewMode, setPreviewMode] = useState<'sheet' | 'print'>('sheet');
  const [showGuides, setShowGuides] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'style' | 'content'>('style');
  const [mobileView, setMobileView] = useState<'paper' | 'controls'>('paper');

  // Auto-fit zoom on mobile viewports so A4 sheet fits horizontally without awkward side-scrolling
  useEffect(() => {
    const handleAutoZoom = () => {
      if (window.innerWidth < 768) {
        const availableWidth = Math.max(260, window.innerWidth - 24);
        const fitZoom = Math.min(0.85, Math.max(0.35, Math.round((availableWidth / 680) * 100) / 100));
        setZoom(fitZoom);
      }
    };
    handleAutoZoom();
    window.addEventListener('resize', handleAutoZoom);
    return () => window.removeEventListener('resize', handleAutoZoom);
  }, []);

  const handleFitWidth = () => {
    const availableWidth = window.innerWidth < 768
      ? Math.max(260, window.innerWidth - 24)
      : Math.max(400, window.innerWidth - 420);
    const fitZoom = Math.min(1.2, Math.max(0.35, Math.round((availableWidth / 680) * 100) / 100));
    setZoom(fitZoom);
  };

  const totalPages = Math.max(1, layout.totalPageCount);
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const pageData = layout.pages[safeCurrentPage] || { lines: [] };

  // Page dimensions
  const pageWidthMm = template.pageWidthMm;
  const pageHeightMm = template.pageHeightMm;
  const aspectRatio = pageHeightMm / pageWidthMm;

  const toYPercent = (mm: number) => `${(mm / pageHeightMm) * 100}%`;
  const toXPercent = (mm: number) => `${(mm / pageWidthMm) * 100}%`;

  // Find currently selected block
  const selectedBlockIndex = blocks.findIndex(b => b.id === selectedBlockId);
  const selectedBlock = selectedBlockIndex !== -1 ? blocks[selectedBlockIndex] : null;

  // Find which page the selected block begins on
  const selectedBlockStartPage = selectedBlockId
    ? layout.pages.findIndex(p => p.lines.some(l => l.blockId === selectedBlockId))
    : -1;

  // Helper to update a block
  const handleUpdateBlock = (blockId: string, updates: Partial<DocumentBlock>) => {
    const updated = blocks.map(b => (b.id === blockId ? { ...b, ...updates } : b));
    onUpdateBlocks(updated);
  };

  // Toggle Page Break Before
  const handleTogglePageBreak = (blockId: string) => {
    const target = blocks.find(b => b.id === blockId);
    if (!target) return;
    const newPageBreak = !target.pageBreakBefore;
    const updated = blocks.map(b => (b.id === blockId ? { ...b, pageBreakBefore: newPageBreak } : b));
    onUpdateBlocks(updated);

    // If moving to next page, auto-adjust viewing page so user sees the change
    if (newPageBreak && safeCurrentPage < totalPages) {
      setTimeout(() => {
        setCurrentPage(p => Math.min(totalPages, p + 1));
      }, 50);
    }
  };

  // Set Alignment
  const handleSetAlignment = (blockId: string, alignment: TextAlignment) => {
    handleUpdateBlock(blockId, { alignment });
  };

  // Adjust Indentation
  const handleAdjustIndent = (blockId: string, deltaMm: number) => {
    const target = blocks.find(b => b.id === blockId);
    if (!target) return;
    const current = target.indentMm || 0;
    const next = Math.max(0, Math.min(60, current + deltaMm));
    handleUpdateBlock(blockId, { indentMm: next });
  };

  // Adjust font size for selected block only (Word-style per-line formatting)
  const handleAdjustBlockFontSize = (blockId: string, deltaPt: number) => {
    const target = blocks.find(b => b.id === blockId);
    if (!target) return;
    const current = target.fontSizePt || settings.fontSizePt;
    const next = Math.max(9, Math.min(26, Math.round((current + deltaPt) * 2) / 2));
    handleUpdateBlock(blockId, { fontSizePt: next });
  };

  const handleSetBlockFontSize = (blockId: string, fontSizePt: number | undefined) => {
    handleUpdateBlock(blockId, { fontSizePt });
  };

  // Split block at cursor into a new independent block
  const handleSplitBlock = (blockId: string) => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const target = blocks[idx];
    const textarea = document.getElementById(`textarea_${blockId}`) as HTMLTextAreaElement | null;
    let pos = textarea ? textarea.selectionStart : target.text.length;
    if (pos === undefined || pos < 0 || pos > target.text.length) {
      pos = target.text.length;
    }

    const textBefore = target.text.slice(0, pos).trimEnd();
    const textAfter = target.text.slice(pos).trimStart();

    const newId = `block_${Date.now()}`;
    const newBlock: DocumentBlock = {
      id: newId,
      type: target.type === 'question' ? 'answer' : target.type,
      text: textAfter || 'New line text...',
      indentMm: target.indentMm,
      fontSizePt: target.fontSizePt,
      alignment: target.alignment
    };

    const copy = [...blocks];
    copy[idx] = { ...target, text: textBefore || ' ' };
    copy.splice(idx + 1, 0, newBlock);
    onUpdateBlocks(copy);
    setSelectedBlockId(newId);
  };

  // Adjust Line Gap before block
  const handleAdjustGap = (blockId: string, delta: number) => {
    const target = blocks.find(b => b.id === blockId);
    if (!target) return;
    const current =
      target.emptyLinesBefore !== undefined
        ? target.emptyLinesBefore
        : target.type === 'question'
        ? 1
        : 0;
    const next = Math.max(0, Math.min(6, current + delta));
    handleUpdateBlock(blockId, { emptyLinesBefore: next });
  };

  // Change Block Type
  const handleSetBlockType = (blockId: string, type: BlockType) => {
    handleUpdateBlock(blockId, { type });
  };

  // Reorder Block
  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    if (direction === 'up' && idx > 0) {
      const copy = [...blocks];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      onUpdateBlocks(copy);
    } else if (direction === 'down' && idx < blocks.length - 1) {
      const copy = [...blocks];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      onUpdateBlocks(copy);
    }
  };

  // Insert New Block Below
  const handleInsertBlockBelow = (afterBlockId: string, type: BlockType = 'question') => {
    const idx = blocks.findIndex(b => b.id === afterBlockId);
    const newId = `block_${Date.now()}`;
    const newBlock: DocumentBlock = {
      id: newId,
      type,
      text:
        type === 'question'
          ? 'Q. New Question text here...'
          : type === 'heading'
          ? 'NEW TOPIC / SECTION TITLE'
          : 'Ans. Enter answer text here...',
      indentMm: 0,
      alignment: type === 'heading' ? 'center' : 'left'
    };
    const copy = [...blocks];
    if (idx !== -1) {
      copy.splice(idx + 1, 0, newBlock);
    } else {
      copy.push(newBlock);
    }
    onUpdateBlocks(copy);
    setSelectedBlockId(newId);
    setActiveTab('content');
  };

  // Delete Block
  const handleDeleteBlock = (blockId: string) => {
    const copy = blocks.filter(b => b.id !== blockId);
    onUpdateBlocks(copy);
    setSelectedBlockId(null);
  };

  // Apply Margin Prefix (Q.1, Ans. on left of index line)
  const handleApplyMarginPrefix = (blockId: string, prefixText: string) => {
    const target = blocks.find(b => b.id === blockId);
    if (!target) return;
    const clean = target.text.replace(/^(Q\.?\s*\d*[:.]?\s*|Ans\.?[:.]?\s*|Topic[:.]?\s*|Section\s*[A-Z][:.]?\s*)/i, '').trim();
    const newType: BlockType = prefixText.startsWith('Q')
      ? 'question'
      : prefixText.startsWith('Ans')
      ? 'answer'
      : target.type;
    handleUpdateBlock(blockId, {
      marginPrefix: prefixText || undefined,
      text: clean,
      type: newType
    });
  };

  return (
    <div className={`studio-layout animate-in mobile-view-${mobileView}`}>
      
      {/* Mobile Segmented View Mode Switcher (Visible only on screens <= 768px) */}
      <div className="mobile-view-bar" role="tablist" aria-label="Mobile View Mode">
        <button
          onClick={() => setMobileView('paper')}
          className={`mobile-view-btn ${mobileView === 'paper' ? 'active' : ''}`}
          role="tab"
          aria-selected={mobileView === 'paper'}
        >
          <Eye size={15} />
          <span>Paper View</span>
        </button>
        <button
          onClick={() => setMobileView('controls')}
          className={`mobile-view-btn ${mobileView === 'controls' ? 'active' : ''}`}
          role="tab"
          aria-selected={mobileView === 'controls'}
        >
          <Sliders size={15} />
          <span>Controls & Text ({blocks.length})</span>
        </button>
      </div>

      {/* Left Sidebar: Studio Controls & Text/Orientation Inspector */}
      <aside className={`studio-sidebar ${mobileView === 'controls' ? 'mobile-active' : ''}`}>
        
        {/* Mobile-only header to return to paper view */}
        <div className="mobile-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
            <Sliders size={15} color="var(--accent-primary)" />
            <span>Style & Text Controls</span>
          </div>
          <button
            onClick={() => setMobileView('paper')}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', gap: '0.35rem' }}
          >
            <Eye size={13} />
            View Paper
          </button>
        </div>
        
        {/* Dual Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel-subtle)' }}>
          <button
            onClick={() => setActiveTab('style')}
            style={{
              padding: '0.85rem 0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: activeTab === 'style' ? '#ffffff' : 'var(--text-muted)',
              background: activeTab === 'style' ? 'var(--bg-panel)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'style' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={14} color={activeTab === 'style' ? 'var(--accent-primary)' : 'currentColor'} />
            Handwriting Style
          </button>

          <button
            onClick={() => setActiveTab('content')}
            style={{
              padding: '0.85rem 0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: activeTab === 'content' ? '#ffffff' : 'var(--text-muted)',
              background: activeTab === 'content' ? 'var(--bg-panel)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'content' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
          >
            <Type size={14} color={activeTab === 'content' ? 'var(--accent-primary)' : 'currentColor'} />
            Text &amp; Orientation
            {selectedBlock && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  boxShadow: '0 0 6px var(--accent-primary)'
                }}
              />
            )}
          </button>
        </div>

        {/* Tab 1: Handwriting Style Controls */}
        {activeTab === 'style' && (
          <div className="sidebar-content custom-scrollbar">
            
            {/* Handwriting Font Style */}
            <div className="control-card">
              <div className="control-card-header">
                <span className="control-title">
                  <Type size={14} color="var(--accent-primary)" />
                  Handwriting Font
                </span>
              </div>

              <div className="font-choice-grid" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {[
                  { id: 'Bad Script', label: 'Bad Script', desc: 'Authentic student cursive with ink pen', badge: '⭐ Most Realistic', defaultPt: 14.0 },
                  { id: 'Mynerve', label: 'Mynerve', desc: 'Organic student notes with natural loops & wobbly pen strokes', badge: '⭐ Real Notes', defaultPt: 14.5 },
                  { id: 'Covered By Your Grace', label: 'Covered By Your Grace', desc: 'Student homework ballpoint pen style', badge: 'Ballpoint', defaultPt: 15.5 },
                  { id: 'Reenie Beanie', label: 'Reenie Beanie', desc: 'Fast scribbled study notes with thin pen', badge: 'Fine Liner', defaultPt: 17.5 },
                  { id: 'Dawning of a New Day', label: 'Dawning of a New Day', desc: 'Fluid, elegant connected cursive notes', badge: 'Cursive', defaultPt: 16.5 },
                  { id: 'Shadows Into Light', label: 'Shadows Into Light', desc: 'Clean, modern student gel pen writing', badge: 'Gel Pen', defaultPt: 14.0 },
                  { id: 'Homemade Apple', label: 'Homemade Apple', desc: 'Traditional connected fountain pen flow', badge: 'Fountain', defaultPt: 12.5 },
                  { id: 'Caveat', label: 'Caveat', desc: 'Expressive casual cursive strokes', badge: 'Cursive', defaultPt: 14.5 },
                  { id: 'Patrick Hand', label: 'Patrick Hand', desc: 'Neat, structured printed handwriting', badge: 'Print', defaultPt: 14.5 },
                  { id: 'Kalam', label: 'Kalam', desc: 'Indian academic style with familiar flair', badge: 'Academic', defaultPt: 14.0 }
                ].map(f => {
                  const isSelected = settings.fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => onUpdateSettings({ ...settings, fontFamily: f.id as any, fontSizePt: f.defaultPt })}
                      className={`font-choice-card ${isSelected ? 'selected' : ''}`}
                      style={{ padding: '0.65rem 0.85rem' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span className="font-name-label" style={{ fontFamily: `"${f.id}", cursive, sans-serif`, fontSize: '1.05rem', color: isSelected ? 'var(--accent-primary)' : '#ffffff' }}>
                            {f.label}
                          </span>
                          <span style={{ fontSize: '0.625rem', padding: '1px 6px', borderRadius: '4px', background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)', color: isSelected ? '#60a5fa' : 'var(--text-muted)', fontWeight: 600 }}>
                            {f.badge}
                          </span>
                        </div>
                        <div className="font-desc-label" style={{ fontSize: '0.6875rem' }}>{f.desc}</div>
                      </div>
                      {isSelected && <CheckCircle2 size={16} color="var(--accent-primary)" style={{ marginLeft: '0.5rem', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="control-card">
              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">Font Size:</span>
                  <span className="slider-val-badge">{settings.fontSizePt} pt</span>
                </div>
                <input
                  type="range"
                  min="11"
                  max="18"
                  step="0.5"
                  value={settings.fontSizePt}
                  onChange={e => onUpdateSettings({ ...settings, fontSizePt: parseFloat(e.target.value) })}
                  className="slider-input"
                />
                <div className="slider-hints">
                  <span>11 pt (Compact)</span>
                  <span>14.5 pt (Standard)</span>
                  <span>18 pt (Large)</span>
                </div>
              </div>
            </div>

            {/* Baseline Offset Slider */}
            <div className="control-card" style={{ background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.25)' }}>
              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label" style={{ color: '#c4b5fd' }}>Text Baseline Offset:</span>
                  <span className="slider-val-badge" style={{ color: '#a78bfa', background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                    {settings.baselineOffsetMm > 0 ? `+${settings.baselineOffsetMm}mm` : `${settings.baselineOffsetMm}mm`}
                  </span>
                </div>
                <p style={{ fontSize: '0.6875rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  Fine-tune vertical text alignment. 0.0mm aligns the font baseline exactly onto the physical ruled lines.
                </p>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.1"
                  value={settings.baselineOffsetMm}
                  onChange={e => onUpdateSettings({ ...settings, baselineOffsetMm: parseFloat(e.target.value) })}
                  className="slider-input"
                />
                <div className="slider-hints" style={{ color: '#94a3b8' }}>
                  <span>-2.0 mm (Higher)</span>
                  <span style={{ color: '#a78bfa', fontWeight: 700 }}>0.0 mm (On Line)</span>
                  <span>+2.0 mm (Lower)</span>
                </div>
              </div>
            </div>

            {/* Right Writing Limit / Line Fill Slider */}
            <div className="control-card" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label" style={{ color: '#6ee7b7' }}>Line Fill Limit (Right Margin):</span>
                  <span className="slider-val-badge" style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    {settings.rightMarginMm ?? 201.0} mm
                  </span>
                </div>
                <p style={{ fontSize: '0.6875rem', color: '#cbd5e1', lineHeight: 1.35, marginBottom: '0.4rem' }}>
                  Ruled lines extend to 204.7mm. 201mm fully utilizes the blank space across the ruled lines.
                </p>
                <input
                  type="range"
                  min="165.0"
                  max="204.0"
                  step="1.0"
                  value={settings.rightMarginMm ?? 201.0}
                  onChange={e => onUpdateSettings({ ...settings, rightMarginMm: parseFloat(e.target.value) })}
                  className="slider-input"
                />
                <div className="slider-hints" style={{ color: '#94a3b8' }}>
                  <span>165 mm</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>201 mm (Full Ruled Line)</span>
                  <span>204 mm (Max Edge)</span>
                </div>
              </div>
            </div>

            {/* Smart Q&A Colours */}
            <div className="control-card">
              <div className="toggle-switch-row">
                <div className="switch-label-group">
                  <span className="switch-main-label">Smart Q&amp;A Colours</span>
                  <span className="switch-sub-label">Questions black &bull; Answers blue</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.smartQaColors}
                    onChange={e => onUpdateSettings({ ...settings, smartQaColors: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {settings.smartQaColors && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Questions:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="color"
                        value={settings.questionColor}
                        onChange={e => onUpdateSettings({ ...settings, questionColor: e.target.value })}
                        style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#ffffff' }}>Black</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Answers:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="color"
                        value={settings.answerColor}
                        onChange={e => onUpdateSettings({ ...settings, answerColor: e.target.value })}
                        style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#60a5fa' }}>Blue</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Q & Ans in Margin Column Toggle */}
            <div className="control-card" style={{ background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.25)' }}>
              <div className="toggle-switch-row">
                <div className="switch-label-group">
                  <span className="switch-main-label" style={{ color: '#93c5fd' }}>Q &amp; Ans in Left Margin</span>
                  <span className="switch-sub-label">Place Q.1, Q.2, Ans. to the left of the vertical index line</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.placePrefixInMargin}
                    onChange={e => onUpdateSettings({ ...settings, placePrefixInMargin: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {settings.placePrefixInMargin && (
                <div className="slider-group" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div className="slider-header">
                    <span className="slider-label" style={{ color: '#c4b5fd' }}>Prefix Distance to Index Line:</span>
                    <span className="slider-val-badge" style={{ color: '#a78bfa', background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                      {settings.marginPrefixXMm ?? 19.5} mm
                    </span>
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: '#cbd5e1', lineHeight: 1.35, marginBottom: '0.4rem' }}>
                    Adjusts how close Q.1 and Ans. sit to the double index line at 29.1mm.
                  </p>
                  <input
                    type="range"
                    min="14.0"
                    max="22.5"
                    step="0.5"
                    value={settings.marginPrefixXMm ?? 19.5}
                    onChange={e => onUpdateSettings({ ...settings, marginPrefixXMm: parseFloat(e.target.value) })}
                    className="slider-input"
                  />
                  <div className="slider-hints" style={{ color: '#94a3b8' }}>
                    <span>14 mm (Spacious)</span>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>19.5 mm (Close &bull; Standard)</span>
                    <span>22.5 mm (Flush)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Organic Jitter */}
            <div className="control-card">
              <div className="toggle-switch-row">
                <div className="switch-label-group">
                  <span className="switch-main-label">Organic Jitter</span>
                  <span className="switch-sub-label">Subtle baseline variation</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.naturalVariation}
                    onChange={e => onUpdateSettings({ ...settings, naturalVariation: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {/* Advance to Export CTA */}
            <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              <button onClick={onNext} className="btn btn-primary" style={{ width: '100%' }}>
                <span>Proceed to PDF Export</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Text Editing & Orientation Inspector */}
        {activeTab === 'content' && (
          <div className="sidebar-content custom-scrollbar">

            {selectedBlock ? (
              <>
                {/* Selected Block Info Header */}
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="pill-badge pill-badge-blue" style={{ textTransform: 'capitalize' }}>
                      {selectedBlock.type} #{selectedBlockIndex + 1}
                    </span>
                    {selectedBlockStartPage !== -1 && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        Starts on Pg {selectedBlockStartPage + 1}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedBlockId(null)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)' }}
                    title="Deselect block"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* 1. Page Break Feature: Move Question/Topic to Next Page */}
                <div className="control-card" style={{ borderColor: selectedBlock.pageBreakBefore ? '#3b82f6' : 'var(--border-subtle)', background: selectedBlock.pageBreakBefore ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Scissors size={14} color={selectedBlock.pageBreakBefore ? '#60a5fa' : 'var(--accent-primary)'} />
                        Move to Next Page (Page Break)
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                        Forces this question or topic to start fresh at the top of the next sheet.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTogglePageBreak(selectedBlock.id)}
                    className={`btn ${selectedBlock.pageBreakBefore ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Scissors size={14} />
                    {selectedBlock.pageBreakBefore ? 'Page Break Active (Starts on New Page)' : 'Move this to Next Page'}
                  </button>
                </div>

                {/* 2. Text Alignment & Orientation */}
                <div className="control-card">
                  <div className="control-card-header">
                    <span className="control-title">
                      <AlignCenter size={14} color="var(--accent-primary)" />
                      Text Orientation &amp; Alignment
                    </span>
                  </div>

                  {/* Horizontal Alignment */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Horizontal Alignment:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
                      {[
                        { id: 'left', label: 'Left', icon: AlignLeft },
                        { id: 'center', label: 'Center', icon: AlignCenter },
                        { id: 'right', label: 'Right', icon: AlignRight }
                      ].map(align => {
                        const isCurrent = (selectedBlock.alignment || 'left') === align.id;
                        const Icon = align.icon;
                        return (
                          <button
                            key={align.id}
                            onClick={() => handleSetAlignment(selectedBlock.id, align.id as TextAlignment)}
                            className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            style={{ justifyContent: 'center', gap: '0.35rem', padding: '0.4rem 0.25rem' }}
                          >
                            <Icon size={13} />
                            <span>{align.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      {(selectedBlock.alignment || 'left') === 'center'
                        ? 'Centered: Ideal for Topic headings and Assignment titles'
                        : (selectedBlock.alignment || 'left') === 'right'
                        ? 'Right: Useful for dates, roll number, or signature'
                        : 'Left: Standard margin alignment for questions & answers'}
                    </div>
                  </div>

                  {/* Left Indentation Control */}
                  <div style={{ marginBottom: '0.85rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Left Margin Indentation:
                      </span>
                      <span className="slider-val-badge">
                        +{selectedBlock.indentMm || 0} mm
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleAdjustIndent(selectedBlock.id, -5)}
                        disabled={(selectedBlock.indentMm || 0) <= 0}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        - 5 mm
                      </button>
                      <button
                        onClick={() => handleUpdateBlock(selectedBlock.id, { indentMm: 0 })}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.5rem' }}
                        title="Reset to 0mm"
                      >
                        0mm
                      </button>
                      <button
                        onClick={() => handleAdjustIndent(selectedBlock.id, 5)}
                        disabled={(selectedBlock.indentMm || 0) >= 60}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        + 5 mm
                      </button>
                    </div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Indent sub-points (a), (b), bullet items, or equations.
                    </div>
                  </div>

                  {/* Ruled Line Gaps Before Block */}
                  <div style={{ paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Ruled Line Spacing Before:
                      </span>
                      <span className="slider-val-badge">
                        {selectedBlock.emptyLinesBefore !== undefined
                          ? selectedBlock.emptyLinesBefore
                          : selectedBlock.type === 'question'
                          ? 1
                          : 0}{' '}
                        line(s)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleAdjustGap(selectedBlock.id, -1)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        - 1 Line
                      </button>
                      <button
                        onClick={() => handleAdjustGap(selectedBlock.id, 1)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        + 1 Line
                      </button>
                    </div>
                  </div>

                </div>

                {/* Margin Label Inspector (Left of Index Line) */}
                <div className="control-card">
                  <div className="control-card-header">
                    <span className="control-title">
                      <Bookmark size={14} color="var(--accent-primary)" />
                      Margin Label (Left of Index Line)
                    </span>
                    <span className="pill-badge pill-badge-blue" style={{ fontSize: '0.625rem' }}>
                      Index Column
                    </span>
                  </div>

                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.35 }}>
                    Placed in the margin column to the left of the double vertical index line.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={selectedBlock.marginPrefix || ''}
                      onChange={e => handleUpdateBlock(selectedBlock.id, { marginPrefix: e.target.value || undefined })}
                      placeholder="e.g. Q.1, Ans., 1., (a)"
                      style={{
                        flex: 1,
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        color: '#ffffff',
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono'
                      }}
                    />
                    <button
                      onClick={() => handleUpdateBlock(selectedBlock.id, { marginPrefix: undefined })}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.45rem 0.6rem', color: 'var(--text-muted)' }}
                      title="Clear margin label"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Preset quick buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Presets:</span>
                    {['Q.1', 'Q.2', 'Q.3', 'Q.4', 'Ans.', '1.', '2.', '(a)', '(b)'].map(p => (
                      <button
                        key={p}
                        onClick={() => handleApplyMarginPrefix(selectedBlock.id, p)}
                        className={`btn ${selectedBlock.marginPrefix === p ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.6875rem' }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Word-Style Per-Line Font Size Control */}
                <div className="control-card" style={{ background: selectedBlock.fontSizePt ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)', borderColor: selectedBlock.fontSizePt ? '#3b82f6' : 'var(--border-subtle)' }}>
                  <div className="control-card-header">
                    <span className="control-title">
                      <Type size={14} color="var(--accent-primary)" />
                      Selected Line Font Size
                    </span>
                    <span className="pill-badge pill-badge-blue" style={{ fontSize: '0.625rem', background: selectedBlock.fontSizePt ? '#2563eb' : 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>
                      {selectedBlock.fontSizePt ? `${selectedBlock.fontSizePt} pt (Custom)` : `${settings.fontSizePt} pt (Default)`}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.6rem', lineHeight: 1.35 }}>
                    Adjust font size of <strong>only this line</strong>, just like in Microsoft Word.
                  </p>

                  <div className="slider-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <button
                        onClick={() => handleAdjustBlockFontSize(selectedBlock.id, -1)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.5rem', fontWeight: 800 }}
                        title="Decrease -1pt"
                      >
                        - 1 pt
                      </button>
                      <input
                        type="range"
                        min="10"
                        max="24"
                        step="0.5"
                        value={selectedBlock.fontSizePt || settings.fontSizePt}
                        onChange={e => handleSetBlockFontSize(selectedBlock.id, parseFloat(e.target.value))}
                        className="slider-input"
                        style={{ flex: 1 }}
                      />
                      <button
                        onClick={() => handleAdjustBlockFontSize(selectedBlock.id, 1)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.5rem', fontWeight: 800 }}
                        title="Increase +1pt"
                      >
                        + 1 pt
                      </button>
                    </div>

                    {/* Presets */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Presets:</span>
                      {[11, 12.5, 14, 16, 18, 20].map(pt => (
                        <button
                          key={pt}
                          onClick={() => handleSetBlockFontSize(selectedBlock.id, pt)}
                          className={`btn ${(selectedBlock.fontSizePt || settings.fontSizePt) === pt ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.6875rem' }}
                        >
                          {pt}pt
                        </button>
                      ))}
                      {selectedBlock.fontSizePt && (
                        <button
                          onClick={() => handleSetBlockFontSize(selectedBlock.id, undefined)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.15rem 0.35rem', fontSize: '0.6875rem', color: '#60a5fa' }}
                          title="Reset to document default"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Live In-Preview Text Content Editor */}
                <div className="control-card">
                  <div className="control-card-header">
                    <span className="control-title">
                      <FileText size={14} color="var(--accent-primary)" />
                      Body Text (Right of Index Line)
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {selectedBlock.text.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>

                  {/* Textarea with Enter support and Split */}
                  <textarea
                    id={`textarea_${selectedBlock.id}`}
                    value={selectedBlock.text}
                    onChange={e => handleUpdateBlock(selectedBlock.id, { text: e.target.value })}
                    rows={4}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      padding: '0.6rem',
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                    placeholder="Type text here... (Press Enter to move text to a new line)"
                  />

                  {/* Enter Tip & Split Action */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.35rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                      Press <strong>Enter</strong> to start a new line on the sheet
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSplitBlock(selectedBlock.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.6875rem', padding: '0.15rem 0.45rem', whiteSpace: 'nowrap' }}
                      title="Split text at cursor into a new independent line with its own font size"
                    >
                      Split to New Line
                    </button>
                  </div>

                  {/* Block Type Switcher */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginTop: '0.6rem' }}>
                    <button
                      onClick={() => handleSetBlockType(selectedBlock.id, 'question')}
                      className={`btn ${selectedBlock.type === 'question' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ fontSize: '0.6875rem', justifyContent: 'center' }}
                    >
                      ❓ Question (Black)
                    </button>
                    <button
                      onClick={() => handleSetBlockType(selectedBlock.id, 'answer')}
                      className={`btn ${selectedBlock.type === 'answer' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ fontSize: '0.6875rem', justifyContent: 'center' }}
                    >
                      📝 Answer (Blue)
                    </button>
                    <button
                      onClick={() => {
                        handleSetBlockType(selectedBlock.id, 'heading');
                        handleSetAlignment(selectedBlock.id, 'center');
                      }}
                      className={`btn ${selectedBlock.type === 'heading' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ fontSize: '0.6875rem', justifyContent: 'center' }}
                    >
                      🏷️ Topic Heading
                    </button>
                    <button
                      onClick={() => handleSetBlockType(selectedBlock.id, 'normal')}
                      className={`btn ${selectedBlock.type === 'normal' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ fontSize: '0.6875rem', justifyContent: 'center' }}
                    >
                      📄 Normal Text
                    </button>
                  </div>
                </div>

                {/* 4. Block Actions: Reorder, Insert, Delete */}
                <div className="control-card">
                  <div className="control-card-header">
                    <span className="control-title">
                      <Sparkles size={14} color="var(--accent-primary)" />
                      Block Management
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <button
                      onClick={() => handleMoveBlock(selectedBlock.id, 'up')}
                      disabled={selectedBlockIndex === 0}
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <ArrowUp size={13} />
                      Move Up
                    </button>
                    <button
                      onClick={() => handleMoveBlock(selectedBlock.id, 'down')}
                      disabled={selectedBlockIndex === blocks.length - 1}
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <ArrowDown size={13} />
                      Move Down
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <button
                      onClick={() => handleInsertBlockBelow(selectedBlock.id, 'question')}
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: 'center', gap: '0.3rem', fontSize: '0.6875rem' }}
                    >
                      <Plus size={12} />
                      + New Question
                    </button>
                    <button
                      onClick={() => handleInsertBlockBelow(selectedBlock.id, 'answer')}
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: 'center', gap: '0.3rem', fontSize: '0.6875rem' }}
                    >
                      <Plus size={12} />
                      + New Answer
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteBlock(selectedBlock.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'center', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', marginTop: '0.25rem' }}
                  >
                    <Trash2 size={13} />
                    Delete this Block
                  </button>
                </div>
              </>
            ) : (
              /* No Block Selected State: Guide & Topic Outline */
              <div>
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px dashed var(--accent-primary)', borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                  <Bookmark size={20} color="var(--accent-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
                    Click Any Line on Paper to Edit
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                    Click any question or answer on the ruled page to edit its text, adjust alignment, set indentation, or move it to a new page.
                  </p>
                  <button
                    onClick={() => handleInsertBlockBelow(blocks[blocks.length - 1]?.id || '', 'question')}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}
                  >
                    <Plus size={13} />
                    <span>+ Add New Question or Topic</span>
                  </button>
                </div>
              </div>
            )}

            {/* Document Topics & Questions Outline */}
            <div className="control-card">
              <div className="control-card-header">
                <span className="control-title">
                  <Bookmark size={14} color="var(--accent-primary)" />
                  Document Topics &amp; Questions
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  {blocks.length} items
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '280px', overflowY: 'auto' }} className="custom-scrollbar">
                {blocks.map((b, idx) => {
                  const isSelected = b.id === selectedBlockId;
                  const blockPage = layout.pages.findIndex(p => p.lines.some(l => l.blockId === b.id));

                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBlockId(b.id);
                        if (blockPage !== -1) setCurrentPage(blockPage);
                      }}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.18)' : 'var(--bg-input)',
                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.625rem', fontWeight: 800, color: b.type === 'question' ? '#ffffff' : b.type === 'heading' ? '#c084fc' : '#60a5fa' }}>
                            #{idx + 1} {b.type.toUpperCase()}
                          </span>
                          {b.marginPrefix && (
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: b.type === 'question' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(37, 99, 235, 0.35)', color: b.type === 'question' ? '#fff' : '#93c5fd', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                              {b.marginPrefix}
                            </span>
                          )}
                          {b.pageBreakBefore && (
                            <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: '#3b82f6', color: '#fff', fontWeight: 700 }}>
                              Page Break
                            </span>
                          )}
                          {b.alignment === 'center' && (
                            <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: '#8b5cf6', color: '#fff', fontWeight: 700 }}>
                              Center
                            </span>
                          )}
                        </div>
                        {blockPage !== -1 && (
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                            Pg {blockPage + 1}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: isSelected ? '#ffffff' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </aside>

      {/* Center Canvas Viewport */}
      <main className="studio-canvas-viewport custom-scrollbar">
        
        {/* Floating Top Pill Toolbar */}
        <div className="canvas-floating-toolbar">
          
          {/* Mode Switcher */}
          <div className="toolbar-group">
            <button
              onClick={() => setPreviewMode('sheet')}
              className={`toolbar-btn ${previewMode === 'sheet' ? 'active' : ''}`}
            >
              <Eye size={14} />
              Sheet Preview
            </button>
            <button
              onClick={() => setPreviewMode('print')}
              className={`toolbar-btn ${previewMode === 'print' ? 'active' : ''}`}
            >
              <Printer size={14} />
              Print-Ready (Blank Page)
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Quick Inspector Toggle Button */}
          <button
            onClick={() => setActiveTab(activeTab === 'content' ? 'style' : 'content')}
            className={`toolbar-btn ${activeTab === 'content' ? 'active' : ''}`}
          >
            <Type size={14} />
            {activeTab === 'content' ? 'Close Text Inspector' : 'Text & Orientation Inspector'}
          </button>

          <div className="toolbar-divider" />

          {/* Guides Toggle */}
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`toolbar-btn ${showGuides ? 'active' : ''}`}
          >
            <Layers size={14} />
            <span>{showGuides ? 'Hide Rules' : 'Show Rules'}</span>
          </button>

          {/* Mobile Switch to Controls */}
          <button
            onClick={() => setMobileView('controls')}
            className="toolbar-btn show-on-mobile"
            title="Open Style & Text Controls"
          >
            <Sliders size={14} color="var(--accent-primary)" />
            <span>Controls</span>
          </button>

          <div className="toolbar-divider" />

          {/* Page Navigator */}
          <div className="toolbar-group">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={safeCurrentPage === 0}
              className="toolbar-btn"
              style={{ opacity: safeCurrentPage === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#ffffff', padding: '0 0.35rem' }}>
              {safeCurrentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safeCurrentPage >= totalPages - 1}
              className="toolbar-btn"
              style={{ opacity: safeCurrentPage >= totalPages - 1 ? 0.4 : 1 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Zoom Controls */}
          <div className="toolbar-group">
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="toolbar-btn" title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)', padding: '0 0.25rem' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.min(1.8, z + 0.1))} className="toolbar-btn" title="Zoom In">
              <ZoomIn size={14} />
            </button>
            <button onClick={handleFitWidth} className="toolbar-btn" title="Fit to Screen Width">
              <Maximize2 size={13} />
              <span className="hide-on-mobile" style={{ fontSize: '0.6875rem' }}>Fit</span>
            </button>
          </div>

        </div>

        {/* The Paper Sheet Container */}
        <div className="paper-container">
          <div
            className={`paper-sheet ${previewMode === 'print' ? 'print-mode' : ''}`}
            style={{
              width: '680px',
              height: `${Math.round(680 * aspectRatio)}px`,
              transform: `scale(${zoom})`
            }}
          >
            {/* Layer 1: Background Template Sheet (if Sheet Preview mode) */}
            {previewMode === 'sheet' && (
              <img
                src={template.imageUrl}
                alt="Template Sheet"
                className="paper-bg-image"
              />
            )}

            {/* Layer 2: Visual Alignment Rules (when toggled) */}
            {showGuides && (
              <svg className="paper-svg-guides">
                {/* Margin label position guide (near index line) */}
                <line
                  x1={toXPercent(settings.marginPrefixXMm || template.writingArea.marginLabelXMm || 19.5)}
                  y1="0"
                  x2={toXPercent(settings.marginPrefixXMm || template.writingArea.marginLabelXMm || 19.5)}
                  y2="100%"
                  stroke="#3b82f6"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                {/* Index line guide */}
                <line
                  x1={toXPercent(template.writingArea.indexLineXMm || 29.13)}
                  y1="0"
                  x2={toXPercent(template.writingArea.indexLineXMm || 29.13)}
                  y2="100%"
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                />
                {/* Left writing margin */}
                <line
                  x1={toXPercent(template.writingArea.leftMarginMm)}
                  y1="0"
                  x2={toXPercent(template.writingArea.leftMarginMm)}
                  y2="100%"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                {/* Right writing limit */}
                <line
                  x1={toXPercent(settings.rightMarginMm || template.writingArea.rightMarginMm || 201.0)}
                  y1="0"
                  x2={toXPercent(settings.rightMarginMm || template.writingArea.rightMarginMm || 201.0)}
                  y2="100%"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                {/* Writing rules */}
                {template.linesMm.map((y, idx) => (
                  <line
                    key={idx}
                    x1={toXPercent(template.writingArea.leftMarginMm)}
                    y1={toYPercent(y)}
                    x2={toXPercent(settings.rightMarginMm || template.writingArea.rightMarginMm || 201.0)}
                    y2={toYPercent(y)}
                    stroke="rgba(239, 68, 68, 0.4)"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            )}

            {/* Layer 3: Overlaid Handwriting Text (SVG alphabetic baseline guarantees 1:1 match with PDF) */}
            <svg
              className="paper-text-layer"
              viewBox={`0 0 ${template.pageWidthMm} ${template.pageHeightMm}`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 20,
                pointerEvents: 'auto'
              }}
            >
              {pageData.lines.map((line) => {
                const isSelected = selectedBlockId === line.blockId;
                const fontSizeMm = line.fontSizePt * (25.4 / 72);
                const marginX = line.marginXMm || settings.marginPrefixXMm || template.writingArea.marginLabelXMm || 19.5;
                const highlightLeft = (line.marginPrefix ? marginX : line.xMm) - 1;
                const highlightRight = (settings.rightMarginMm || template.writingArea.rightMarginMm || 201.0) + 1;

                return (
                  <g key={line.id}>
                    {/* Visual selection highlight background */}
                    {isSelected && (
                      <rect
                        x={highlightLeft}
                        y={line.baselineYMm - fontSizeMm * 0.9}
                        width={Math.max(20, highlightRight - highlightLeft)}
                        height={fontSizeMm * 1.25}
                        rx="0.8"
                        fill="rgba(59, 130, 246, 0.18)"
                        stroke="#3b82f6"
                        strokeWidth="0.35"
                        strokeDasharray="1.2 0.8"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}

                    {/* Margin Prefix (e.g. Q.1, Ans. on the left of index line) */}
                    {line.marginPrefix && (
                      <text
                        x={line.marginXMm || settings.marginPrefixXMm || template.writingArea.marginLabelXMm || 19.5}
                        y={line.baselineYMm}
                        fontSize={fontSizeMm}
                        fontFamily={`"${line.fontFamily}", cursive, sans-serif`}
                        fill={line.color}
                        dominantBaseline="alphabetic"
                        textAnchor="start"
                        onClick={() => {
                          setSelectedBlockId(isSelected ? null : line.blockId);
                          setActiveTab('content');
                        }}
                        className={`paper-svg-line ${isSelected ? 'selected' : ''}`}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        <title>{`Margin Label: ${line.marginPrefix}`}</title>
                        {line.marginPrefix}
                      </text>
                    )}

                    {/* Body Text to the right of index line */}
                    {line.text && (
                      <text
                        x={line.xMm}
                        y={line.baselineYMm}
                        fontSize={fontSizeMm}
                        fontFamily={`"${line.fontFamily}", cursive, sans-serif`}
                        fill={line.color}
                        dominantBaseline="alphabetic"
                        textAnchor="start"
                        letterSpacing={line.letterSpacing ? `${line.letterSpacing * (25.4 / 72)}` : undefined}
                        onClick={() => {
                          setSelectedBlockId(isSelected ? null : line.blockId);
                          setActiveTab('content');
                        }}
                        className={`paper-svg-line ${isSelected ? 'selected' : ''}`}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        <title>{`Click to edit: ${line.isQuestion ? 'Question / Topic (Black)' : 'Answer (Blue)'}`}</title>
                        {line.text}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Layer 4: Page Break Badges */}
            {pageData.lines.filter(l => l.hasPageBreakBefore).map(line => (
              <div
                key={`pb_${line.id}`}
                style={{
                  position: 'absolute',
                  left: toXPercent(template.writingArea.leftMarginMm),
                  top: `calc(${toYPercent(line.baselineYMm)} - 22px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '2px 7px',
                  background: 'rgba(59, 130, 246, 0.95)',
                  color: '#ffffff',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  zIndex: 25,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  pointerEvents: 'none'
                }}
              >
                <Scissors size={9} />
                PAGE BREAK
              </div>
            ))}

          </div>
        </div>

        {/* Floating Quick Action Popover when a block is selected */}
        {selectedBlock && (
          <div className="studio-floating-popover">
            <span style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: 600 }}>
              {selectedBlock.marginPrefix ? `[${selectedBlock.marginPrefix}] ` : ''}
              {selectedBlock.type === 'question' ? '❓ Question' : selectedBlock.type === 'heading' ? '🏷️ Topic' : '📝 Answer'}:
            </span>

            {/* Line Font Size Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '0.15rem 0.35rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
              title="Change font size of this selected line (Word-style)"
            >
              <Type size={12} color="var(--accent-primary)" />
              <button
                onClick={() => handleAdjustBlockFontSize(selectedBlock.id, -1)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.1rem 0.35rem', fontSize: '0.75rem', fontWeight: 900, height: '22px' }}
                title="Decrease size (-1pt)"
              >
                -
              </button>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, minWidth: '38px', textAlign: 'center', color: selectedBlock.fontSizePt ? '#60a5fa' : '#ffffff', fontFamily: 'JetBrains Mono' }}>
                {selectedBlock.fontSizePt || settings.fontSizePt}pt
              </span>
              <button
                onClick={() => handleAdjustBlockFontSize(selectedBlock.id, 1)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.1rem 0.35rem', fontSize: '0.75rem', fontWeight: 900, height: '22px' }}
                title="Increase size (+1pt)"
              >
                +
              </button>
            </div>

            {/* 1-Click Page Break Toggle */}
            <button
              onClick={() => handleTogglePageBreak(selectedBlock.id)}
              className={`btn ${selectedBlock.pageBreakBefore ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{ fontSize: '0.6875rem' }}
              title="Force this topic/question to start on a new page"
            >
              <Scissors size={13} />
              {selectedBlock.pageBreakBefore ? 'On New Page' : 'Move to New Page'}
            </button>

            {/* 1-Click Center Toggle */}
            <button
              onClick={() => handleSetAlignment(selectedBlock.id, selectedBlock.alignment === 'center' ? 'left' : 'center')}
              className={`btn ${selectedBlock.alignment === 'center' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{ fontSize: '0.6875rem' }}
              title="Toggle Center Alignment"
            >
              <AlignCenter size={13} />
              {selectedBlock.alignment === 'center' ? 'Centered' : 'Center'}
            </button>

            {/* 1-Click Indent +5mm */}
            <button
              onClick={() => handleAdjustIndent(selectedBlock.id, 5)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.6875rem' }}
              title="Indent right +5mm"
            >
              Indent +5mm
            </button>

            {/* Focus Full Inspector in Sidebar */}
            <button
              onClick={() => {
                setActiveTab('content');
                setMobileView('controls');
                setTimeout(() => {
                  const el = document.getElementById(`textarea_${selectedBlock.id}`);
                  if (el) el.focus();
                }, 100);
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.6875rem', color: 'var(--accent-primary)' }}
              title="Edit text in Sidebar"
            >
              <Type size={13} />
              Edit Text
            </button>

            <button
              onClick={() => setSelectedBlockId(null)}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--text-muted)', padding: '0.2rem 0.4rem' }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        )}

      </main>

    </div>
  );
};
