import React from 'react';
import { Sliders, FileText, Eye, Download, Check } from 'lucide-react';

export type StepId = 'template' | 'document' | 'preview' | 'export';

interface Props {
  currentStep: StepId;
  onSelectStep: (step: StepId) => void;
  hasTemplate: boolean;
  hasDocument: boolean;
}

export const StepIndicator: React.FC<Props> = ({
  currentStep,
  onSelectStep,
  hasTemplate,
  hasDocument
}) => {
  const steps: { id: StepId; label: string; shortLabel: string; icon: React.ElementType; isDone: boolean }[] = [
    { id: 'template', label: 'Template', shortLabel: 'Paper', icon: Sliders, isDone: hasTemplate },
    { id: 'document', label: 'Document', shortLabel: 'Doc', icon: FileText, isDone: hasDocument },
    { id: 'preview', label: 'Studio Preview', shortLabel: 'Preview', icon: Eye, isDone: hasDocument },
    { id: 'export', label: 'Export PDFs', shortLabel: 'Export', icon: Download, isDone: hasDocument }
  ];

  return (
    <nav className="nav-steps" aria-label="Assignment Workflow Steps">
      {steps.map((s, idx) => {
        const isActive = currentStep === s.id;
        const isAccessible = s.id === 'template' || s.id === 'document' || hasDocument;

        return (
          <button
            key={s.id}
            onClick={() => isAccessible && onSelectStep(s.id)}
            disabled={!isAccessible}
            className={`nav-step-btn ${isActive ? 'active' : ''}`}
            title={`Step ${idx + 1}: ${s.label}`}
            aria-label={`Step ${idx + 1}: ${s.label}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <div className="step-num-icon">
              {s.isDone && !isActive ? <Check size={12} /> : idx + 1}
            </div>
            <span className="step-label-full">{s.label}</span>
            <span className="step-label-short">{s.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
};