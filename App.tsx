
import React, { useState, useMemo, useEffect } from 'react';
import { Proposal, View, ProposalVersion, ProposalCategory } from './types';
import Header from './components/Header';
import ProposalList from './components/ProposalList';
import ProposalForm from './components/ProposalForm';
import ComparisonChart from './components/ComparisonChart';
import ProposalCategorization from './components/ProposalCategorization';
import PreForm from './components/PreForm';
import Welcome from './components/Welcome';
import StrategyModal from './components/StrategyModal';
import { EVALUATION_MATRIX } from './constants';
import { getCriteriaWeights } from './weights';


const App: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>(() => {
    try {
        const savedProposals = localStorage.getItem('govrs-media-matrix-proposals');
        if (!savedProposals) return [];

        const parsed = JSON.parse(savedProposals);
        const proposalsArray = Array.isArray(parsed) ? parsed : [parsed];
        
        const seenIds = new Set<string>();

        return proposalsArray
            .filter(p => p && typeof p === 'object')
            .map((p, index) => {
                let id = (p.id && typeof p.id === 'string') ? p.id : `prop_${Date.now()}_${index}`;
                if (seenIds.has(id)) {
                    id = `${id}_${index}_${Math.floor(Math.random() * 9999)}`;
                }
                seenIds.add(id);

                const safePreFormData = p.preFormData && typeof p.preFormData === 'object' ? p.preFormData : {};
                
                let versions: ProposalVersion[] = [];
                
                if (Array.isArray(p.versions)) {
                    versions = p.versions.map((v: any, vIndex: number) => ({
                        versionNumber: Number(v.versionNumber) || (vIndex + 1),
                        createdAt: v.createdAt || new Date().toISOString(),
                        scores: v.scores && typeof v.scores === 'object' ? v.scores : {},
                        totalScore: Number(v.totalScore) || 0,
                        aiAnalysis: typeof v.aiAnalysis === 'string' ? v.aiAnalysis : '',
                        preFormData: v.preFormData && typeof v.preFormData === 'object' ? v.preFormData : {},
                    }));
                } else {
                    versions = [{
                        versionNumber: 1,
                        createdAt: new Date().toISOString(),
                        scores: p.scores && typeof p.scores === 'object' ? p.scores : {},
                        totalScore: Number(p.totalScore) || 0,
                        aiAnalysis: typeof p.aiAnalysis === 'string' ? p.aiAnalysis : '',
                        preFormData: safePreFormData,
                    }];
                }

                let currentVersion = Number(p.currentVersion);
                if (isNaN(currentVersion) || currentVersion < 1) {
                    currentVersion = versions.length > 0 ? versions.length : 1; 
                }
                if (currentVersion > versions.length) {
                     currentVersion = versions.length;
                }

                // Migration: Update old category string to new one if found
                let category = p.category;
                if (category === 'Televisão + Portal/Blog + Redes Sociais + Outras Ações') {
                    category = ProposalCategory.TV_ALL;
                }
                // Migration for swapped Portal/Social category
                if (category === 'Portal/Blog + Redes Sociais') {
                    category = ProposalCategory.PORTAL_SOCIAL;
                }

                return {
                    id: id,
                    name: typeof p.name === 'string' ? p.name : 'Proposta sem nome',
                    vehicle: typeof p.vehicle === 'string' ? p.vehicle : '',
                    investment: Number(p.investment) || 0,
                    category: category || null,
                    preFormData: safePreFormData,
                    city: p.city || '',
                    region: p.region || '',
                    maxCompletedStep: Number(p.maxCompletedStep) || 1,
                    socialChannels: Array.isArray(p.socialChannels) ? p.socialChannels : [],
                    proposalDate: p.proposalDate || new Date().toISOString().split('T')[0],
                    campaignPeriod: p.campaignPeriod || '',
                    versions: versions,
                    currentVersion: currentVersion,
                };
            });
    } catch (error) {
        console.error("Erro crítico ao ler propostas do localStorage. Iniciando com lista vazia.", error);
        return [];
    }
  });
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [comparisonSelection, setComparisonSelection] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<View>(View.UPLOAD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);

  useEffect(() => {
    try {
        localStorage.setItem('govrs-media-matrix-proposals', JSON.stringify(proposals));
    } catch (error) {
        console.error("Erro ao salvar propostas no localStorage", error);
    }
  }, [proposals]);

  const selectedProposal = useMemo(() => {
    return proposals.find(p => p.id === selectedProposalId) || null;
  }, [proposals, selectedProposalId]);
  
  const proposalsForComparison = useMemo(() => {
    return proposals.filter(p => comparisonSelection.includes(p.id));
  }, [proposals, comparisonSelection]);


  const handleCreateProposal = (initialData: { name: string; vehicle: string; investment: number; city: string; region: string; proposalDate: string, campaignPeriod: string }) => {
    const newProposal: Proposal = {
      id: `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Ensure unique ID on creation
      name: initialData.name,
      vehicle: initialData.vehicle,
      investment: initialData.investment,
      city: initialData.city,
      region: initialData.region,
      proposalDate: initialData.proposalDate,
      campaignPeriod: initialData.campaignPeriod,
      category: null,
      preFormData: {},
      maxCompletedStep: 1,
      versions: [],
      currentVersion: 0,
    };
    setProposals(prev => [...prev, newProposal]);
    setSelectedProposalId(newProposal.id);
    setCurrentView(View.CATEGORIZATION);
  };
  
  const handleDownloadComparison = () => {
    if (comparisonSelection.length === 0) {
        alert("Selecione pelo menos uma proposta para baixar os dados.");
        return;
    }

    const selectedProposals = proposals.filter(p => comparisonSelection.includes(p.id));
    
    // CSV Header
    const headers = [
        "ID", "Nome", "Veículo", "Investimento", "Cidade", "Região", "Data", "Período", "Pontuação total", "Análise da IA"
    ];
    
    // Dynamic Headers from Matrix - Extended to show weights and calculations
    EVALUATION_MATRIX.forEach(criterion => {
        headers.push(`${criterion.criterion} (Nota 0-3)`);
        headers.push(`${criterion.criterion} (Valor)`);
        headers.push(`${criterion.criterion} (Peso)`);
        headers.push(`${criterion.criterion} (Nota Ponderada)`);
    });

    // CSV Rows
    const rows = selectedProposals.map(p => {
        const activeVersion = p.versions[p.currentVersion - 1];
        const score = activeVersion ? activeVersion.totalScore.toFixed(2) : "0.00";
        // Escape quotes for CSV and handle line breaks
        const aiAnalysis = activeVersion?.aiAnalysis ? `"${activeVersion.aiAnalysis.replace(/"/g, '""')}"` : "";
        
        const row = [
            p.id,
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.vehicle?.replace(/"/g, '""') || ''}"`,
            p.investment.toString().replace('.', ','),
            p.city || "",
            p.region || "",
            p.proposalDate,
            `"${p.campaignPeriod?.replace(/"/g, '""') || ''}"`,
            score.replace('.', ','),
            aiAnalysis
        ];

        // Calculate weights for this specific proposal version configuration to ensure accuracy in export
        let weights: { [key: string]: number } = {};
        if (activeVersion && p.category) {
            const applicableCriteria = EVALUATION_MATRIX.filter(c =>
                !c.applicableCategories || c.applicableCategories.includes(p.category!)
            );
             const consideredCriteria = applicableCriteria.filter(
                c => !activeVersion.preFormData[`${c.id}_nc`]
            );
            const consideredIds = consideredCriteria.map(c => c.id);
            weights = getCriteriaWeights(p.category, consideredIds);
        }

        EVALUATION_MATRIX.forEach(criterion => {
            if (!activeVersion) {
                 row.push("", "", "", "");
                 return;
            }
            const scoreData = activeVersion.scores[criterion.id];
            
            if (scoreData) {
                const rawScore = scoreData.score;
                let val = scoreData.value;
                if (typeof val === 'object') val = JSON.stringify(val);
                
                const weight = weights[criterion.id] || 0;
                const weightedScore = rawScore * weight;

                row.push(rawScore.toString().replace('.', ','));
                row.push(`"${String(val).replace(/"/g, '""')}"`);
                row.push(weight.toFixed(4).replace('.', ','));
                row.push(weightedScore.toFixed(4).replace('.', ','));
            } else {
                row.push("N/A", "N/A", "0", "0");
            }
        });

        return row.join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `comparativo_midia_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectProposalWrapper = (id: string) => {
    handleSelectProposal(id);
    closeSidebarOnMobile();
  };

  const handleAddNewWrapper = () => {
    handleAddNew();
    closeSidebarOnMobile();
  };

  const handleCompareWrapper = () => {
    if (comparisonSelection.length < 2) {
        alert("Selecione pelo menos duas propostas para comparar.");
        return;
    }
    setCurrentView(View.COMPARISON);
    closeSidebarOnMobile();
  };

  const handleAddNew = () => {
      setSelectedProposalId(null);
      setCurrentView(View.UPLOAD);
  }

  const handleUpdateProposal = (updatedProposal: Proposal) => {
    setProposals(proposals.map(p => p.id === updatedProposal.id ? updatedProposal : p));
  };
  
  const handleSelectProposal = (id: string) => {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal) return;
    
    setSelectedProposalId(id);
    if (proposal.versions && proposal.versions.length > 0) {
      setCurrentView(View.DETAILS);
    } else if (proposal.category) {
      setCurrentView(View.PRE_FORM);
    } else {
      setCurrentView(View.CATEGORIZATION);
    }
  };

  const handleDeleteProposal = (id: string) => {
    setProposals(proposals.filter(p => p.id !== id));
    setComparisonSelection(prev => prev.filter(pId => pId !== id)); // Remove from comparison list
    if (selectedProposalId === id) {
      setSelectedProposalId(null);
      setCurrentView(View.UPLOAD);
    }
  };

  const handleToggleComparisonSelection = (id: string) => {
    setComparisonSelection(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const getCurrentStep = () => {
    if (!selectedProposalId || currentView === View.UPLOAD) return 0;
    switch(currentView) {
      case View.CATEGORIZATION: return 1;
      case View.PRE_FORM: return 2;
      case View.DETAILS: return 3;
      case View.COMPARISON: return 4; 
      default: return 0;
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (!selectedProposal || stepIndex > selectedProposal.maxCompletedStep) {
        return;
    }

    switch (stepIndex) {
        case 1:
            setCurrentView(View.CATEGORIZATION);
            break;
        case 2:
            setCurrentView(View.PRE_FORM);
            break;
        case 3:
            setCurrentView(View.DETAILS);
            break;
        default:
            break;
    }
  };
  
  const renderContent = () => {
    if (currentView === View.UPLOAD || (!selectedProposal && currentView !== View.COMPARISON)) {
        return <Welcome onCreateProposal={handleCreateProposal} onCompare={handleCompareWrapper} />;
    }
    
    if (currentView === View.COMPARISON) {
      return <ComparisonChart 
        proposals={proposalsForComparison} 
        allProposals={proposals}
        onBack={() => {
          setCurrentView(View.UPLOAD);
          setSelectedProposalId(null);
        }}
        />;
    }

    if(!selectedProposal) {
       return <Welcome onCreateProposal={handleCreateProposal} onCompare={handleCompareWrapper} />;
    }

    switch(currentView) {
      case View.CATEGORIZATION:
        return <ProposalCategorization 
          proposal={selectedProposal} 
          onUpdate={handleUpdateProposal} 
          onComplete={() => {
              setProposals(currentProposals =>
                  currentProposals.map(p =>
                      p.id === selectedProposalId
                      ? { ...p, maxCompletedStep: Math.max(p.maxCompletedStep || 1, 2) }
                      : p
                  )
              );
              setCurrentView(View.PRE_FORM)
          }}
          onBack={() => {
             // Cancels the creation process
             if(selectedProposalId) handleDeleteProposal(selectedProposalId);
             handleAddNew();
          }}
        />;
      case View.PRE_FORM:
        return <PreForm 
          proposal={selectedProposal} 
          onUpdate={handleUpdateProposal} 
          onComplete={() => {
            setProposals(currentProposals =>
                currentProposals.map(p =>
                    p.id === selectedProposalId
                    ? { ...p, maxCompletedStep: Math.max(p.maxCompletedStep || 1, 3) }
                    : p
                )
            );
            setCurrentView(View.DETAILS)}
          }
          onBack={() => setCurrentView(View.CATEGORIZATION)} 
        />;
      case View.DETAILS:
        return (
          <div className="printable-area">
            <ProposalForm key={selectedProposal.id} proposal={selectedProposal} allProposals={proposals} onUpdate={handleUpdateProposal} onBack={() => setCurrentView(View.PRE_FORM)} />
          </div>
        );
      default:
        return <Welcome onCreateProposal={handleCreateProposal} onCompare={handleCompareWrapper} />;
    }
  };

  const showProgressBar = currentView !== View.UPLOAD && currentView !== View.COMPARISON && !!selectedProposal;
  const showSidebar = proposals.length > 0;

  return (
    <div className="min-h-screen bg-brand-dark font-sans text-[var(--text-secondary)]">
      <Header
        className="no-print"
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        showToggle={showSidebar}
        showProgressBar={showProgressBar}
        currentStep={getCurrentStep()}
        maxCompletedStep={selectedProposal?.maxCompletedStep || 0}
        onStepClick={handleStepClick}
        onShowStrategy={() => setIsStrategyModalOpen(true)}
      />
      <main className="p-4 sm:p-6 lg:p-8">

        {/* Backdrop for mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden no-print"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Strategy Modal */}
        <StrategyModal 
            isOpen={isStrategyModalOpen} 
            onClose={() => setIsStrategyModalOpen(false)} 
        />

        <div className="flex max-w-screen-2xl mx-auto">
          {showSidebar && (
            <aside
              className={`
                fixed inset-y-0 left-0 z-40 w-80
                h-screen lg:h-[calc(100vh-8rem)]
                flex-shrink-0
                transition-all duration-300 ease-in-out
                no-print
                
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}

                lg:relative lg:inset-auto lg:z-auto lg:translate-x-0
                lg:overflow-hidden
                ${isSidebarOpen ? 'lg:w-80' : 'lg:w-0'}
              `}
            >
              <div className="w-80 h-full overflow-y-auto">
                <ProposalList
                  proposals={proposals}
                  selectedProposalId={selectedProposalId}
                  comparisonSelection={comparisonSelection}
                  onSelect={handleSelectProposalWrapper}
                  onAdd={handleAddNewWrapper}
                  onDelete={handleDeleteProposal}
                  onToggleComparison={handleToggleComparisonSelection}
                  onCompare={handleCompareWrapper}
                  onDownload={handleDownloadComparison}
                />
              </div>
            </aside>
          )}

          <div className={`flex-grow min-w-0 w-full transition-all duration-300 ease-in-out ${isSidebarOpen && showSidebar ? 'lg:pl-8' : 'lg:pl-0'}`}>
            <div>
              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
