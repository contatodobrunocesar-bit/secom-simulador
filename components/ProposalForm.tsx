
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Proposal, ProposalVersion } from '../types';
import { EVALUATION_MATRIX } from '../constants';
import { generateAnalysis } from '../services/geminiService';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { getCriteriaWeights } from '../weights';
import { calculateBenchmarks, Benchmarks } from '../services/benchmarkService';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface ProposalFormProps {
  proposal: Proposal;
  allProposals: Proposal[];
  onUpdate: (proposal: Proposal) => void;
  onBack: () => void;
}

const ProposalForm: React.FC<ProposalFormProps> = ({ proposal, allProposals, onUpdate, onBack }) => {
  const [displayedVersionNumber, setDisplayedVersionNumber] = useState(proposal.currentVersion);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isVersionSelectorOpen, setIsVersionSelectorOpen] = useState(false);
  const versionSelectorRef = useRef<HTMLDivElement>(null);

  const displayedVersion = useMemo(() => {
    return proposal.versions.find(v => v.versionNumber === displayedVersionNumber) || null;
  }, [proposal.versions, displayedVersionNumber]);

  const applicableCriteria = useMemo(() => {
    if (!proposal.category || !displayedVersion) return [];
    return EVALUATION_MATRIX.filter(c =>
      !c.applicableCategories || c.applicableCategories.includes(proposal.category!)
    );
  }, [proposal.category, displayedVersion]);

  const criteriaWeights = useMemo(() => {
    if (!proposal.category || !displayedVersion) return {};
    
    const consideredCriteria = applicableCriteria.filter(
      c => !displayedVersion.preFormData[`${c.id}_nc`]
    );
    const consideredIds = consideredCriteria.map(c => c.id);

    return getCriteriaWeights(proposal.category, consideredIds);
  }, [proposal.category, applicableCriteria, displayedVersion]);

  const benchmarks = useMemo(() => calculateBenchmarks(allProposals.filter(p => p.id !== proposal.id)), [allProposals, proposal.id]);
  const regionBenchmark = useMemo(() => proposal.region ? benchmarks.byRegion[proposal.region] : null, [benchmarks, proposal.region]);
  const categoryBenchmark = useMemo(() => proposal.category ? benchmarks.byCategory[proposal.category] : null, [benchmarks, proposal.category]);
  const costPerScore = displayedVersion && displayedVersion.totalScore > 0 ? proposal.investment / displayedVersion.totalScore : 0;

  const handleAiAnalysis = async (versionToAnalyze: ProposalVersion) => {
    setIsLoadingAi(true);
    try {
        const analysis = await generateAnalysis(proposal, versionToAnalyze, benchmarks);
        
        const updatedProposal = {
            ...proposal,
            versions: proposal.versions.map(v => 
                v.versionNumber === versionToAnalyze.versionNumber 
                ? { ...v, aiAnalysis: analysis } 
                : v
            ),
        };
        onUpdate(updatedProposal);

    } catch (error) {
        console.error("Error generating AI analysis:", error);
        // We don't save the error message to state, so the user can try again easily.
        alert("Não foi possível gerar a análise agora. Tente novamente.");
    } finally {
        setIsLoadingAi(false);
    }
  };
  
  useEffect(() => {
      const activeVersion = proposal.versions[proposal.currentVersion - 1];
      if (activeVersion && !activeVersion.aiAnalysis) {
          handleAiAnalysis(activeVersion);
      }
  }, [proposal.id, proposal.currentVersion, proposal.versions]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (versionSelectorRef.current && !versionSelectorRef.current.contains(event.target as Node)) {
        setIsVersionSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [versionSelectorRef]);


  if (!displayedVersion) {
    return <div>Erro: Versão da proposta não encontrada.</div>
  }

  const getScoreStyle = (score: number) => {
    if (score >= 2.25) return 'text-green-400 bg-green-500/10';
    if (score >= 1.5) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  const handlePrint = () => {
    window.print();
  };
  
  const renderBenchmarkComparison = (label: string, value: number, benchmarkValue: number | undefined, format: (v: number) => string, smallerIsBetter = false) => {
   if (benchmarkValue === undefined || benchmarkValue === 0 || !isFinite(value)) {
       return (
           <div className="flex justify-between items-center py-2 border-b border-neutral-800">
               <span className="text-sm text-[var(--text-tertiary)]">{label}</span>
               <span className="font-semibold text-[var(--text-secondary)]">{isFinite(value) ? format(value) : 'N/A'}</span>
           </div>
       );
   }

   const diff = value - benchmarkValue;
   const diffPercent = (diff / benchmarkValue) * 100;
   const isBetter = smallerIsBetter ? diff < 0 : diff > 0;
   
   let diffColor = 'text-yellow-400'; // Neutral
   if (Math.abs(diffPercent) > 5) { // Only color if difference is significant
       diffColor = isBetter ? 'text-green-400' : 'text-red-400';
   }


   return (
       <div className="flex flex-col py-2 border-b border-neutral-800">
           <div className="flex justify-between items-center">
               <span className="text-sm text-[var(--text-tertiary)]">{label}</span>
               <span className="font-semibold text-[var(--text-secondary)]">{format(value)}</span>
           </div>
           <div className="flex justify-between items-center text-xs mt-1">
               <span className="text-neutral-500">Média: {format(benchmarkValue)}</span>
               <span className={`${diffColor} font-bold`}>
                   {diffPercent !== 0 && isFinite(diffPercent) ? `${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%` : 'Na média'}
               </span>
           </div>
       </div>
   );
 };

  return (
    <div className="brand-panel rounded-lg p-6 space-y-10">
      
      <div>
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{proposal.name}</h2>
                <p className="text-base text-[var(--text-secondary)] -mt-1">{proposal.vehicle}</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-2">{proposal.category}</p>
                 {proposal.socialChannels && proposal.socialChannels.length > 0 && (
                    <div className="mt-2">
                        <p className="text-sm text-[var(--text-tertiary)]">Canais de social media:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {proposal.socialChannels.map(channel => (
                                <span key={channel} className="px-2 py-1 text-xs font-medium bg-neutral-700 text-neutral-300 rounded-full">{channel}</span>
                            ))}
                        </div>
                    </div>
                )}
                 <p className="mt-2 text-sm text-[var(--text-tertiary)]">Data: <span className="font-semibold text-[var(--text-secondary)]">{new Date(proposal.proposalDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></p>
                 <p className="text-sm text-[var(--text-tertiary)]">Período: <span className="font-semibold text-[var(--text-secondary)]">{proposal.campaignPeriod}</span></p>
                 <p className="text-sm text-[var(--text-tertiary)]">Cidade: <span className="font-semibold text-[var(--text-secondary)]">{proposal.city || 'N/A'} {proposal.region && `(${proposal.region})`}</span></p>
                 <p className="text-sm text-[var(--text-tertiary)]">Investimento: <span className="font-semibold text-[var(--text-secondary)]">R$ {proposal.investment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
            </div>
            <div className='text-right'>
                <p className="text-sm text-[var(--text-tertiary)]">Pontuação total</p>
                <p className="font-bold text-5xl text-[var(--accent-primary)]">{displayedVersion.totalScore.toFixed(2)}</p>
                <div className="no-print mt-4 flex justify-end items-center gap-4">
                  
                  {/* Version Selector */}
                   <div className="relative" ref={versionSelectorRef}>
                      <button 
                        onClick={() => setIsVersionSelectorOpen(prev => !prev)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 text-neutral-200 text-sm font-semibold rounded-lg shadow-sm hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                        title="Ver histórico de versões"
                      >
                        {`Versão ${displayedVersionNumber}`}
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isVersionSelectorOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isVersionSelectorOpen && (
                         <div className="absolute right-0 mt-2 w-56 bg-brand-panel border border-[var(--border-primary)] rounded-lg shadow-2xl z-50">
                            <ul className="p-2 space-y-1">
                              {proposal.versions.slice().reverse().map(version => (
                                <li key={version.versionNumber}>
                                  <button
                                    onClick={() => {
                                      setDisplayedVersionNumber(version.versionNumber);
                                      setIsVersionSelectorOpen(false);
                                    }}
                                    className={`w-full text-left flex items-center justify-between p-2 rounded-md transition-colors duration-200 hover:bg-neutral-800/50
                                      ${displayedVersionNumber === version.versionNumber ? 'bg-brand-yellow/10' : ''}
                                    `}
                                  >
                                    <div className="flex items-center gap-2">
                                       <span className={`font-semibold text-sm ${displayedVersionNumber === version.versionNumber ? 'text-brand-yellow' : 'text-neutral-200'}`}>
                                          Versão {version.versionNumber} {version.versionNumber === proposal.currentVersion ? '(Atual)' : ''}
                                       </span>
                                    </div>
                                    <span className="text-xs text-neutral-400">
                                      {new Date(version.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                         </div>
                      )}
                   </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 text-neutral-200 text-sm font-semibold rounded-lg shadow-sm hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                        title="Imprimir análise"
                    >
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onBack}
                        className="text-sm text-[var(--accent-primary)] hover:text-yellow-300 font-semibold"
                    >
                        &larr; {displayedVersionNumber === proposal.currentVersion ? 'Editar pontuação' : 'Nova versão'}
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      {(regionBenchmark || categoryBenchmark) && (
       <div className="pt-8 border-t border-[var(--border-primary)]">
           <h3 className="text-xl font-bold mb-5 text-[var(--text-primary)] flex items-center gap-3">
               <ChartBarIcon className="w-6 h-6 text-brand-yellow"/>
               Comparativo histórico (benchmark)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
               {regionBenchmark && regionBenchmark.proposalCount > 0 && (
                   <div>
                       <p className="text-base font-semibold mb-2 text-sky-300">vs média da região ({proposal.region} - {regionBenchmark.proposalCount} propostas)</p>
                       <div className="space-y-1">
                           {renderBenchmarkComparison('Pontuação', displayedVersion.totalScore, regionBenchmark.avgScore, v => v.toFixed(2))}
                           {renderBenchmarkComparison('Custo por ponto', costPerScore, regionBenchmark.avgCostPerScore, v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, true)}
                           {renderBenchmarkComparison('CPM', Number(displayedVersion.preFormData.cpm), regionBenchmark.avgCpm, v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, true)}
                       </div>
                   </div>
               )}

               {categoryBenchmark && categoryBenchmark.proposalCount > 0 && (
                   <div>
                       <p className="text-base font-semibold mb-2 text-purple-300">vs média da categoria ({proposal.category} - {categoryBenchmark.proposalCount} propostas)</p>
                        <div className="space-y-1">
                           {renderBenchmarkComparison('Pontuação', displayedVersion.totalScore, categoryBenchmark.avgScore, v => v.toFixed(2))}
                           {renderBenchmarkComparison('Custo por ponto', costPerScore, categoryBenchmark.avgCostPerScore, v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, true)}
                           {renderBenchmarkComparison('CPM', Number(displayedVersion.preFormData.cpm), categoryBenchmark.avgCpm, v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, true)}
                       </div>
                   </div>
               )}
           </div>
       </div>
     )}

      <div className="pt-8 border-t border-[var(--border-primary)]">
        <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Análise da proposta</h3>
            {displayedVersionNumber === proposal.currentVersion && !isLoadingAi && !displayedVersion.aiAnalysis && (
                 <button 
                    onClick={() => handleAiAnalysis(displayedVersion)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 text-brand-yellow text-sm font-medium rounded-lg hover:bg-neutral-700 border border-neutral-700 hover:border-brand-yellow transition-colors"
                 >
                    <SparklesIcon className="w-4 h-4" />
                    Gerar análise
                 </button>
            )}
        </div>
        
        {isLoadingAi && displayedVersionNumber === proposal.currentVersion && (
            <div className="mt-4 text-[var(--text-tertiary)] animate-pulse">Aguarde, a IA está avaliando a proposta...</div>
        )}
        {displayedVersion.aiAnalysis && (!isLoadingAi || displayedVersionNumber !== proposal.currentVersion) ? (
            <div className="mt-5 p-5 bg-neutral-900/50 rounded-lg prose prose-slate dark:prose-invert max-w-none prose-p:text-neutral-300 prose-strong:text-neutral-100">
              <p className="whitespace-pre-wrap">{displayedVersion.aiAnalysis}</p>
            </div>
        ) : !isLoadingAi && (
            <div className="mt-4 text-sm text-[var(--text-tertiary)] italic">
                Nenhuma análise gerada para esta versão. Clique no botão acima para gerar.
            </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-bold mb-5 text-[var(--text-primary)]">Resumo da pontuação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applicableCriteria.map(criterion => {
            const notConsidered = !!displayedVersion.preFormData[`${criterion.id}_nc`];
            const weight = notConsidered ? 0 : (criteriaWeights[criterion.id] || 0);

            return (
              <div key={criterion.id} className={`p-4 bg-neutral-900/50 rounded-lg border border-neutral-700 flex flex-col justify-between ${notConsidered ? 'opacity-60' : ''}`}>
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium text-[var(--text-secondary)] leading-tight">{criterion.criterion}</p>
                    <span className="flex-shrink-0 text-xs font-mono bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md">
                      Peso: {(weight * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-end justify-between mt-3">
                    {notConsidered ? (
                      <p className="text-sm font-semibold italic text-neutral-400">Não considerado</p>
                    ) : (
                      <>
                        <p className="font-bold text-4xl">
                          <span className={`inline-block px-3 py-0.5 rounded-lg ${getScoreStyle(displayedVersion.scores[criterion.id]?.score ?? 0)} print:color-adjust-exact`}>
                            {displayedVersion.scores[criterion.id]?.score?.toFixed(1) ?? '0.0'}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] bg-neutral-800 px-2 py-1 rounded-full text-right max-w-[50%] truncate">
                            {String(displayedVersion.scores[criterion.id]?.value) ?? 'N/A'}
                        </p>
                      </>
                    )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  );
};

export default ProposalForm;
