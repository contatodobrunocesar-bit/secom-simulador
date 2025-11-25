
import React, { useMemo, useState } from 'react';
import { Proposal, ProposalVersion, ProposalCategory } from '../types';
import { CRITERIA_BLOCKS, EVALUATION_MATRIX } from '../constants';
import { Radar, RadarChart, PolarGrid, Legend, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getCriteriaWeights } from '../weights';
import { calculateBenchmarks } from '../services/benchmarkService';
import { generateComparisonAnalysis } from '../services/geminiService';
import { DownloadIcon } from './icons/DownloadIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { parseFormattedNumber } from '../utils';

interface ComparisonChartProps {
  proposals: Proposal[];
  allProposals: Proposal[];
  onBack: () => void;
}

const getActiveVersion = (proposal: Proposal): ProposalVersion | null => {
  if (!proposal || proposal.versions.length === 0) {
    return null;
  }
  return proposal.versions[proposal.currentVersion - 1] || null;
};


const ComparisonChart: React.FC<ComparisonChartProps> = ({ proposals, allProposals, onBack }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const chartData = useMemo(() => CRITERIA_BLOCKS.map(group => {
    const dataPoint: { subject: string; [key: string]: string | number } = {
      subject: group.name,
    };
    proposals.forEach(proposal => {
        const activeVersion = getActiveVersion(proposal);
        if (!activeVersion) {
            dataPoint[proposal.id] = 0;
            return;
        }

        const allApplicableCriteria = EVALUATION_MATRIX
            .filter(c => !c.applicableCategories || c.applicableCategories.includes(proposal.category!));

        const consideredCriteria = allApplicableCriteria.filter(
            c => !activeVersion.preFormData[`${c.id}_nc`]
        );
        const consideredCriteriaIds = consideredCriteria.map(c => c.id);
        const weights = getCriteriaWeights(proposal.category!, consideredCriteriaIds);

        let groupWeightedScoreSum = 0;
        let groupWeightSum = 0;

        group.ids.forEach(criterionId => {
            if (consideredCriteriaIds.includes(criterionId) && activeVersion.scores[criterionId]) {
                const score = activeVersion.scores[criterionId].score;
                const weight = weights[criterionId] || 0;
                groupWeightedScoreSum += score * weight;
                groupWeightSum += weight;
            }
        });

      const avg = groupWeightSum > 0 ? groupWeightedScoreSum / groupWeightSum : 0;
      dataPoint[proposal.id] = parseFloat(avg.toFixed(2));
    });
    return dataPoint;
  }), [proposals]);
  
  const benchmarks = useMemo(() => calculateBenchmarks(allProposals), [allProposals]);

  const metricsData = useMemo(() => {
    if (proposals.length === 0) return null;

    const getMetric = (p: Proposal, key: keyof ProposalVersion['preFormData'] | 'totalScore' | 'investment' | 'costPerScore') => {
        // Investment is on the proposal object, return it even if no version exists
        if (key === 'investment') return p.investment;

        const activeVersion = getActiveVersion(p);
        // Defaults for missing versions
        if (!activeVersion) {
             if (key === 'totalScore') return 0;
             if (key === 'costPerScore') return 0; // Prevent Infinity issues
             return 0;
        }

        if (key === 'totalScore') return activeVersion.totalScore;
        if (key === 'costPerScore') return activeVersion.totalScore > 0 ? p.investment / activeVersion.totalScore : Infinity;
        
        const value = activeVersion.preFormData[key];
        return (value && Number(value) > 0) ? Number(value) : (key === 'cpm' || key === 'costPerScore' ? Infinity : 0);
    };
    
    const metrics = {
        score: proposals.map(p => getMetric(p, 'totalScore')),
        investment: proposals.map(p => getMetric(p, 'investment')),
        cpm: proposals.map(p => getMetric(p, 'cpm')),
        rsReach: proposals.map(p => {
          const activeVersion = getActiveVersion(p);
          if (!activeVersion) return 0;
          return Number(activeVersion.preFormData.demographic_rs_portal || activeVersion.preFormData.demographic_rs_social) || 0;
        }),
        costPerScore: proposals.map(p => getMetric(p, 'costPerScore')),
    };
    
    // TV Specific Metrics Calculation
    const hasTvProposal = proposals.some(p => p.category === ProposalCategory.TV_ALL);
    let tvMetrics = null;
    if (hasTvProposal) {
         tvMetrics = {
            insertions: proposals.map(p => {
                 if (p.category !== ProposalCategory.TV_ALL) return 0;
                 const v = getActiveVersion(p);
                 if (!v) return 0;
                 const daily = parseFormattedNumber(String(v.preFormData.tv_daily_insertions || 0));
                 const days = parseFormattedNumber(String(v.preFormData.tv_insertion_days || 0));
                 return daily * days;
            }),
            hours: proposals.map(p => {
                 if (p.category !== ProposalCategory.TV_ALL) return 0;
                 const v = getActiveVersion(p);
                 if (!v) return 0;
                 const daily = parseFormattedNumber(String(v.preFormData.tv_daily_insertions || 0));
                 const days = parseFormattedNumber(String(v.preFormData.tv_insertion_days || 0));
                 const duration = parseFormattedNumber(String(v.preFormData.tv_spot_duration || 0));
                 return (daily * days * duration) / 3600;
            })
         };
    }

    return {
        score: { values: metrics.score, best: Math.max(...metrics.score.filter(v => isFinite(v) && v !== Infinity)) },
        investment: { values: metrics.investment, best: Math.min(...metrics.investment.filter(v => isFinite(v) && v !== Infinity)) },
        cpm: { values: metrics.cpm, best: Math.min(...metrics.cpm.filter(v => isFinite(v) && v !== Infinity)) },
        rsReach: { values: metrics.rsReach, best: Math.max(...metrics.rsReach.filter(v => isFinite(v) && v !== Infinity)) },
        costPerScore: { values: metrics.costPerScore, best: Math.min(...metrics.costPerScore.filter(v => isFinite(v) && v !== Infinity)) },
        tv: tvMetrics ? {
            insertions: { values: tvMetrics.insertions, best: Math.max(...tvMetrics.insertions) },
            hours: { values: tvMetrics.hours, best: Math.max(...tvMetrics.hours) }
        } : null
    };
  }, [proposals]);
  
  const colors = ['#FBBA00', '#69A82F', '#E4003A', '#338DFF', '#80BFFF'];

  const handlePrint = () => {
      window.print();
  };

  const handleGenerateAnalysis = async () => {
      setIsAnalyzing(true);
      try {
          const analysis = await generateComparisonAnalysis(proposals);
          setAiAnalysis(analysis);
      } catch (error) {
          console.error(error);
          alert("Não foi possível gerar a análise comparativa.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  if (proposals.length < 2) {
    return (
        <div className="brand-panel rounded-lg p-6 h-[600px] flex flex-col items-center justify-center text-center">
            <p className="text-[var(--text-tertiary)] mb-4 max-w-xs">Selecione ao menos duas propostas no painel para iniciar a comparação.</p>
            <button
                onClick={onBack}
                className="px-6 py-2.5 bg-neutral-700 text-neutral-200 font-semibold rounded-lg shadow-md hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500"
            >
                &larr; Voltar ao painel
            </button>
        </div>
    );
  }

  const renderMetricRow = (label: string, values: number[], bestValue: number, format: (v: number) => string, benchmarkValue?: number, isTvMetric = false) => (
    <tr className={`border-b border-[var(--border-primary)] last:border-b-0 ${isTvMetric ? 'bg-brand-yellow/5' : ''}`}>
        <td className={`py-3 px-4 font-medium text-[var(--text-secondary)] whitespace-nowrap flex items-center gap-2`}>
            {isTvMetric && <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow"></span>}
            {label}
        </td>
        {values.map((value, index) => (
            <td key={index} className={`py-3 px-4 text-center ${value === bestValue && isFinite(value) && value !== Infinity && value !== 0 ? 'text-[var(--color-good)] font-bold' : 'text-[var(--text-primary)]'}`}>
                {isFinite(value) && value !== Infinity && (value !== 0 || isTvMetric) ? format(value) : 'N/A'}
            </td>
        ))}
         {benchmarkValue !== undefined && (
           <td className="py-3 px-4 text-center font-semibold text-sky-300 bg-sky-500/10">
               {isFinite(benchmarkValue) && benchmarkValue > 0 ? format(benchmarkValue) : 'N/A'}
           </td>
       )}
    </tr>
  );


  return (
    <div className="space-y-8 printable-area">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2 no-print">
         <h2 className="text-2xl font-bold text-[var(--text-primary)]">Comparativo de propostas</h2>
         <div className="flex gap-3">
             <button
                onClick={handlePrint}
                 className="flex items-center gap-2 px-4 py-2 text-xs bg-neutral-700 text-neutral-200 hover:bg-neutral-600 hover:text-white font-medium rounded-lg transition-colors"
                 title="Imprimir ou Salvar como PDF"
             >
                 <PrinterIcon className="w-4 h-4" />
                 Imprimir / PDF
             </button>
             <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 text-xs border border-brand-yellow/30 text-brand-yellow hover:bg-brand-yellow/10 font-medium rounded-lg transition-colors"
            >
                &larr; Voltar ao painel
            </button>
         </div>
      </div>

      {/* Header for Print Only */}
      <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Relatório comparativo de mídia</h1>
          <p className="text-sm text-gray-500">Gerado em {new Date().toLocaleDateString('pt-BR')} - Mídia Matrix GovRS</p>
      </div>
      
      {proposals.length >= 2 && metricsData && (
        <>
            <div className="brand-panel rounded-lg p-6">
                <h2 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Matriz de métricas</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-[var(--border-primary)]">
                                <th className="py-3 px-4 text-left font-semibold text-[var(--text-primary)]">Métrica</th>
                                {proposals.map((p) => (
                                    <th key={p.id} className="py-3 px-4 font-semibold text-center text-[var(--text-secondary)]">
                                        {p.name}
                                    </th>
                                ))}
                                <th className="py-3 px-4 font-semibold text-center text-sky-300">Média geral ({benchmarks.overall.proposalCount})</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderMetricRow('Pontuação total', metricsData.score.values, metricsData.score.best, v => v.toFixed(2), benchmarks.overall.avgScore)}
                            {renderMetricRow('Investimento total', metricsData.investment.values, metricsData.investment.best, v => `R$ ${v.toLocaleString('pt-BR')}`, benchmarks.overall.avgInvestment)}
                            {renderMetricRow('Custo por ponto', metricsData.costPerScore.values, metricsData.costPerScore.best, v => `R$ ${v.toFixed(2)}`, benchmarks.overall.avgCostPerScore)}
                            {renderMetricRow('CPM', metricsData.cpm.values, metricsData.cpm.best, v => `R$ ${v.toFixed(2)}`, benchmarks.overall.avgCpm)}
                            {renderMetricRow('Alcance no RS', metricsData.rsReach.values, metricsData.rsReach.best, v => `${v}%`, benchmarks.overall.avgRsReach)}
                            
                            {metricsData.tv && (
                                <>
                                    {renderMetricRow('Total de inserções (TV)', metricsData.tv.insertions.values, metricsData.tv.insertions.best, v => v.toLocaleString('pt-BR'), undefined, true)}
                                    {renderMetricRow('Tempo total de exposição (h)', metricsData.tv.hours.values, metricsData.tv.hours.best, v => `${v.toFixed(1)}h`, undefined, true)}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* AI Analysis Section */}
            <div className="brand-panel rounded-lg p-6 border border-brand-yellow/20">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-brand-yellow" />
                        Análise estratégica comparativa (IA)
                     </h2>
                     {!aiAnalysis && !isAnalyzing && (
                         <button
                            onClick={handleGenerateAnalysis}
                            className="no-print px-4 py-2 bg-brand-yellow text-brand-dark text-sm font-bold rounded-lg shadow hover:bg-yellow-400 transition-colors"
                         >
                             Gerar análise
                         </button>
                     )}
                </div>
                
                {isAnalyzing && (
                    <div className="text-center py-8 animate-pulse">
                        <p className="text-brand-yellow font-medium">A IA está comparando as propostas. Aguarde um momento...</p>
                    </div>
                )}

                {aiAnalysis && (
                    <div className="prose prose-sm prose-invert max-w-none p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
                         <p className="whitespace-pre-wrap text-neutral-300 leading-relaxed">{aiAnalysis}</p>
                    </div>
                )}
                
                {!aiAnalysis && !isAnalyzing && (
                    <p className="text-sm text-[var(--text-tertiary)] italic">Clique no botão acima para solicitar uma análise comparativa detalhada entre as opções selecionadas.</p>
                )}
            </div>

            <div className="brand-panel rounded-lg p-6 h-[500px] print:break-before-page">
                <h2 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Gráfico de performance</h2>
                <ResponsiveContainer width="100%" height="90%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="rgba(100, 116, 139, 0.5)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 3]} tick={{ fill: 'transparent' }} />
                        <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(38, 38, 38, 0.8)',
                            border: '1px solid var(--border-highlight)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            backdropFilter: 'blur(5px)'
                        }}
                        cursor={{ stroke: 'var(--accent-primary)', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                        {proposals.map((proposal, index) => (
                        <Radar
                            key={proposal.id}
                            name={proposal.name}
                            dataKey={proposal.id}
                            stroke={colors[index % colors.length]}
                            fill={colors[index % colors.length]}
                            fillOpacity={0.6}
                        />
                        ))}
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </>
      )}
    </div>
  );
};

export default ComparisonChart;
