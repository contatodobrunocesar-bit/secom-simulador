
import React, { useState, useMemo } from 'react';
import { Proposal, SocialMediaChannel, SOCIAL_MEDIA_CHANNELS, ProposalVersion, ProposalCategory } from '../types';
import { PROPOSAL_CATEGORIES } from '../constants';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckIcon } from './icons/CheckIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { FilterIcon } from './icons/FilterIcon';

interface ProposalListProps {
  proposals: Proposal[];
  selectedProposalId: string | null;
  comparisonSelection: string[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onToggleComparison: (id: string) => void;
  onCompare: () => void;
  onDownload: () => void;
}

const getActiveVersion = (proposal: Proposal): ProposalVersion | null => {
  if (!proposal || proposal.versions.length === 0) {
    return null;
  }
  return proposal.versions[proposal.currentVersion - 1] || null;
};

const ScoreBar: React.FC<{ score: number }> = ({ score }) => {
    const percentage = (score / 3) * 100;

    let barColorClass = 'bg-[var(--color-bad)]';
    if (score >= 1.5) barColorClass = 'bg-[var(--color-warn)]';
    if (score >= 2.25) barColorClass = 'bg-[var(--color-good)]';

    return (
        <div className="w-full bg-neutral-700/80 rounded-full h-1.5 mt-2">
            <div
                className={`h-1.5 rounded-full ${barColorClass} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};


const ProposalList: React.FC<ProposalListProps> = ({
  proposals,
  selectedProposalId,
  comparisonSelection,
  onSelect,
  onAdd,
  onDelete,
  onToggleComparison,
  onCompare,
  onDownload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [rfFilter, setRfFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [socialChannelFilter, setSocialChannelFilter] = useState('all');
  const [cpcFilter, setCpcFilter] = useState('all');
  const [cpmFilter, setCpmFilter] = useState('all');

  const uniqueCities = useMemo(() => ['all', ...Array.from(new Set(proposals.map(p => p.city).filter((c): c is string => !!c)))], [proposals]);
  const uniqueRFs = useMemo(() => ['all', ...Array.from(new Set(proposals.map(p => p.region).filter((r): r is string => !!r)))], [proposals]);
  const uniqueVehicles = useMemo(() => ['all', ...Array.from(new Set(proposals.map(p => p.vehicle).filter((v): v is string => !!v)))], [proposals]);

  const cpmFilterOptions = [
      { value: 'all', label: 'Todos os valores' },
      { value: 'lt20', label: '< R$ 20' },
      { value: '20-40', label: 'R$ 20-40' },
      { value: '40-60', label: 'R$ 40-60' },
      { value: 'gt60', label: '> R$ 60' },
  ];

  const cpcFilterOptions = [
      { value: 'all', label: 'Todos os valores' },
      { value: 'lt1', label: '< R$ 1' },
      { value: '1-2', label: 'R$ 1-2' },
      { value: '2-3', label: 'R$ 2-3' },
      { value: 'gt3', label: '> R$ 3' },
  ];

  const filteredProposals = useMemo(() => {
    const cpmRanges = {
        'lt20': { max: 19.99 },
        '20-40': { min: 20, max: 40 },
        '40-60': { min: 40.01, max: 60 },
        'gt60': { min: 60.01 },
    };
    
    const cpcRanges = {
        'lt1': { max: 0.99 },
        '1-2': { min: 1, max: 2 },
        '2-3': { min: 2.01, max: 3 },
        'gt3': { min: 3.01 },
    };

    const checkRange = (valueStr: any, rangeKey: string, ranges: { [key: string]: { min?: number, max?: number } }) => {
        const value = parseFloat(String(valueStr));
        if (isNaN(value)) return false;

        const range = ranges[rangeKey];
        if (!range) return false;

        const { min, max } = range;
        
        const minCheck = min !== undefined ? value >= min : true;
        const maxCheck = max !== undefined ? value <= max : true;
        
        return minCheck && maxCheck;
    };
      
    return proposals.filter(p => {
        const activeVersion = getActiveVersion(p);
        
        // Search Filter
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(searchLower);
        const vehicleNameMatch = (p.vehicle || '').toLowerCase().includes(searchLower);
        const searchMatch = searchTerm === '' || nameMatch || vehicleNameMatch;

        const categoryMatch = categoryFilter === 'all' || p.category === categoryFilter;
        const cityMatch = cityFilter === 'all' || p.city === cityFilter;
        const rfMatch = rfFilter === 'all' || p.region === rfFilter;
        const vehicleMatch = vehicleFilter === 'all' || p.vehicle === vehicleFilter;
        
        const channelMatch = socialChannelFilter === 'all' || (p.socialChannels?.includes(socialChannelFilter as SocialMediaChannel));
        
        const cpmMatch = cpmFilter === 'all' || (activeVersion?.preFormData.cpm !== undefined && checkRange(activeVersion.preFormData.cpm, cpmFilter, cpmRanges));
        
        const cpcMatch = cpcFilter === 'all' || (activeVersion?.preFormData.cpc !== undefined && checkRange(activeVersion.preFormData.cpc, cpcFilter, cpcRanges));
        
        return searchMatch && categoryMatch && cityMatch && rfMatch && vehicleMatch && channelMatch && cpmMatch && cpcMatch;
    });
  }, [proposals, categoryFilter, cityFilter, rfFilter, vehicleFilter, socialChannelFilter, cpmFilter, cpcFilter, searchTerm]);


  const selectStyles = "w-full text-xs px-2 py-1.5 bg-neutral-800/80 border border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-yellow focus:border-brand-yellow text-neutral-300";

  return (
    <div className="brand-panel rounded-lg p-5 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Painel de propostas</h2>
          {comparisonSelection.length > 0 && (
             <button 
                onClick={onDownload}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-brand-yellow rounded-md transition-colors"
                title="Baixar dados das selecionadas (CSV)"
             >
                 <DownloadIcon className="w-5 h-5" />
             </button>
          )}
      </div>

      {proposals.length > 0 && (
          <div className="mb-4 space-y-3 pb-4 border-b border-[var(--border-primary)]">
              <div>
                  <input 
                    type="text"
                    placeholder="Buscar proposta ou veículo..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-brand-yellow"
                  />
              </div>

              <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                      <label htmlFor="category-list-filter" className="block text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
                          <FilterIcon className="w-3 h-3" /> Tipo de compra
                      </label>
                      <select id="category-list-filter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectStyles}>
                          <option value="all">Todos os tipos</option>
                          {PROPOSAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="city-list-filter" className="block text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">Cidade</label>
                      <select id="city-list-filter" value={cityFilter} onChange={e => setCityFilter(e.target.value)} className={selectStyles}>
                          {uniqueCities.map(city => <option key={city} value={city}>{city === 'all' ? 'Todas' : city}</option>)}
                      </select>
                  </div>
                   <div>
                      <label htmlFor="rf-list-filter" className="block text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">Região (RF)</label>
                      <select id="rf-list-filter" value={rfFilter} onChange={e => setRfFilter(e.target.value)} className={selectStyles}>
                          {uniqueRFs.map(rf => <option key={rf} value={rf}>{rf === 'all' ? 'Todas' : rf}</option>)}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="vehicle-list-filter" className="block text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">Veículo</label>
                      <select id="vehicle-list-filter" value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} className={selectStyles}>
                          {uniqueVehicles.map(v => <option key={v} value={v}>{v === 'all' ? 'Todas' : v}</option>)}
                      </select>
                  </div>
                   <div>
                      <label htmlFor="channel-list-filter" className="block text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">Canal social</label>
                      <select id="channel-list-filter" value={socialChannelFilter} onChange={e => setSocialChannelFilter(e.target.value)} className={selectStyles}>
                           <option value="all">Todos</option>
                           {SOCIAL_MEDIA_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="cpm-list-filter" className="block text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">CPM</label>
                      <select id="cpm-list-filter" value={cpmFilter} onChange={e => setCpmFilter(e.target.value)} className={selectStyles}>
                           {cpmFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="cpc-list-filter" className="block text-[10px] uppercase font-bold text-[var(--text-tertiary)] mb-1">CPC</label>
                      <select id="cpc-list-filter" value={cpcFilter} onChange={e => setCpcFilter(e.target.value)} className={selectStyles}>
                           {cpcFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                  </div>
              </div>
          </div>
      )}

      <div className="space-y-3 flex-grow overflow-y-auto pr-2">
        {filteredProposals.length > 0 ? filteredProposals.map(proposal => {
          const activeVersion = getActiveVersion(proposal);
          const totalScore = activeVersion?.totalScore ?? 0;
          const isSelectedForComparison = comparisonSelection.includes(proposal.id);

          return (
            <div
              key={proposal.id}
              className={`relative rounded-lg transition-all duration-200 border group
                ${selectedProposalId === proposal.id ? 'bg-brand-yellow/10 border-brand-yellow' : 'bg-neutral-900/40 border-transparent hover:border-brand-yellow/30'}`
              }
            >
              <div className="p-4 flex items-start gap-3">
                 {/* Custom Checkbox Area - Increased click target */}
                 <div 
                    className="pt-1 pr-2 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onToggleComparison(proposal.id); }}
                 >
                     <div 
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 
                            ${isSelectedForComparison 
                                ? 'bg-brand-yellow border-brand-yellow shadow-[0_0_8px_rgba(251,186,0,0.5)]' 
                                : 'bg-neutral-800 border-neutral-600 hover:border-brand-yellow'
                            }`}
                     >
                        {isSelectedForComparison && <CheckIcon className="w-3.5 h-3.5 text-neutral-900 stroke-[3]" />}
                     </div>
                 </div>
                 
                <div className="flex-grow cursor-pointer" onClick={() => onSelect(proposal.id)}>
                  <div className="flex items-center justify-between">
                      <p className={`font-semibold text-sm leading-tight ${selectedProposalId === proposal.id ? 'text-brand-yellow' : 'text-[var(--text-primary)]'}`}>
                        {proposal.name}
                      </p>
                      <span className={`text-sm font-bold ml-2 ${selectedProposalId === proposal.id ? 'text-brand-yellow' : 'text-[var(--text-secondary)]'}`}>
                          {totalScore.toFixed(1)}
                      </span>
                  </div>
                  
                   <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      {proposal.vehicle} • R$ {proposal.investment.toLocaleString('pt-BR', { notation: "compact" })}
                  </p>

                  <ScoreBar score={totalScore} />
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if(confirm('Tem certeza que deseja excluir esta proposta?')) {
                     onDelete(proposal.id);
                  }
                }}
                className="absolute -top-2 -right-2 p-1.5 bg-neutral-800 text-slate-500 hover:text-brand-red rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                title="Excluir proposta"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        }) : (
             <div className="text-center py-8">
                <p className="text-sm text-[var(--text-tertiary)]">
                    {proposals.length === 0 
                        ? 'Nenhuma proposta criada ainda.'
                        : 'Nenhuma proposta encontrada com os filtros atuais.'}
                </p>
            </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border-primary)] space-y-3">
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow text-brand-dark font-bold rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all duration-200"
        >
          <PlusIcon className="w-5 h-5" />
          Nova proposta
        </button>
        {proposals.length > 0 && (
             <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={onCompare}
                    disabled={comparisonSelection.length < 2}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-700 text-neutral-200 font-semibold rounded-lg shadow-md hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed"
                  >
                    {comparisonSelection.length < 2 
                        ? `Selecione +${2 - comparisonSelection.length} para comparar` 
                        : `Comparar (${comparisonSelection.length})`}
                  </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProposalList;
