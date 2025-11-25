
import React, { useState, useEffect } from 'react';
import { CITIES_RS } from '../data/cities';
import { PlusIcon } from './icons/PlusIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';

interface WelcomeProps {
    onCreateProposal: (data: { name: string; vehicle: string; investment: number; city: string; region: string; proposalDate: string; campaignPeriod: string; }) => void;
    onCompare: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onCreateProposal, onCompare }) => {
    const [view, setView] = useState<'hub' | 'form'>('hub');
    const [name, setName] = useState('');
    const [vehicle, setVehicle] = useState('');
    const [proposalDate, setProposalDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [campaignPeriod, setCampaignPeriod] = useState('');
    const [durationText, setDurationText] = useState('');
    const [investment, setInvestment] = useState<number | ''>('');
    const [city, setCity] = useState('');
    const [region, setRegion] = useState('');
    const [periodInputMethod, setPeriodInputMethod] = useState<'dateRange' | 'months'>('dateRange');
    const [campaignMonths, setCampaignMonths] = useState<number | ''>('');


    useEffect(() => {
        if (periodInputMethod === 'dateRange' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (end >= start) {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                const formattedStart = start.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const formattedEnd = end.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                
                setDurationText(`Período total: ${diffDays} dias`);
                setCampaignPeriod(`${formattedStart} a ${formattedEnd} (${diffDays} dias)`);
            } else {
                setDurationText('Data final deve ser igual ou posterior à data inicial.');
                setCampaignPeriod('');
            }
        } else if (periodInputMethod === 'dateRange') {
            setDurationText('');
            setCampaignPeriod('');
        }
    }, [startDate, endDate, periodInputMethod]);

    useEffect(() => {
        if (periodInputMethod === 'months' && campaignMonths) {
            const periodStr = `${campaignMonths} ${campaignMonths > 1 ? 'meses' : 'mês'}`;
            setCampaignPeriod(periodStr);
            setDurationText(`Período total: ${periodStr}`);
            setStartDate('');
            setEndDate('');
        } else if (periodInputMethod === 'months') {
            setCampaignPeriod('');
            setDurationText('');
        }
    }, [campaignMonths, periodInputMethod]);

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCityName = e.target.value;
        const cityData = CITIES_RS.find(c => c.name === selectedCityName);
        setCity(selectedCityName);
        setRegion(cityData ? cityData.rf : '');
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && vehicle && investment !== '' && city && proposalDate && campaignPeriod) {
             onCreateProposal({ name, vehicle, investment: Number(investment) / 100, city, region, proposalDate, campaignPeriod });
        }
    };
    
    const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value === '') {
            setInvestment('');
        } else {
            setInvestment(Number(value));
        }
    };

    const formatCurrency = (value: number | '') => {
        if (value === '' || value === null || value === undefined) return '';
        const numberValue = Number(value) / 100;
        return numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    
    const isFormInvalid = !name || !vehicle || investment === '' || !city || !proposalDate || !campaignPeriod;

    if (view === 'hub') {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center p-8 brand-panel rounded-lg">
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Bem-vindo(a) ao avaliador de mídia digital da SECOM/RS</h2>
                <p className="text-[var(--text-tertiary)] mt-2 mb-10 max-w-lg">Esta é uma ferramenta estratégica para análise de propostas de mídia digital e comunitária e seu uso é exclusivo para ações da SECOM/RS.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                    <button onClick={() => setView('form')} className="p-6 text-left bg-neutral-800/80 rounded-lg hover:bg-brand-yellow/10 transition-all border border-neutral-700 hover:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow flex flex-col items-start">
                        <div className="p-3 bg-brand-yellow/20 rounded-lg mb-4">
                           <PlusIcon className="w-6 h-6 text-brand-yellow" />
                        </div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">Analisar nova proposta</h3>
                        <p className="text-sm text-[var(--text-tertiary)] mt-1">Comece inserindo os dados de uma nova proposta para avaliação.</p>
                    </button>
                    <div className="p-6 text-left bg-neutral-800/50 rounded-lg border border-neutral-700 flex flex-col items-start">
                        <div className="p-3 bg-neutral-500/20 rounded-lg mb-4">
                            <ListBulletIcon className="w-6 h-6 text-neutral-400" />
                        </div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">Gerenciar propostas</h3>
                        <p className="text-sm text-[var(--text-tertiary)] mt-1">Utilize o "Painel de propostas" ao lado para editar, analisar ou excluir propostas existentes.</p>
                    </div>
                    <button onClick={onCompare} className="p-6 text-left bg-neutral-800/80 rounded-lg hover:bg-brand-green/10 transition-all border border-neutral-700 hover:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green flex flex-col items-start">
                        <div className="p-3 bg-brand-green/20 rounded-lg mb-4">
                           <ChartBarIcon className="w-6 h-6 text-brand-green" />
                        </div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">Comparar propostas</h3>
                        <p className="text-sm text-[var(--text-tertiary)] mt-1">Compare as métricas e análises de duas ou mais propostas lado a lado.</p>
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 brand-panel rounded-lg relative">
             <button onClick={() => setView('hub')} className="absolute top-6 left-6 text-sm text-brand-yellow hover:text-yellow-300 font-semibold">
                &larr; Voltar
            </button>
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Nova análise de mídia</h2>
            <p className="text-[var(--text-tertiary)] mt-2 mb-10 max-w-md">Insira as informações básicas.</p>
            
            <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6 text-left">
                <div>
                    <label htmlFor="proposalName" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Nome da proposta</label>
                    <input
                        type="text"
                        id="proposalName"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="block w-full px-3 py-2 bg-neutral-900/70 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="proposalVehicle" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Veículo</label>
                    <input
                        type="text"
                        id="proposalVehicle"
                        value={vehicle}
                        onChange={e => setVehicle(e.target.value)}
                        className="block w-full px-3 py-2 bg-neutral-900/70 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="proposalDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Data da proposta</label>
                    <input
                        type="date"
                        id="proposalDate"
                        value={proposalDate}
                        onChange={e => setProposalDate(e.target.value)}
                        className="block w-full px-3 py-2 bg-neutral-900/70 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow"
                        required
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Período de aproveitamento</label>
                    <div className="flex rounded-md bg-neutral-800/80 p-1 mb-3">
                        <button
                            type="button"
                            onClick={() => setPeriodInputMethod('dateRange')}
                            className={`w-full px-3 py-1.5 text-sm font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 ${
                            periodInputMethod === 'dateRange'
                                ? 'bg-brand-yellow/10 text-brand-yellow shadow-sm'
                                : 'text-neutral-300 hover:bg-neutral-700/80'
                            }`}
                        >
                            Datas específicas
                        </button>
                        <button
                            type="button"
                            onClick={() => setPeriodInputMethod('months')}
                            className={`w-full px-3 py-1.5 text-sm font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 ${
                            periodInputMethod === 'months'
                                ? 'bg-brand-yellow/10 text-brand-yellow shadow-sm'
                                : 'text-neutral-300 hover:bg-neutral-700/80'
                            }`}
                        >
                            Por meses
                        </button>
                    </div>

                    {periodInputMethod === 'dateRange' ? (
                        <div className="flex items-center gap-4">
                            <input
                                type="date"
                                id="startDate"
                                aria-label="Data de início"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="block w-full px-3 py-2 bg-neutral-900/70 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow"
                                required={periodInputMethod === 'dateRange'}
                            />
                            <span className="text-neutral-400">até</span>
                            <input
                                type="date"
                                id="endDate"
                                aria-label="Data de término"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                min={startDate}
                                className="block w-full px-3 py-2 bg-neutral-900/70 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow"
                                required={periodInputMethod === 'dateRange'}
                            />
                        </div>
                    ) : (
                        <div>
                            <select
                                id="campaignMonths"
                                value={campaignMonths}
                                onChange={e => setCampaignMonths(Number(e.target.value))}
                                className="block w-full px-3 py-2 bg-neutral-900/70 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow"
                                required={periodInputMethod === 'months'}
                            >
                                <option value="">Selecione a duração</option>
                                {[...Array(12).keys()].map(i => (
                                    <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'mês' : 'meses'}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {durationText && <p className={`mt-2 text-sm font-medium ${campaignPeriod ? 'text-brand-yellow' : 'text-brand-red'}`}>{durationText}</p>}
                </div>
                 <div>
                    <label htmlFor="proposalInvestment" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Investimento bruto total (R$)</label>
                    <input
                        type="text"
                        id="proposalInvestment"
                        value={formatCurrency(investment)}
                        onChange={handleInvestmentChange}
                        className="block w-full px-3 py-2 bg-neutral-900/70 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="proposalCity" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cidade principal de veiculação/do veículo</label>
                    <select
                        id="proposalCity"
                        value={city}
                        onChange={handleCityChange}
                        className="block w-full px-3 py-2 bg-neutral-900/70 border border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow"
                        required
                    >
                        <option value="">Selecione uma cidade do RS</option>
                        {CITIES_RS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    {region && <p className="mt-2 text-xs text-[var(--text-tertiary)]">Região Funcional: <span className="font-semibold text-[var(--text-secondary)]">{region}</span></p>}
                </div>

                <button
                    type="submit"
                    disabled={isFormInvalid}
                    className="w-full px-6 py-3 bg-brand-yellow text-brand-dark font-bold rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-brand-panel transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Inserir proposta e configurar &rarr;
                </button>
            </form>
        </div>
    );
};

export default Welcome;
