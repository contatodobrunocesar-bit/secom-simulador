import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Proposal } from '../types';
import { UploadIcon } from './icons/UploadIcon';

interface PdfUploadProps {
    proposal: Proposal;
    onFileAnalysis: (file: File) => void;
    isLoading: boolean;
    loadingMessage: string;
    onSkip: () => void;
    onBack: () => void;
}

const PdfUpload: React.FC<PdfUploadProps> = ({ proposal, onFileAnalysis, isLoading, loadingMessage, onSkip, onBack }) => {

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0 && !isLoading) {
            onFileAnalysis(acceptedFiles[0]);
        }
    }, [onFileAnalysis, isLoading]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
        disabled: isLoading,
    });

    return (
        <div className="brand-panel rounded-lg p-6 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Configurar proposta</h2>
                 <div className="mt-4 p-4 bg-neutral-900/40 rounded-lg border border-[var(--border-primary)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                    <p className="text-sm text-[var(--text-secondary)]">Proposta: <span className="font-semibold text-[var(--text-primary)]">{proposal.name}</span></p>
                    <p className="text-sm text-[var(--text-secondary)]">Veículo: <span className="font-semibold text-[var(--text-primary)]">{proposal.vehicle}</span></p>
                    <p className="text-sm text-[var(--text-secondary)]">Investimento: <span className="font-semibold text-[var(--text-primary)]">R$ {proposal.investment.toLocaleString('pt-BR')}</span></p>
                    <p className="text-sm text-[var(--text-secondary)]">Data da Proposta: <span className="font-semibold text-[var(--text-primary)]">{new Date(proposal.proposalDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></p>
                    <p className="text-sm text-[var(--text-secondary)]">Período: <span className="font-semibold text-[var(--text-primary)]">{proposal.campaignPeriod}</span></p>
                    <p className="text-sm text-[var(--text-secondary)]">Cidade: <span className="font-semibold text-[var(--text-primary)]">{proposal.city} {proposal.region && `(${proposal.region})`}</span></p>
                </div>
            </div>
            
            <div className="pt-6 border-t border-[var(--border-primary)]">
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">Acelere com IA (opcional)</h3>
                    <p className="mt-1 text-[var(--text-tertiary)] max-w-2xl mx-auto">Envie o PDF da proposta comercial para que a IA preencha os dados de pontuação para você. Ou, se preferir, pule esta etapa.</p>
                </div>
                <div className="mt-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                            <div className="w-full max-w-sm">
                                <style>{`
                                    @keyframes scan {
                                        0% { transform: translateX(-10%); }
                                        100% { transform: translateX(1000%); }
                                    }
                                    .animate-scan {
                                        animation: scan 2s linear infinite;
                                    }
                                `}</style>
                                <div className="relative w-full h-12 bg-neutral-900/50 rounded-lg overflow-hidden border border-brand-yellow/30">
                                    <div className="absolute top-0 left-0 h-full w-2 bg-brand-yellow shadow-[0_0_15px_3px_rgba(251,186,0,0.3)] animate-scan"></div>
                                </div>
                            </div>
                            <p className="text-[var(--text-tertiary)] mt-4">
                                {loadingMessage}
                                <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
                            </p>
                        </div>
                    ) : (
                        <div
                            {...getRootProps()}
                            className={`w-full p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
                            ${isDragActive ? 'border-brand-yellow bg-brand-yellow/10' : 'border-neutral-700 hover:border-brand-yellow'}`}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                                <UploadIcon className="w-10 h-10 mb-3 text-neutral-500" />
                                {isDragActive ?
                                    <p className="font-semibold text-[var(--text-secondary)]">Solte o arquivo aqui...</p> :
                                    <>
                                        <p className="font-semibold text-[var(--text-secondary)]">Arraste e solte o PDF da proposta aqui</p>
                                        <p className="text-sm my-1">ou clique para selecionar</p>
                                    </>
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

             <div className="mt-8 pt-6 border-t border-[var(--border-primary)] flex justify-between items-center">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-semibold"
                >
                    &larr; Voltar e descartar
                </button>
                <button
                    type="button"
                    onClick={onSkip}
                    className="px-6 py-2.5 bg-neutral-700 text-neutral-200 font-semibold rounded-lg shadow-md hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-opacity-75 transition-colors"
                >
                    Pular e preencher manualmente &rarr;
                </button>
            </div>

        </div>
    );
};

export default PdfUpload;