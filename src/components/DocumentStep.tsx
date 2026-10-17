import React, { useState, useRef } from 'react';
import { DocumentBlock, DocxImportSummary, BlockType } from '../types';
import { parseDocxFile, parsePlainText, SAMPLE_ASSIGNMENT_TEXT } from '../utils/docxParser';
import {
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileCode,
  Edit3
} from 'lucide-react';

interface Props {
  blocks: DocumentBlock[];
  summary: DocxImportSummary | null;
  onUpdateBlocks: (blocks: DocumentBlock[], summary?: DocxImportSummary) => void;
  onNext: () => void;
}

export const DocumentStep: React.FC<Props> = ({
  blocks,
  summary,
  onUpdateBlocks,
  onNext
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await parseDocxFile(file);
      onUpdateBlocks(res.blocks, res.summary);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error parsing Word document.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleLoadSample = () => {
    const sampleBlocks = parsePlainText(SAMPLE_ASSIGNMENT_TEXT);
    const wordCount = sampleBlocks.reduce((acc, b) => acc + b.text.split(/\s+/).filter(Boolean).length, 0);
    const sampleSummary: DocxImportSummary = {
      fileName: 'Assignment_Sample.docx',
      fileSizeBytes: 18450,
      paragraphCount: sampleBlocks.length,
      wordCount,
      questionsDetected: sampleBlocks.filter(b => b.type === 'question' || b.type === 'heading').length,
      answersDetected: sampleBlocks.filter(b => b.type === 'answer').length
    };
    onUpdateBlocks(sampleBlocks, sampleSummary);
    setErrorMsg(null);
  };

  const handleToggleBlockType = (blockId: string) => {
    const updated: DocumentBlock[] = blocks.map(b => {
      if (b.id !== blockId) return b;
      const nextType: BlockType =
        b.type === 'question' ? 'answer' : b.type === 'answer' ? 'normal' : 'question';
      return { ...b, type: nextType };
    });
    onUpdateBlocks(updated, summary || undefined);
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<DocumentBlock>) => {
    const updated = blocks.map(b => b.id === blockId ? { ...b, ...updates } : b);
    onUpdateBlocks(updated, summary || undefined);
  };

  const handleUpdateBlockText = (blockId: string, newText: string) => {
    const updated = blocks.map(b => b.id === blockId ? { ...b, text: newText } : b);
    onUpdateBlocks(updated, summary || undefined);
  };

  const handleDeleteBlock = (blockId: string) => {
    const updated = blocks.filter(b => b.id !== blockId);
    onUpdateBlocks(updated, summary || undefined);
  };

  return (
    <div className="step-container animate-in">
      
      {/* Hero Header */}
      <div className="step-hero-card">
        <span className="pill-badge pill-badge-blue">
          <Sparkles size={13} />
          Step 2 &bull; Document Import
        </span>
        <h1 className="step-hero-title">Import Word (.docx) Document</h1>
        <p className="step-hero-desc">
          Upload your assignment file. The smart classifier automatically distinguishes questions from answers: <strong>Questions in black ink</strong>, <strong>Answers in blue ink</strong>.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? 'var(--shadow-lg)' : 'none'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])}
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <Upload size={28} />
          </div>

          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              {isLoading ? 'Extracting paragraphs & Q&A structure...' : 'Click or Drag & Drop your Word (.docx) file here'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Supports Microsoft Word (.docx) &bull; Processed 100% locally on your computer
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSample();
              }}
              className="btn btn-secondary btn-sm"
              style={{ color: '#60a5fa' }}
            >
              <FileCode size={15} />
              Load Sample Assignment Text
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Extracted Document Blocks List */}
      {blocks.length > 0 && (
        <div className="control-card" style={{ gap: '1.25rem' }}>
          
          {/* Header Stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="#10b981" />
                Document Structure Loaded
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: '0.15rem' }}>
                {summary?.fileName || 'Active Document'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="pill-badge pill-badge-blue">
                {blocks.length} Paragraphs
              </span>
              <span className="pill-badge pill-badge-blue" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                {blocks.filter(b => b.type === 'question' || b.type === 'heading').length} Questions (Black)
              </span>
              <span className="pill-badge pill-badge-blue">
                {blocks.filter(b => b.type === 'answer').length} Answers (Blue)
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Click any badge below to cycle its classification: <strong>Question (Black) &bull; Answer (Blue) &bull; Normal</strong>
          </div>

          {/* Blocks scrollable list */}
          <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.5rem' }}>
            {blocks.map((block, idx) => {
              const isQuestion = block.type === 'question' || block.type === 'heading';
              const isAnswer = block.type === 'answer';
              const isEditing = editingBlockId === block.id;

              return (
                <div
                  key={block.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: isQuestion ? 'rgba(0, 0, 0, 0.4)' : isAnswer ? 'rgba(30, 58, 138, 0.15)' : 'var(--bg-input)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleBlockType(block.id)}
                        className={`pill-badge ${isQuestion ? 'pill-badge-blue' : isAnswer ? 'pill-badge-blue' : 'pill-badge-amber'}`}
                        style={{
                          background: isQuestion ? '#ffffff' : isAnswer ? '#2563eb' : 'rgba(255, 255, 255, 0.1)',
                          color: isQuestion ? '#000000' : '#ffffff',
                          cursor: 'pointer'
                        }}
                        title="Click to toggle type"
                      >
                        {block.type}
                      </button>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        #{idx + 1}
                      </span>
                      {block.marginPrefix && (
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: isQuestion ? 'rgba(255, 255, 255, 0.2)' : 'rgba(37, 99, 235, 0.3)',
                          color: isQuestion ? '#ffffff' : '#93c5fd',
                          fontWeight: 700,
                          fontSize: '0.6875rem',
                          fontFamily: 'JetBrains Mono'
                        }}>
                          Margin Tag: {block.marginPrefix}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => setEditingBlockId(isEditing ? null : block.id)}
                        className="btn btn-ghost btn-sm"
                        title="Edit text"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#f87171' }}
                        title="Delete block"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Margin Tag (Left of Index):</span>
                        <input
                          type="text"
                          value={block.marginPrefix || ''}
                          onChange={(e) => handleUpdateBlock(block.id, { marginPrefix: e.target.value })}
                          placeholder="e.g. Q.1, Ans."
                          style={{
                            width: '120px',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            fontFamily: 'JetBrains Mono'
                          }}
                        />
                      </div>
                      <textarea
                        value={block.text}
                        onChange={(e) => handleUpdateBlockText(block.id, e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.5rem',
                          fontSize: '0.8125rem',
                          color: '#ffffff',
                          outline: 'none'
                        }}
                        placeholder="Body text to right of index..."
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: isQuestion ? '#ffffff' : isAnswer ? '#93c5fd' : 'var(--text-secondary)' }}>
                      {block.marginPrefix && (
                        <span style={{ color: '#60a5fa', fontWeight: 700, marginRight: '0.45rem', fontFamily: 'JetBrains Mono' }}>
                          [{block.marginPrefix}]
                        </span>
                      )}
                      {block.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Continue Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={onNext} className="btn btn-primary btn-lg">
              Proceed to Studio Preview
              <ArrowRight size={18} />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
