
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { CheckIcon } from './icons/CheckIcon';

interface StepProgressBarProps {
  currentStep: number;
  maxCompletedStep: number;
  onStepClick: (step: number) => void;
}

const STEPS = ['Tipo de Compra', 'Pontuação', 'Análise'];

export const StepProgressBar: React.FC<StepProgressBarProps> = ({ currentStep, maxCompletedStep, onStepClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const currentStepName = STEPS[currentStep - 1] || 'Etapas';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleStepItemClick = (stepIndex: number) => {
    onStepClick(stepIndex);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-4 py-2 bg-neutral-700/60 text-neutral-200 font-semibold rounded-lg shadow-sm hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors"
      >
        <span>Etapa: <span className="font-bold text-brand-yellow">{currentStepName}</span></span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-brand-panel border border-[var(--border-primary)] rounded-lg shadow-2xl z-50">
          <ol className="p-2 space-y-1">
            {STEPS.map((step, index) => {
              const stepIndex = index + 1;
              const isCompleted = maxCompletedStep >= stepIndex;
              const isActive = currentStep === stepIndex;
              const isClickable = isCompleted && !isActive;

              return (
                <li key={step}>
                  <button
                    onClick={() => isClickable && handleStepItemClick(stepIndex)}
                    disabled={!isClickable}
                    aria-current={isActive ? 'step' : undefined}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-md transition-colors duration-200
                      ${isClickable ? 'cursor-pointer hover:bg-neutral-800/50' : 'cursor-default'}
                      ${isActive ? 'bg-brand-yellow/10' : ''}
                    `}
                  >
                    <span className={`flex items-center justify-center flex-shrink-0 w-6 h-6 rounded-full border-2 text-sm font-bold transition-all duration-200
                      ${isActive ? 'bg-brand-yellow border-brand-yellow text-neutral-800' : ''}
                      ${isCompleted && !isActive ? 'bg-neutral-600 border-neutral-500 text-brand-yellow' : ''}
                      ${!isCompleted ? 'bg-neutral-700 border-neutral-600 text-neutral-400' : ''}
                    `}>
                      {isCompleted && !isActive ? <CheckIcon className="w-3.5 h-3.5" /> : stepIndex}
                    </span>
                    <span className={`font-semibold text-sm
                      ${isActive ? 'text-brand-yellow' : ''}
                      ${isCompleted && !isActive ? 'text-neutral-200' : ''}
                      ${!isCompleted ? 'text-neutral-400' : ''}
                    `}>
                      {step}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
};
