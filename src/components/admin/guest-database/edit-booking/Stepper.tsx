'use client';

import { Check } from 'lucide-react';

interface StepperProps {
  currentStep: 1 | 2 | 3;
  canProceedStep1: boolean;
  onStepClick: (step: 1 | 2 | 3) => void;
}

export function Stepper({ currentStep, canProceedStep1, onStepClick }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2, 3] as const).map((step) => (
        <div key={step} className="flex items-center">
          <button
            type="button"
            onClick={() => onStepClick(step)}
            disabled={step === 2 && !canProceedStep1}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all
              ${currentStep === step
                ? 'bg-primary text-white shadow-lg scale-110'
                : currentStep > step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'}
              ${step === 2 && !canProceedStep1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
            `}
          >
            {currentStep > step ? <Check className="w-5 h-5" /> : step}
          </button>
          {step < 3 && (
            <div className={`w-16 h-1 mx-1 rounded ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
