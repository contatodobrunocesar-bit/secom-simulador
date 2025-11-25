
import React, { useState } from 'react';
import { Proposal, ProposalCategory } from '../types';
import { PROPOSAL_CATEGORIES } from '../constants';
import { PortalIcon } from './icons/PortalIcon';
import { SocialIcon } from './icons/SocialIcon';
import { TvIcon } from './icons/TvIcon';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ProposalCategorizationProps {
    proposal: Proposal;
    onUpdate: (proposal: Proposal) => void;
    onComplete: () => void;
    onBack: () => void;
}

const categoryIcons: { [key in ProposalCategory]: React.ReactNode } = {
    [ProposalCategory.PORTAL_BLOG]: <PortalIcon className="w-8 h-8 text-brand-yellow" />,
    [ProposalCategory.PORTAL_SOCIAL]: <div className="flex gap-1"><SocialIcon className="w-6 h-6 text-brand-yellow" /><PortalIcon className="w-6 h-6 text-brand-yellow" /></div>,
    [ProposalCategory.TV_ALL]: <TvIcon className="w-8 h-8 text-brand-yellow" />,
    [ProposalCategory.YOUTUBE_ALL]: <YoutubeIcon className="w-8 h-8 text-brand-yellow" />,
};

const ProposalCategorization: React.FC<ProposalCategorizationProps> = ({ proposal, onUpdate, onComplete, onBack }) => {
    const [selectedCategory, setSelectedCategory] = useState<ProposalCategory | null>(proposal.category);

    const handleConfirmSelection = () => {
        if (selectedCategory) {
            onUpdate({ ...proposal, category: selectedCategory });
            onComplete();
        }
    };

    const formatCategoryLabel = (label: string) => {
        // Split by ' + ' to separate main type from additions
        const parts = label.split(' + ');
        const main = parts[0];
        const extra = parts.length > 1 ? '+ ' + parts.slice(1).join(' + ') : null;
        return { main, extra };
    };

    return (
        <div className="brand-panel rounded-lg p-8 flex flex-col h-full">
             <div className="w-full max-w-6xl mx-auto flex-grow flex flex-col justify-center">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">Tipo de compra</h2>
                    <p className="mt-3 text-[var(--text-tertiary)] max-w-2xl mx-auto text-base">
                        Esta escolha é obrigatória e direciona os critérios da avaliação. Selecione a opção que melhor descreve a proposta comercial.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {PROPOSAL_CATEGORIES.map(category => {
                         const isSelected = selectedCategory === category;
                         const { main, extra } = formatCategoryLabel(category);

                         return (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`relative p-6 flex flex-col items-center justify-center text-center rounded-xl transition-all duration-200 border-2 group h-full min-h-[180px]
                                    ${isSelected
                                        ? 'bg-brand-yellow/10 border-brand-yellow shadow-[0_0_15px_rgba(251,186,0,0.15)]'
                                        : 'bg-neutral-800/40 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800'
                                    }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-3 right-3 w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center text-brand-dark shadow-sm">
                                        <CheckIcon className="w-4 h-4 stroke-[3]" />
                                    </div>
                                )}
                                
                                <div className={`mb-5 transition-transform duration-200 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                                    {categoryIcons[category]}
                                </div>
                                
                                <div className="flex flex-col items-center w-full">
                                    <p className={`font-extrabold text-xl md:text-2xl leading-tight tracking-tight ${isSelected ? 'text-brand-yellow' : 'text-neutral-100 group-hover:text-white'}`}>
                                        {main}
                                    </p>
                                    {extra && (
                                        <p className={`text-xs font-normal mt-2 opacity-80 leading-snug max-w-[90%] ${isSelected ? 'text-brand-yellow' : 'text-neutral-400 group-hover:text-neutral-300'}`}>
                                            {extra}
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[var(--border-primary)] flex justify-between items-center w-full max-w-6xl mx-auto">
                 <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-semibold transition-colors flex items-center gap-2"
                >
                    &larr; Voltar
                </button>
                <button
                    onClick={handleConfirmSelection}
                    disabled={!selectedCategory}
                    className="px-8 py-3 bg-brand-yellow text-brand-dark font-bold rounded-lg shadow-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-brand-panel transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    Avançar &rarr;
                </button>
            </div>
        </div>
    );
};

export default ProposalCategorization;
