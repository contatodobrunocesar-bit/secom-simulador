
import React, { useState, useMemo } from 'react';
import { ProposalCategory } from '../types';
import { EVALUATION_MATRIX } from '../constants';
import { getCriteriaWeights } from '../weights';
import { PortalIcon } from './icons/PortalIcon';
import { TvIcon } from './icons/TvIcon';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { SocialIcon } from './icons/SocialIcon';

interface StrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StrategyModal: React.FC<StrategyModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<ProposalCategory>(ProposalCategory.TV_ALL);

  // Helper to get logic description based on category
  const getLogicDescription = (cat: ProposalCategory) => {
    switch(cat) {
      case ProposalCategory.TV_ALL:
        return {
          title: "Cross-Media Híbrido",
          subtitle: "TV Linear (40%) + Digital (30%) + Comercial (30%)",
          desc: "O algoritmo penaliza propostas de TV isoladas. A pontuação exige uma extensão da campanha no ambiente digital para compor a nota máxima.",
          strategy: "Prioridade para 'Determinação de Programação' e 'Turno Noturno'. O bloco Digital (Portal+Social) representa 30% da nota, tornando obrigatória a entrega multiplataforma. O CPM e Branded Content fecham os 30% finais.",
          blocks: [
            { name: "Entrega TV (Técnica)", value: 40, color: "bg-blue-500" },
            { name: "Eco Digital", value: 30, color: "bg-purple-500" },
            { name: "Eficiência Comercial", value: 30, color: "bg-green-500" }
          ]
        };
      case ProposalCategory.PORTAL_SOCIAL:
        return {
          title: "Engajamento & Autoridade",
          subtitle: "Social (60%) + Portal (40%)",
          desc: "Modelo de complementaridade onde a força das Redes Sociais tem preponderância sobre o inventário de Portal.",
          strategy: "Nas Redes Sociais (60% da nota), priorizamos 'Diversidade de Formatos' e 'Alcance Real' em detrimento de 'Seguidores' (métrica de vaidade). No Portal (40%), a 'Visibilidade Privilegiada' e o CPM são os drivers principais.",
          blocks: [
            { name: "Redes Sociais", value: 60, color: "bg-pink-500" },
            { name: "Portal (Autoridade)", value: 40, color: "bg-orange-500" }
          ]
        };
      case ProposalCategory.YOUTUBE_ALL:
        return {
          title: "Video Ecology",
          subtitle: "YouTube Core (60%) + Apoio (40%)",
          desc: "Foca na qualidade da retenção e volume de views dentro do YouTube, tratando outras mídias como suporte de distribuição.",
          strategy: "Performance de vídeo e CPM somam 60% da decisão. Portal e Redes Sociais entram com 20% cada, focados estritamente em Regionalização e Alcance, com peso mínimo para número de seguidores.",
          blocks: [
            { name: "YouTube Core", value: 60, color: "bg-red-500" },
            { name: "Portal (Apoio)", value: 20, color: "bg-orange-500" },
            { name: "Social (Apoio)", value: 20, color: "bg-pink-500" }
          ]
        };
        case ProposalCategory.PORTAL_BLOG:
        return {
          title: "Display Performance",
          subtitle: "Visibilidade + Custo + Audiência",
          desc: "Modelo focado em performance de display (banners), eficiência de custo e garantia de que o anúncio será visto.",
          strategy: "A 'Visibilidade Privilegiada' (15%) tem peso triplo em relação ao 'Branded Content' (5%). O objetivo é maximizar o ROI buscando o menor CPM possível (25%) em portais de alta audiência auditada.",
          blocks: [
            { name: "Métricas de Portal", value: 70, color: "bg-orange-500" },
            { name: "Comercial (CPM/CPC)", value: 30, color: "bg-green-500" }
          ]
        };
      default:
        return { title: "", subtitle: "", desc: "", strategy: "", blocks: [] };
    }
  };

  const groupedCriteria = useMemo(() => {
    const applicableIds = EVALUATION_MATRIX
        .filter(c => !c.applicableCategories || c.applicableCategories.includes(activeCategory))
        .map(c => c.id);

    const weights = getCriteriaWeights(activeCategory, applicableIds);

    const list = applicableIds.map(id => {
        const criterion = EVALUATION_MATRIX.find(c => c.id === id);
        return {
            id,
            label: criterion?.criterion || id,
            indicator: criterion?.indicator || '',
            weight: weights[id] || 0,
            percentage: (weights[id] || 0) * 100
        };
    }).sort((a, b) => b.weight - a.weight);

    // Grouping Logic - Adjusted thresholds to better visualize the new weight distribution
    const high = list.filter(i => i.percentage >= 8.0);
    const medium = list.filter(i => i.percentage >= 3.0 && i.percentage < 8.0);
    const low = list.filter(i => i.percentage < 3.0);

    return { high, medium, low };

  }, [activeCategory]);

  if (!isOpen) return null;

  const logic = getLogicDescription(activeCategory);

  const renderTierList = (items: typeof groupedCriteria.high, title: string, colorClass: string, icon: React.ReactNode) => {
      if (items.length === 0) return null;
      return (
          <div className="mb-6 last:mb-0">
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${colorClass}`}>
                  {icon}
                  {title}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                  {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-neutral-800/40 rounded border border-neutral-800 hover:border-neutral-600 transition-colors group">
                          <div className="flex-1 pr-4">
                              <p className="text-sm font-medium text-neutral-200 group-hover:text-white leading-tight">{item.label}</p>
                              <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{item.indicator}</p>
                          </div>
                          <div className="text-right">
                              <span className={`text-sm font-bold ${colorClass}`}>
                                  {item.percentage.toFixed(1)}%
                              </span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
      <div className="bg-brand-dark border border-[var(--border-primary)] rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Compacto */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--border-primary)] flex justify-between items-center bg-neutral-900">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-yellow/10 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"/></svg>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] leading-none">Estratégia do Algoritmo</h2>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Lógica de ponderação e pesos por critério</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                <span className="sr-only">Fechar</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Category Tabs */}
        <div className="flex-shrink-0 bg-neutral-900/50 border-b border-[var(--border-primary)] overflow-x-auto no-scrollbar">
            <div className="flex px-4">
                {[ProposalCategory.TV_ALL, ProposalCategory.PORTAL_SOCIAL, ProposalCategory.PORTAL_BLOG, ProposalCategory.YOUTUBE_ALL].map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border-b-2
                            ${activeCategory === cat 
                                ? 'text-brand-yellow border-brand-yellow bg-brand-yellow/5' 
                                : 'text-neutral-400 border-transparent hover:text-neutral-200 hover:bg-neutral-800'
                            }`}
                    >
                        {cat === ProposalCategory.TV_ALL && <TvIcon className="w-4 h-4" />}
                        {cat === ProposalCategory.PORTAL_SOCIAL && <SocialIcon className="w-4 h-4" />}
                        {cat === ProposalCategory.PORTAL_BLOG && <PortalIcon className="w-4 h-4" />}
                        {cat === ProposalCategory.YOUTUBE_ALL && <YoutubeIcon className="w-4 h-4" />}
                        {cat.split(' + ')[0]}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Body - Two Columns */}
        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
            
            {/* Left Column: Strategy Summary */}
            <div className="w-full lg:w-1/3 bg-neutral-900/30 border-b lg:border-b-0 lg:border-r border-[var(--border-primary)] p-6 overflow-y-auto no-scrollbar flex flex-col">
                <div className="flex-grow">
                    <span className="text-[10px] font-bold text-brand-yellow uppercase tracking-widest mb-2 block">Conceito Central</span>
                    <h3 className="text-2xl font-bold text-white mb-1">{logic.title}</h3>
                    <p className="text-sm font-medium text-neutral-400 mb-4">{logic.subtitle}</p>
                    <p className="text-sm text-neutral-300 leading-relaxed bg-neutral-800/50 p-4 rounded-lg border border-neutral-700 mb-6">
                        {logic.desc}
                    </p>

                    <span className="text-[10px] font-bold text-brand-yellow uppercase tracking-widest mb-2 block">Diretriz Estratégica</span>
                    <p className="text-sm text-neutral-200 leading-relaxed bg-brand-yellow/5 p-4 rounded-lg border border-brand-yellow/10">
                        {logic.strategy}
                    </p>
                </div>

                <div className="mt-6 pt-6 border-t border-neutral-800">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 block">Distribuição de Pesos</span>
                    <div className="space-y-3">
                         {logic.blocks.map((block, idx) => (
                            <div key={idx} className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${block.color}`}></div>
                                        <span className="text-xs font-semibold text-neutral-300 uppercase">
                                            {block.name}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold text-white">
                                        {block.value}%
                                    </span>
                                </div>
                                <div className="overflow-hidden h-1.5 mb-1 text-xs flex rounded bg-neutral-800">
                                    <div style={{ width: `${block.value}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${block.color}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Detailed Breakdown (Scrollable with hidden bar) */}
            <div className="w-full lg:w-2/3 bg-brand-dark p-6 overflow-y-auto scroll-smooth no-scrollbar">
                 <div className="max-w-3xl mx-auto">
                    {renderTierList(
                        groupedCriteria.high, 
                        "Fatores Determinantes (Impacto Alto)", 
                        "text-brand-yellow",
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    )}
                    
                    {renderTierList(
                        groupedCriteria.medium, 
                        "Fatores de Composição (Impacto Médio)", 
                        "text-blue-400",
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    
                    {renderTierList(
                        groupedCriteria.low, 
                        "Fatores Detalhes e Bônus (Impacto Baixo)", 
                        "text-neutral-500",
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default StrategyModal;
