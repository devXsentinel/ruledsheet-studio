import React, { useState, useMemo } from 'react';
import {
  TemplateConfig,
  DocumentBlock,
  DocxImportSummary,
  HandwritingSettings,
  LayoutResult
} from './types';
import {
  loadSavedTemplate,
  saveTemplate,
  resetTemplateToDefault
} from './utils/defaultTemplate';
import { parsePlainText, SAMPLE_ASSIGNMENT_TEXT } from './utils/docxParser';
import { computeLayout } from './utils/layoutEngine';

import { StepIndicator, StepId } from './components/StepIndicator';
import { TemplateStep } from './components/TemplateStep';
import { DocumentStep } from './components/DocumentStep';
import { PreviewStep } from './components/PreviewStep';
import { ExportStep } from './components/ExportStep';
import { LineCalibrationModal } from './components/LineCalibrationModal';

import {
  PenTool,
  Sliders,
  Download,
  Eye,
  CheckCircle2
} from 'lucide-react';

export const App: React.FC = () => {
  // 1. Template State (loaded from localStorage or default Sandip sheet)
  const [template, setTemplate] = useState<TemplateConfig>(() => loadSavedTemplate());
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);

  // 2. Document Blocks State (pre-populated with realistic Sandip assignment sample)
  const initialBlocks = useMemo(() => parsePlainText(SAMPLE_ASSIGNMENT_TEXT), []);
  const [blocks, setBlocks] = useState<DocumentBlock[]>(initialBlocks);
  const [summary, setSummary] = useState<DocxImportSummary | null>({
    fileName: 'Sandip_Assignment_Sample.docx',
    fileSizeBytes: 18450,
    paragraphCount: initialBlocks.length,
    wordCount: initialBlocks.reduce((acc, b) => acc + b.text.split(/\s+/).filter(Boolean).length, 0),
    questionsDetected: initialBlocks.filter(b => b.type === 'question' || b.type === 'heading').length,
    answersDetected: initialBlocks.filter(b => b.type === 'answer').length
  });

  // 3. Handwriting Settings - default baseline offset 0.0mm sits flush on ruled lines
  const initialOffset = (template.baselineOffsetMm === -1.2 || template.baselineOffsetMm === undefined)
    ? 0.0
    : template.baselineOffsetMm;

  const [settings, setSettings] = useState<HandwritingSettings>({
    fontFamily: 'Bad Script',
    fontSizePt: 14.0,
    smartQaColors: true,
    questionColor: '#111827', // Jet black for questions
    answerColor: '#1e3a8a', // Deep royal ink blue for answers
    normalColor: '#1e3a8a',
    baselineOffsetMm: initialOffset,
    letterSpacing: 0,
    wordSpacing: 0,
    lineSpacingMultiplier: 1,
    naturalVariation: true,
    placePrefixInMargin: true,
    marginPrefixXMm: 19.5,
    rightMarginMm: 201.0
  });

  // 4. Current Workflow Step
  // Default to 'preview' so user immediately sees the beautiful handwritten ruled paper studio!
  const [currentStep, setCurrentStep] = useState<StepId>('preview');

  // 5. Single Source of Truth: Layout calculation
  const layout: LayoutResult = useMemo(() => {
    return computeLayout(blocks, template, settings);
  }, [blocks, template, settings]);

  // Persist template changes whenever updated
  const handleSaveTemplate = (updated: TemplateConfig) => {
    setTemplate(updated);
    saveTemplate(updated);
  };

  const handleResetTemplate = () => {
    const def = resetTemplateToDefault();
    setTemplate(def);
    setSettings(s => ({ ...s, baselineOffsetMm: def.baselineOffsetMm }));
  };

  return (
    <div className="app-container">
      
      {/* Top Application Header */}
      <header className="app-navbar">
        
        {/* Brand */}
        <div className="nav-brand">
          <div className="nav-logo-icon">
            <PenTool size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="nav-title">
                RuledSheet<span>Studio</span>
              </span>
              <span className="nav-badge hide-on-mobile">
                Sandip Univ &bull; A4
              </span>
            </div>
            <div className="hide-on-mobile" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Ruled Page Handwriting PDF Generator
            </div>
          </div>
        </div>

        {/* Step Indicator Navigation */}
        <StepIndicator
          currentStep={currentStep}
          onSelectStep={setCurrentStep}
          hasTemplate={true}
          hasDocument={blocks.length > 0}
        />

        {/* Quick Actions */}
        <div className="nav-actions">
          <button
            onClick={() => setIsCalibrationOpen(true)}
            className="btn btn-secondary btn-sm nav-btn-calibrator"
            title="Inspect or adjust writing lines"
            aria-label="Line Calibrator"
          >
            <Sliders size={14} color="var(--accent-primary)" />
            <span className="hide-on-mobile">Line Calibrator</span>
          </button>

          {currentStep !== 'export' && (
            <button
              onClick={() => setCurrentStep('export')}
              className="btn btn-primary btn-sm nav-btn-export"
              aria-label="Export PDFs"
            >
              <Download size={14} />
              <span className="hide-on-mobile">Export PDFs</span>
              <span className="show-on-mobile">Export</span>
            </button>
          )}
        </div>

      </header>

      {/* Main Content Area */}
      {currentStep === 'template' && (
        <TemplateStep
          template={template}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          onUpdateTemplate={handleSaveTemplate}
          onResetTemplate={handleResetTemplate}
          onNext={() => setCurrentStep('document')}
        />
      )}

      {currentStep === 'document' && (
        <DocumentStep
          blocks={blocks}
          summary={summary}
          onUpdateBlocks={(newBlocks, newSummary) => {
            setBlocks(newBlocks);
            if (newSummary) setSummary(newSummary);
          }}
          onNext={() => setCurrentStep('preview')}
        />
      )}

      {currentStep === 'preview' && (
        <PreviewStep
          template={template}
          layout={layout}
          settings={settings}
          blocks={blocks}
          onUpdateSettings={setSettings}
          onUpdateBlocks={setBlocks}
          onNext={() => setCurrentStep('export')}
        />
      )}

      {currentStep === 'export' && (
        <ExportStep
          template={template}
          layout={layout}
          settings={settings}
          onUpdateSettings={setSettings}
          onBackToPreview={() => setCurrentStep('preview')}
        />
      )}

      {/* Line Calibration Modal */}
      {isCalibrationOpen && (
        <LineCalibrationModal
          template={template}
          onSave={handleSaveTemplate}
          onClose={() => setIsCalibrationOpen(false)}
        />
      )}

    </div>
  );
};

export default App;
