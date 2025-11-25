
import React from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { GovRsLogo } from './icons/GovRsLogo';
import { StepProgressBar } from './StepProgressBar';
import { StrategyIcon } from './icons/StrategyIcon';

interface HeaderProps {
  onToggleSidebar: () => void;
  showToggle: boolean;
  className?: string;
  showProgressBar: boolean;
  currentStep: number;
  maxCompletedStep: number;
  onStepClick: (step: number) => void;
  onShowStrategy: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  showToggle,
  className = '',
  showProgressBar,
  currentStep,
  maxCompletedStep,
  onStepClick,
  onShowStrategy,
}) => {
  return (
    <header className={`sticky top-0 z-20 bg-brand-panel border-b border-brand-yellow/20 ${className}`}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
             {showToggle && (
              <>
                <button
                  onClick={onToggleSidebar}
                  className="p-2 mr-3 -ml-2 text-slate-400 hover:text-white hover:bg-neutral-600/50 rounded-md focus:outline-none focus:ring-2 focus:ring-white lg:hidden"
                  aria-label="Toggle sidebar"
                >
                  <MenuIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={onToggleSidebar}
                  className="hidden lg:block p-2 mr-3 -ml-2 text-slate-400 hover:text-white hover:bg-neutral-600/50 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Toggle sidebar"
                >
                  <MenuIcon className="h-6 w-6" />
                </button>
              </>
             )}
            <GovRsLogo className="h-12" />
          </div>
          
          <div className="flex items-center gap-4">
              {showProgressBar && (
                <div className="hidden md:block no-print">
                  <StepProgressBar
                    currentStep={currentStep}
                    maxCompletedStep={maxCompletedStep}
                    onStepClick={onStepClick}
                  />
                </div>
              )}
              
              <button
                onClick={onShowStrategy}
                className="no-print flex items-center gap-2 px-3 py-2 bg-neutral-800/50 hover:bg-neutral-700 text-neutral-300 hover:text-brand-yellow rounded-lg border border-neutral-700 transition-colors text-xs font-semibold"
                title="Ver estratégia do algoritmo"
              >
                <StrategyIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Estratégia</span>
              </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
