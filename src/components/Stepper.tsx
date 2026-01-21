import React, { ReactNode, useEffect } from 'react';
import { Check, ChevronRight } from 'lucide-react';

export interface Step {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  onCancel?: () => void;
  canProgress?: boolean;
  isProcessing?: boolean;
  completeButtonText?: string;
  nextButtonText?: string;
  backButtonText?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  canProgress = true,
  isProcessing = false,
  completeButtonText = 'Complete',
  nextButtonText = 'Next',
  backButtonText = 'Back'
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  // Handle Enter key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isProcessing && canProgress) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, canProgress, isProcessing]);

  return (
    <div className="flex flex-col">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <button
                    onClick={() => index < currentStep && onStepChange(index)}
                    disabled={index > currentStep}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all mb-2 ${
                      isCompleted
                        ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400 cursor-pointer hover:bg-cyan-500/30'
                        : isActive
                        ? 'bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/50'
                        : 'bg-gray-800/50 border-2 border-gray-600 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </button>
                  
                  {/* Step Label */}
                  <div className="text-center">
                    <div
                      className={`text-xs font-bold uppercase tracking-wider font-mono ${
                        isActive
                          ? 'text-cyan-400'
                          : isCompleted
                          ? 'text-cyan-500/70'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </div>
                    {step.description && (
                      <div className="text-xs text-gray-500 mt-1 hidden sm:block">
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2 mb-8">
                    <div
                      className={`h-0.5 transition-all ${
                        index < currentStep
                          ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                          : 'bg-gray-700'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 mb-6">
        {steps[currentStep]?.content}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-cyan-500/20">
        <button
          type="button"
          onClick={isFirstStep ? onCancel : handleBack}
          disabled={isProcessing}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider font-mono transition-all ${
            isFirstStep
              ? 'bg-red-500/10 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:bg-red-500/20'
              : 'bg-gray-800 border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isFirstStep ? 'Cancel' : backButtonText}
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
          <span className="text-cyan-400 font-bold">{currentStep + 1}</span>
          <span>/</span>
          <span>{steps.length}</span>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canProgress || isProcessing}
          className="px-6 py-2.5 bg-cyan-500/10 hover:border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 rounded-lg font-bold text-sm uppercase tracking-wider font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {isLastStep ? completeButtonText : nextButtonText}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
