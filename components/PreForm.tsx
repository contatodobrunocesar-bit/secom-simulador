
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Proposal, PreFormData, Scores, QuestionType, SOCIAL_MEDIA_CHANNELS, SocialMediaChannel, EvaluationCriterion, ProposalVersion, ProposalCategory } from '../types';
import { EVALUATION_MATRIX, CRITERIA_BLOCKS } from '../constants';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PlusIcon } from './icons/PlusIcon';
import { formatNumberWithThousands, parseFormattedNumber } from '../utils';
import { getCriteriaWeights } from '../weights';

interface PreFormProps {
    proposal: Proposal;
    onUpdate: (proposal: Proposal) => void;
    onComplete: () => void;
    onBack: () => void;
}

const PreForm: React.FC<PreFormProps> = ({ proposal, onUpdate, onComplete, onBack }) => {
    const [formData, setFormData] = useState<PreFormData>({
        ...proposal.preFormData,
        social_followers_channels: proposal.preFormData.social_followers_channels || proposal.socialChannels || [],
    });

    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // State for TV specific controls
    const [isEditingDays, setIsEditingDays] = useState(false);
    const [excludeWeekends, setExcludeWeekends] = useState(false);

    const autoFilledKeys = useMemo(() => new Set(Object.keys(proposal.preFormData)), [proposal.preFormData]);

    const applicableCriteria = useMemo(() => {
        if (!proposal.category) return EVALUATION_MATRIX;
        return EVALUATION_MATRIX.filter(c => 
            !c.applicableCategories || c.applicableCategories.includes(proposal.category!)
        );
    }, [proposal.category]);

    const visibleBlocks = useMemo(() => {
        const applicableIds = new Set(applicableCriteria.map(c => c.id));
        let blocks = CRITERIA_BLOCKS.filter(block => 
            block.ids.some(id => applicableIds.has(id))
        );

        // Reorder logic based on user request:
        if (proposal.category === ProposalCategory.YOUTUBE_ALL) {
            // If YouTube category, YouTube block first, then Social.
            const ytBlock = blocks.find(b => b.name === 'Métricas do canal YouTube');
            const socialBlock = blocks.find(b => b.name === 'Redes sociais');
            const otherBlocks = blocks.filter(b => b.name !== 'Redes sociais' && b.name !== 'Métricas do canal YouTube');
            
            const sorted: typeof blocks = [];
            if (ytBlock) sorted.push(ytBlock);
            if (socialBlock) sorted.push(socialBlock);
            sorted.push(...otherBlocks);
            return sorted;
        } else if (proposal.category === ProposalCategory.PORTAL_SOCIAL) {
             // If Social Media category, Social block comes first.
            const socialBlock = blocks.find(b => b.name === 'Redes sociais');
            const otherBlocks = blocks.filter(b => b.name !== 'Redes sociais');
            if (socialBlock) {
                blocks = [socialBlock, ...otherBlocks];
            }
        } else if (proposal.category === ProposalCategory.TV_ALL) {
            const tvBlock = blocks.find(b => b.name === 'Métricas de televisão');
            const otherBlocks = blocks.filter(b => b.name !== 'Métricas de televisão');
            if (tvBlock) {
                blocks = [tvBlock, ...otherBlocks];
            }
        }

        return blocks;
    }, [applicableCriteria, proposal.category]);

    const currentBlock = visibleBlocks[currentBlockIndex];
    const isFirstBlock = currentBlockIndex === 0;
    const isLastBlock = currentBlockIndex === visibleBlocks.length - 1;

    const selectedChannels = (formData.social_followers_channels || []) as SocialMediaChannel[];
    const videoChannels: SocialMediaChannel[] = ['YouTube', 'TikTok', 'Kwai'];

    // Auto-fill TV days from campaign period if available
    useEffect(() => {
        if (proposal.category === ProposalCategory.TV_ALL && !formData.tv_insertion_days && proposal.campaignPeriod) {
            let days = 0;
            
            // Try to parse "X dias" format
            const daysMatch = proposal.campaignPeriod.match(/\((\d+)\s+dias\)/i);
            if (daysMatch && daysMatch[1]) {
                days = parseInt(daysMatch[1], 10);
            } else {
                // Try to parse "X meses" format
                const monthsMatch = proposal.campaignPeriod.match(/^(\d+)\s+m[êe]ses?/i);
                if (monthsMatch && monthsMatch[1]) {
                    days = parseInt(monthsMatch[1], 10) * 30;
                }
            }

            if (days > 0) {
                setFormData(prev => ({ ...prev, tv_insertion_days: days }));
            }
        }
    }, [proposal.category, proposal.campaignPeriod, formData.tv_insertion_days]);

    const handleWeekendToggle = (checked: boolean) => {
        setExcludeWeekends(checked);
        const currentVal = parseFormattedNumber(String(formData.tv_insertion_days || '0'));
        
        if (currentVal > 0) {
            let newVal;
            if (checked) {
                // Remove roughly 2 days per week (approximate factor 5/7 = ~0.714)
                newVal = Math.floor(currentVal * (5/7));
            } else {
                // Add back roughly 2 days per week (approximate factor 7/5 = 1.4)
                 newVal = Math.ceil(currentVal * (7/5));
            }
            handleInputChange('tv_insertion_days', newVal, QuestionType.NUMBER);
        }
    };

    const socialMetrics = useMemo(() => {
        const totalFollowers = selectedChannels.reduce((sum, channel) => {
            const followers = parseFormattedNumber(String(formData[`followers_${channel}`] || '0'));
            return sum + followers;
        }, 0);

        const weightedReachSum = selectedChannels.reduce((sum, channel) => {
            const followers = parseFormattedNumber(String(formData[`followers_${channel}`] || '0'));
            const reach = parseFloat(String(formData[`avg_reach_${channel}`] || '0'));
            if (!isNaN(reach) && followers > 0) {
                return sum + (reach * followers);
            }
            return sum;
        }, 0);

        const weightedAudienceRSSum = selectedChannels.reduce((sum, channel) => {
            const followers = parseFormattedNumber(String(formData[`followers_${channel}`] || '0'));
            const audience = parseFloat(String(formData[`demographic_rs_social_${channel}`] || '0'));
            if (!isNaN(audience) && followers > 0) {
                return sum + (audience * followers);
            }
            return sum;
        }, 0);

        const averageReach = totalFollowers > 0 ? weightedReachSum / totalFollowers : 0;
        const averageAudienceRS = totalFollowers > 0 ? weightedAudienceRSSum / totalFollowers : 0;

        const showVideoViews = selectedChannels.some(ch => videoChannels.includes(ch));
        const videoViewsValues = selectedChannels
            .filter(ch => videoChannels.includes(ch))
            .map(channel => parseFormattedNumber(String(formData[`video_views_${channel}`] || '0')))
            .filter(v => !isNaN(v) && v > 0);
        const averageVideoViews = videoViewsValues.length > 0 ? videoViewsValues.reduce((a, b) => a + b, 0) / videoViewsValues.length : 0;
        
        return { totalFollowers, averageReach, averageAudienceRS, averageVideoViews, showVideoViews };
    }, [formData, selectedChannels]);

    // Calculate real-time weights based on active criteria
    const currentWeights = useMemo(() => {
        if (!proposal.category) return {};

        // Determine which criteria are currently "active" (not marked as NC)
        const activeCriteriaIds = applicableCriteria.filter(c => {
             // Check manual NC flag
            if (formData[`${c.id}_nc`]) return false;
            
            // Special rule: video_views is only applicable if a video channel is selected
            if (c.id === 'video_views' && !socialMetrics.showVideoViews) return false;

            return true;
        }).map(c => c.id);

        return getCriteriaWeights(proposal.category, activeCriteriaIds);
    }, [proposal.category, applicableCriteria, formData, socialMetrics.showVideoViews]);


    const tvMetrics = useMemo(() => {
        if (currentBlock?.name !== 'Métricas de televisão') return null;
        
        const dailyInsertions = Number(formData['tv_daily_insertions']) || 0;
        const days = Number(formData['tv_insertion_days']) || 0;
        const duration = Number(formData['tv_spot_duration']) || 0;
        
        const totalSpots = dailyInsertions * days;
        const totalSeconds = totalSpots * duration;
        const totalHours = totalSeconds > 0 ? totalSeconds / 3600 : 0;
        
        return { totalSpots, totalSeconds, totalHours };
    }, [formData, currentBlock]);

    const currentBlockFieldIds = useMemo(() => {
        if (!currentBlock) return [];
        
        if (currentBlock.name === 'Redes sociais') {
             const fields = ['social_channels'];
             selectedChannels.forEach(channel => {
                 fields.push(`followers_${channel}`);
                 fields.push(`avg_reach_${channel}`);
                 fields.push(`demographic_rs_social_${channel}`);
                 fields.push(`insertions_${channel}`);
                 if (videoChannels.includes(channel)) {
                     fields.push(`video_views_${channel}`);
                 }
             });
             const otherCriteria = applicableCriteria
                .filter(c => currentBlock.ids.includes(c.id))
                .filter(c => !['social_followers', 'avg_reach', 'video_views', 'demographic_rs_social'].includes(c.id))
                .map(c => c.id);
             fields.push(...otherCriteria);
             if (currentBlock.descriptionId) fields.push(currentBlock.descriptionId);
             return fields;
        } else {
            const criteriaIds = applicableCriteria
                .filter(c => currentBlock.ids.includes(c.id))
                .map(c => c.id);
            if (currentBlock.descriptionId) criteriaIds.push(currentBlock.descriptionId);
            return criteriaIds;
        }
    }, [currentBlock, applicableCriteria, selectedChannels]);

    const isFieldComplete = (id: string) => {
        if (id === 'social_channels') return selectedChannels.length > 0;
        // Descriptions are optional
        if (id === 'portal_blog_description' || id === 'social_media_description' || id === 'tv_audience_details') return true;
        
        if (formData[`${id}_nc`]) return true;
        const value = formData[id];
        return value !== undefined && value !== null && value !== '';
    };

    const isBlockComplete = useMemo(() => {
        return currentBlockFieldIds.every(id => isFieldComplete(id));
    }, [currentBlockFieldIds, formData, selectedChannels]);

    const scrollToId = (id: string) => {
         const el = document.getElementById(`field-wrapper-${id}`);
         if (el) {
             el.scrollIntoView({ behavior: 'smooth', block: 'center' });
             setActiveFieldId(id);
         }
    };

    const moveToNextField = (currentId: string) => {
        const currentIndex = currentBlockFieldIds.indexOf(currentId);
        if (currentIndex !== -1 && currentIndex < currentBlockFieldIds.length - 1) {
            const nextId = currentBlockFieldIds[currentIndex + 1];
            scrollToId(nextId);
        } else {
            setActiveFieldId(null);
        }
    };

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const firstIncomplete = currentBlockFieldIds.find(id => !isFieldComplete(id));
        if (firstIncomplete) {
            // Don't auto-scroll to description if it's the only one left and empty (since it's optional)
             const isOptional = ['portal_blog_description', 'social_media_description', 'tv_audience_details'].includes(firstIncomplete);
            if (isOptional && !formData[firstIncomplete]) {
                setActiveFieldId(null);
            } else {
                setTimeout(() => scrollToId(firstIncomplete), 100);
            }
        } else {
            setActiveFieldId(null);
        }
    }, [currentBlockIndex, currentBlockFieldIds]); 

    const handleInputChange = (id: string, value: string | number | boolean | string[], type: QuestionType | 'text') => {
        if (type === QuestionType.NUMBER) {
             // For TV metrics that are integers, keep standard format. For currency, keep standard format.
             const formattedValue = formatNumberWithThousands(String(value));
             setFormData(prev => ({ ...prev, [id]: formattedValue }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }

        // Auto-advance for SELECT types
        if (type === QuestionType.SELECT) {
            setTimeout(() => moveToNextField(id), 300);
        }
    };
    
    const handleChannelDataChange = (channel: SocialMediaChannel, field: string, value: string) => {
         const key = `${field}_${channel}`;
         // Added 'insertions' to isNumeric check
         const isNumeric = ['followers', 'video_views', 'insertions'].includes(field);
         const finalValue = isNumeric ? formatNumberWithThousands(value) : value;
         setFormData(prev => ({ ...prev, [key]: finalValue }));
    };

    const handleCheckboxChange = (channel: SocialMediaChannel) => {
        const newChannels = selectedChannels.includes(channel)
            ? selectedChannels.filter(c => c !== channel)
            : [...selectedChannels, channel];
        setFormData(prev => ({ ...prev, social_followers_channels: newChannels }));
    };

    const handleNotConsideredChange = (id: string, checked: boolean) => {
        setFormData(prev => {
            const newState: PreFormData = { ...prev, [`${id}_nc`]: checked };
            if (checked) {
                newState[id] = '';
            }
            return newState;
        });
        if (checked) {
            setTimeout(() => moveToNextField(id), 300);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            if (isFieldComplete(id)) {
                moveToNextField(id);
            }
        }
    };

    const handleNextBlock = () => {
        if (!isLastBlock && isBlockComplete) {
            setCurrentBlockIndex(prev => prev + 1);
        }
    };

    const handlePrevBlock = () => {
        if (!isFirstBlock) {
            setCurrentBlockIndex(prev => prev - 1);
        } else {
            onBack();
        }
    };

    const calculateScores = (dataToScore: PreFormData): Scores => {
        const newScores: Scores = {};
        applicableCriteria.forEach(criterion => {
            if (criterion.id === 'video_views' && !socialMetrics.showVideoViews) {
                newScores[criterion.id] = { score: 0, value: 'N/A (canais de vídeo não selecionados)' };
                return;
            }

            const notConsidered = dataToScore[`${criterion.id}_nc`];

            if (notConsidered) {
                newScores[criterion.id] = { score: 0, value: 'Não considerado' };
                return;
            }
            
            const value = dataToScore[criterion.id];
            if (value === undefined || value === null || value === '') {
                newScores[criterion.id] = { score: 0, value: 'N/A' };
                return;
            };

            let score = 0;
            let matchedLabel = 'N/A';

            if(criterion.questionType === QuestionType.NUMBER) {
                const rawValue = String(value);
                const numericValue = criterion.unit === 'number' ? parseFormattedNumber(rawValue) : Number(rawValue);

                const option = criterion.options.find(opt => {
                    if (opt.value.min !== undefined && opt.value.max !== undefined) {
                        return numericValue >= opt.value.min && numericValue <= opt.value.max;
                    }
                    if (opt.value.min !== undefined) {
                        return numericValue >= opt.value.min;
                    }
                    if (opt.value.max !== undefined) {
                        return numericValue <= opt.value.max;
                    }
                    return false;
                });
                if(option) {
                    score = option.score;
                    matchedLabel = String(value);
                }
            } else { // SELECT
                const option = criterion.options.find(opt => String(opt.value) === String(value));
                 if(option) {
                    score = option.score;
                    matchedLabel = option.label;
                }
            }
             newScores[criterion.id] = { score, value: matchedLabel };
        });
        return newScores;
    }

    const calculateTotalScore = (scores: Scores): number => {
        const criteriaToScore = applicableCriteria.filter(c => {
            if (formData[`${c.id}_nc`]) return false;
            if (c.id === 'video_views' && !socialMetrics.showVideoViews) return false;
            return true;
        });

        if (criteriaToScore.length === 0) return 0;

        const idsToScore = criteriaToScore.map(c => c.id);
        const weights = getCriteriaWeights(proposal.category!, idsToScore);

        const weightedSum = criteriaToScore.reduce((acc, criterion) => {
            const score = scores[criterion.id]?.score || 0;
            const weight = weights[criterion.id] || 0;
            return acc + (score * weight);
        }, 0);
        
        return weightedSum;
    };

    const handleSubmit = () => {
        if (!isBlockComplete) return;

        const finalFormData = { ...formData };
        
        finalFormData.social_followers = socialMetrics.totalFollowers;
        finalFormData.avg_reach = socialMetrics.averageReach;
        finalFormData.demographic_rs_social = socialMetrics.averageAudienceRS;
        if (socialMetrics.showVideoViews) {
            finalFormData.video_views = socialMetrics.averageVideoViews;
        } else {
            delete finalFormData.video_views;
        }

        const scores = calculateScores(finalFormData);
        const totalScore = calculateTotalScore(scores);

        const newVersion: ProposalVersion = {
            versionNumber: proposal.versions.length + 1,
            createdAt: new Date().toISOString(),
            preFormData: finalFormData,
            scores,
            totalScore,
            aiAnalysis: '',
        };

        const updatedProposal: Proposal = {
            ...proposal,
            socialChannels: selectedChannels,
            versions: [...proposal.versions, newVersion],
            currentVersion: newVersion.versionNumber,
            preFormData: finalFormData,
        };

        onUpdate(updatedProposal);
        onComplete();
    };

    const getFocusStyles = (id: string) => {
        const isActive = activeFieldId === id;
        const isComplete = isFieldComplete(id);
        
        // Special case for description fields which are always complete
        const isDescription = ['portal_blog_description', 'social_media_description', 'tv_audience_details'].includes(id);
        
        if (isActive) {
            return 'bg-neutral-800 border-brand-yellow ring-1 ring-brand-yellow/40 shadow-lg z-10 scale-[1.01]';
        }
        
        if (isComplete && !isDescription) {
            return 'bg-neutral-900/50 border-brand-green/30 hover:bg-neutral-900/70';
        }
        
        // Filled optional field style
        if (isDescription && formData[id]) {
             return 'bg-neutral-900/50 border-brand-green/30 hover:bg-neutral-900/70';
        }

        return 'bg-neutral-900/30 border-neutral-800 hover:bg-neutral-900/50';
    };
    
    const renderStatusIcon = (id: string) => {
        const isActive = activeFieldId === id;
        const isComplete = isFieldComplete(id);
        
        // Descriptions are technically "complete" but we want to show check only if filled or active
        const isDescription = ['portal_blog_description', 'social_media_description', 'tv_audience_details'].includes(id);

        if (isActive) {
             return (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-yellow/20 text-brand-yellow animate-pulse shadow-[0_0_10px_rgba(251,186,0,0.3)]">
                    <div className="w-2 h-2 bg-brand-yellow rounded-full" />
                </span>
             );
        }
        
        if (isComplete && (!isDescription || formData[id])) {
             return (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-green/20 text-brand-green">
                    <CheckIcon className="w-4 h-4" />
                </span>
             );
        }
        
        // Optional field empty state
        if (isDescription && !formData[id]) {
             return (
                <span className="text-[10px] text-[var(--text-tertiary)] border border-neutral-700 px-1.5 py-0.5 rounded">
                    Opcional
                </span>
             );
        }

        return (
            <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-neutral-700 text-transparent">
                <div className="w-2 h-2 rounded-full" />
            </span>
        );
    };

    const renderCriterionInput = (criterion: EvaluationCriterion) => {
        const isTvDays = criterion.id === 'tv_insertion_days';
        const weight = currentWeights[criterion.id] || 0;
        const weightPercentage = (weight * 100).toFixed(1);
        
        return (
             <div 
                id={`field-wrapper-${criterion.id}`}
                key={criterion.id} 
                className={`transition-all duration-300 ease-in-out p-5 rounded-xl border scroll-mt-32 ${getFocusStyles(criterion.id)}`}
                onClick={() => setActiveFieldId(criterion.id)}
             >
                <div className="flex justify-between items-start mb-2">
                    <label htmlFor={criterion.id} className="flex flex-col text-base font-bold text-[var(--text-secondary)]">
                        <span className="flex items-center">
                            {criterion.questionLabel}
                            {autoFilledKeys.has(criterion.id) && (
                                <SparklesIcon className="w-4 h-4 ml-2 text-brand-yellow" title="Preenchido pela IA" />
                            )}
                        </span>
                    </label>
                    <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap ${!!formData[`${criterion.id}_nc`] ? 'bg-neutral-800 text-neutral-500 border-neutral-700 decoration-line-through' : 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20'}`}>
                             Peso: {weightPercentage}%
                         </span>
                         <div className="ml-1 flex-shrink-0">
                            {renderStatusIcon(criterion.id)}
                        </div>
                    </div>
                </div>
                
                <p className="mb-3 text-xs text-[var(--text-tertiary)]">{criterion.indicator}</p>
                
                {criterion.questionType === QuestionType.SELECT ? (
                    <select
                        id={criterion.id}
                        value={formData[criterion.id] as string || ''}
                        onChange={e => handleInputChange(criterion.id, e.target.value, QuestionType.SELECT)}
                        className="block w-full px-3 py-2.5 bg-neutral-950/50 border border-neutral-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow transition-colors text-sm text-neutral-200"
                        disabled={!!formData[`${criterion.id}_nc`]}
                    >
                        <option value="">Selecione...</option>
                        {criterion.options.map(opt => (
                            <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ) : (
                    <div className="relative">
                        {criterion.unit === 'currency' && <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-tertiary)] text-sm">R$</span>}
                        <input
                            type={criterion.unit === 'number' ? 'text' : 'number'}
                            id={criterion.id}
                            value={formData[criterion.id] as string || ''}
                            onChange={e => handleInputChange(criterion.id, e.target.value, QuestionType.NUMBER)}
                            onKeyDown={e => handleKeyDown(e, criterion.id)}
                            step="any"
                            className={`block w-full px-3 py-2.5 bg-neutral-950/50 border border-neutral-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow transition-colors text-sm text-neutral-200 
                                ${criterion.unit === 'currency' ? 'pl-9' : ''} 
                                ${criterion.unit === 'percentage' ? 'pr-9' : ''}
                                ${isTvDays && !isEditingDays ? 'opacity-60 cursor-not-allowed' : ''}
                            `}
                            disabled={!!formData[`${criterion.id}_nc`] || (isTvDays && !isEditingDays)}
                        />
                        {criterion.unit === 'percentage' && <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-tertiary)] text-sm">%</span>}
                        
                        {/* TV Specific Controls */}
                        {isTvDays && (
                            <div className="flex items-center gap-4 mt-3">
                                <label className="flex items-center space-x-2 text-xs cursor-pointer text-[var(--text-secondary)]">
                                    <input
                                        type="checkbox"
                                        checked={isEditingDays}
                                        onChange={(e) => setIsEditingDays(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-neutral-600 text-brand-yellow accent-brand-yellow focus:ring-0"
                                    />
                                    <span>Editar período</span>
                                </label>
                                
                                <label className="flex items-center space-x-2 text-xs cursor-pointer text-[var(--text-secondary)]">
                                    <input
                                        type="checkbox"
                                        checked={excludeWeekends}
                                        onChange={(e) => handleWeekendToggle(e.target.checked)}
                                        disabled={!formData.tv_insertion_days}
                                        className="h-3.5 w-3.5 rounded border-neutral-600 text-brand-yellow accent-brand-yellow focus:ring-0 disabled:opacity-50"
                                    />
                                    <span>Excluir finais de semana</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                    {criterion.info ? <p className="text-[10px] text-[var(--text-tertiary)] italic leading-tight">{criterion.info}</p> : <span></span>}
                    <label className={`flex items-center space-x-2 text-[10px] cursor-pointer transition-colors ${!!formData[`${criterion.id}_nc`] ? 'text-brand-yellow font-medium' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-neutral-600 text-brand-yellow accent-brand-yellow focus:ring-brand-yellow focus:ring-offset-brand-panel cursor-pointer"
                            checked={!!formData[`${criterion.id}_nc`]}
                            onChange={(e) => handleNotConsideredChange(criterion.id, e.target.checked)}
                        />
                        <span className={!!formData[`${criterion.id}_nc`] ? 'text-brand-yellow' : ''}>Não considerar</span>
                    </label>
                </div>
            </div>
        );
    };
    
    const renderBonusSection = (criterionId: string) => {
        const criterion = applicableCriteria.find(c => c.id === criterionId);
        if (!criterion) return null;

        const textId = `${criterionId}_details`;
        const weight = currentWeights[criterion.id] || 0;
        const weightPercentage = (weight * 100).toFixed(1);

        return (
             <div 
                id={`field-wrapper-${criterionId}`}
                className={`transition-all duration-300 ease-in-out p-5 rounded-xl border-2 border-dashed scroll-mt-32 mt-6 ${activeFieldId === criterionId ? 'bg-brand-yellow/5 border-brand-yellow' : 'bg-neutral-900/20 border-neutral-700 hover:border-brand-yellow/50'}`}
                onClick={() => setActiveFieldId(criterionId)}
             >
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-brand-yellow/20 rounded-md text-brand-yellow">
                             <PlusIcon className="w-4 h-4" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Aproveitamentos bonificados</h3>
                     </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20 whitespace-nowrap">
                             Peso: {weightPercentage}%
                     </span>
                 </div>
                 
                 <div className="space-y-4">
                     <div>
                        <label htmlFor={textId} className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Descrição da bonificação <span className="text-xs text-[var(--text-tertiary)] font-normal">(Opcional)</span>
                        </label>
                         <input
                            type="text"
                            id={textId}
                            value={formData[textId] as string || ''}
                            onChange={e => handleInputChange(textId, e.target.value, 'text')}
                            className="block w-full px-3 py-2.5 bg-neutral-950/50 border border-neutral-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow transition-colors text-sm text-neutral-200"
                        />
                     </div>
                     
                     <div>
                        <label htmlFor={criterionId} className="block text-sm font-bold text-[var(--text-secondary)] mb-1">
                            {criterion.questionLabel}
                        </label>
                         <select
                            id={criterion.id}
                            value={formData[criterion.id] as string || ''}
                            onChange={e => handleInputChange(criterion.id, e.target.value, QuestionType.SELECT)}
                            className="block w-full px-3 py-2.5 bg-neutral-950/50 border border-neutral-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow transition-colors text-sm text-neutral-200"
                        >
                            <option value="">Selecione...</option>
                            {criterion.options.map(opt => (
                                <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-[10px] text-[var(--text-tertiary)]">{criterion.indicator}</p>
                     </div>
                 </div>
             </div>
        )
    }


    const renderDescriptionInput = (block: typeof visibleBlocks[0] | undefined) => {
        if (!block?.descriptionId) return null;
        
        // Removed isComplete check for enabling the button since it's optional, 
        // but used to show checkmark if filled.
        const hasContent = formData[block.descriptionId];

        return (
             <div 
                id={`field-wrapper-${block.descriptionId}`}
                className={`transition-all duration-300 ease-in-out p-5 rounded-xl border scroll-mt-32 ${getFocusStyles(block.descriptionId!)}`}
                onClick={() => block.descriptionId && setActiveFieldId(block.descriptionId)}
             >
                <div className="flex justify-between items-start mb-2">
                    <label htmlFor={block.descriptionId} className="flex items-center text-base font-bold text-[var(--text-secondary)]">
                        {block.descriptionLabel} <span className="ml-2 text-xs text-[var(--text-tertiary)] font-normal">(Opcional)</span>
                        {autoFilledKeys.has(block.descriptionId) && (
                            <SparklesIcon className="w-4 h-4 ml-2 text-brand-yellow" title="Preenchido pela IA" />
                        )}
                    </label>
                    <div className="ml-3 flex-shrink-0">
                        {renderStatusIcon(block.descriptionId!)}
                    </div>
                </div>
                <textarea
                    id={block.descriptionId}
                    value={formData[block.descriptionId] as string || ''}
                    onChange={e => handleInputChange(block.descriptionId!, e.target.value, 'text')}
                    rows={4}
                    className="block w-full px-3 py-2.5 bg-neutral-950/50 border border-neutral-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow transition-colors text-sm text-neutral-200"
                />
            </div>
        )
    };

    const renderSocialBlock = () => {
        const socialBlock = visibleBlocks.find(b => b.name === 'Redes sociais');
        if (!socialBlock) return null;

        const blockCriteriaIds = new Set(socialBlock.ids);
        const criteriaForBlock = applicableCriteria.filter(c => blockCriteriaIds.has(c.id));
        
        // Filter out standard social metrics and bonus criterion from the main grid
        const otherCriteriaInBlock = criteriaForBlock.filter(c => 
            !['social_followers', 'avg_reach', 'video_views', 'demographic_rs_social', 'bonus_social'].includes(c.id)
        );
        
        const hasBonusCriterion = socialBlock.ids.includes('bonus_social');

        const inputBaseClasses = "block w-full px-3 py-2 bg-neutral-950/50 border border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow transition-colors";
        const readOnlyInputClasses = "block w-full px-3 py-2 bg-neutral-800/60 border-neutral-700/80 rounded-md text-neutral-400";
        
        // Filter available channels: Remove YouTube if category is YOUTUBE_ALL
        const availableChannels = SOCIAL_MEDIA_CHANNELS.filter(c => {
            if (proposal.category === ProposalCategory.YOUTUBE_ALL && c === 'YouTube') {
                return false;
            }
            return true;
        });

        // Get weights for aggregate metrics
        const followersWeight = (currentWeights['social_followers'] * 100).toFixed(1);
        const reachWeight = (currentWeights['avg_reach'] * 100).toFixed(1);
        const demoRsWeight = (currentWeights['demographic_rs_social'] * 100).toFixed(1);
        const videoViewsWeight = (currentWeights['video_views'] * 100).toFixed(1);
        
        return (
            <div className="space-y-8">
                 <div 
                    id="field-wrapper-social_channels"
                    className={`transition-all duration-300 ease-in-out p-5 rounded-xl border scroll-mt-32 ${getFocusStyles('social_channels')}`}
                    onClick={() => setActiveFieldId('social_channels')}
                 >
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-lg font-semibold text-[var(--text-secondary)]">Selecione os canais inclusos na proposta:</p>
                        <div className="ml-4 flex-shrink-0">{renderStatusIcon('social_channels')}</div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        {availableChannels.map(channel => (
                            <label 
                                key={channel} 
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer transition-colors border 
                                ${selectedChannels.includes(channel) ? 'bg-brand-yellow/20 border-brand-yellow/50 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}
                            >
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={selectedChannels.includes(channel)}
                                    onChange={() => handleCheckboxChange(channel)}
                                />
                                <span className="font-medium">{channel}</span>
                            </label>
                        ))}
                    </div>

                    {selectedChannels.length === 0 && (
                        <p className="mt-2 text-xs text-brand-red">Selecione pelo menos um canal para continuar.</p>
                    )}
                </div>

                {selectedChannels.length > 0 && (
                     <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-neutral-700 pb-2">
                             <p className="text-lg font-semibold text-[var(--text-primary)] pl-1">Detalhamento por canal</p>
                             <div className="flex gap-2 text-[10px] text-neutral-400">
                                 <span title="Peso do total de seguidores">Seguidores: {followersWeight}%</span>
                                 <span>•</span>
                                 <span title="Peso do alcance médio">Alcance: {reachWeight}%</span>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {selectedChannels.map(channel => {
                                const renderChannelInput = (fieldKey: string, label: string, placeholder: string, isNumeric: boolean) => {
                                    const fullId = `${fieldKey}_${channel}`;

                                    return (
                                        <div 
                                            key={fullId}
                                            id={`field-wrapper-${fullId}`} 
                                            className={`transition-all duration-300 ease-in-out p-4 rounded-lg border scroll-mt-32 ${getFocusStyles(fullId)}`}
                                            onClick={(e) => { e.stopPropagation(); setActiveFieldId(fullId); }}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
                                                <div className="ml-2">{renderStatusIcon(fullId)}</div>
                                            </div>
                                            
                                            <input 
                                                type={isNumeric ? "text" : "number"}
                                                step="0.1"
                                                value={formData[fullId] || ''} 
                                                onChange={e => handleChannelDataChange(channel, fieldKey, e.target.value)} 
                                                onKeyDown={e => handleKeyDown(e, fullId)}
                                                className={inputBaseClasses} 
                                            />
                                        </div>
                                    );
                                };

                                return (
                                    <div key={channel} className="bg-neutral-900/30 p-4 rounded-lg border border-neutral-800">
                                        <p className="font-bold text-brand-yellow mb-4 text-lg">{channel}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                            {renderChannelInput('followers', 'Seguidores', '', true)}
                                            {renderChannelInput('avg_reach', 'Alcance médio (%)', '', false)}
                                            {renderChannelInput('demographic_rs_social', 'Audiência no RS (%)', '', false)}
                                            {renderChannelInput('insertions', 'Qtd. inserções', '', true)}
                                            {videoChannels.includes(channel) && renderChannelInput('video_views', 'Média views', '', true)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                 {selectedChannels.length > 0 && (
                    <div className={`p-4 bg-neutral-900/30 rounded-lg border border-dashed border-neutral-700 transition-opacity duration-300`}>
                        <p className="text-sm font-semibold text-[var(--text-tertiary)] mb-3 uppercase tracking-wider">Métricas consolidadas (automático) e pesos</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 opacity-80">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
                                    Total seguidores <span className="text-brand-yellow">({followersWeight}%)</span>
                                </label>
                                <input type="text" value={formatNumberWithThousands(socialMetrics.totalFollowers)} readOnly className={readOnlyInputClasses} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
                                    Alcance médio <span className="text-brand-yellow">({reachWeight}%)</span>
                                </label>
                                <input type="text" value={`${socialMetrics.averageReach.toFixed(2)}%`} readOnly className={readOnlyInputClasses} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
                                    Audiência RS <span className="text-brand-yellow">({demoRsWeight}%)</span>
                                </label>
                                <input type="text" value={`${socialMetrics.averageAudienceRS.toFixed(2)}%`} readOnly className={readOnlyInputClasses} />
                            </div>
                            {socialMetrics.showVideoViews && (
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
                                        Média views <span className="text-brand-yellow">({videoViewsWeight}%)</span>
                                    </label>
                                    <input type="text" value={formatNumberWithThousands(Math.round(socialMetrics.averageVideoViews))} readOnly className={readOnlyInputClasses} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherCriteriaInBlock.map(renderCriterionInput)}
                </div>
                
                {renderDescriptionInput(socialBlock)}
                
                {hasBonusCriterion && renderBonusSection('bonus_social')}
            </div>
        )
    };

    if (!currentBlock) return null;

    const hasBonusCriterion = currentBlock.ids.includes('bonus_portal');
    // Filter bonus out of main grid
    const criteriaForBlock = applicableCriteria
        .filter(c => new Set(currentBlock.ids).has(c.id))
        .filter(c => c.id !== 'bonus_portal');

    return (
        <div className="brand-panel rounded-lg p-0 flex flex-col h-full" ref={containerRef}>
            <div className="p-6 border-b border-[var(--border-primary)] flex items-center justify-between bg-neutral-800/50 rounded-t-lg">
                <div>
                    <div className="mb-2">
                         <span className="inline-block px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider bg-brand-yellow text-brand-dark shadow-sm">
                            {proposal.category}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{currentBlock.name}</h2>
                    <p className="text-sm text-[var(--text-tertiary)] mt-1">Etapa {currentBlockIndex + 1} de {visibleBlocks.length}</p>
                </div>
                <div className="flex gap-1">
                    {visibleBlocks.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 w-6 rounded-full transition-all duration-300 ${idx === currentBlockIndex ? 'bg-brand-yellow w-10' : idx < currentBlockIndex ? 'bg-brand-yellow/40' : 'bg-neutral-700'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="p-6 flex-grow space-y-8">
                {currentBlock.name === 'Redes sociais' ? (
                    renderSocialBlock()
                ) : (
                    <div className="space-y-6">
                        {currentBlock.name === 'Métricas de televisão' && tvMetrics && (
                            <div className="bg-neutral-900/30 p-5 rounded-xl border border-dashed border-neutral-700 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                                <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4 text-brand-yellow" />
                                    Cálculo de exposição (automático)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                    <div className="bg-neutral-800/50 rounded-lg p-3">
                                        <p className="text-xs text-[var(--text-tertiary)] mb-1">Total de inserções</p>
                                        <p className="text-xl font-bold text-[var(--text-primary)]">{formatNumberWithThousands(tvMetrics.totalSpots)}</p>
                                    </div>
                                    <div className="bg-neutral-800/50 rounded-lg p-3">
                                        <p className="text-xs text-[var(--text-tertiary)] mb-1">Tempo total (segundos)</p>
                                        <p className="text-xl font-bold text-[var(--text-primary)]">{formatNumberWithThousands(tvMetrics.totalSeconds)}s</p>
                                    </div>
                                    <div className="bg-brand-yellow/10 border border-brand-yellow/20 rounded-lg p-3">
                                        <p className="text-xs text-brand-yellow mb-1 font-semibold">Tempo total (horas)</p>
                                        <p className="text-xl font-bold text-brand-yellow">{tvMetrics.totalHours.toFixed(2)}h</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {criteriaForBlock.map(renderCriterionInput)}
                            <div className="col-span-full">
                                 {renderDescriptionInput(currentBlock)}
                                 {hasBonusCriterion && renderBonusSection('bonus_portal')}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-[var(--border-primary)] bg-neutral-800/30 rounded-b-lg flex justify-between items-center sticky bottom-0 z-20 backdrop-blur-md">
                <button
                    type="button"
                    onClick={handlePrevBlock}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    {isFirstBlock ? 'Voltar' : 'Anterior'}
                </button>

                <div className="flex items-center gap-4">
                    {!isBlockComplete && (
                        <span className="text-xs text-brand-yellow font-medium animate-pulse bg-brand-yellow/10 px-2 py-1 rounded">
                            Responda as perguntas destacadas para avançar
                        </span>
                    )}

                    {isLastBlock ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!isBlockComplete}
                            className="flex items-center gap-2 px-8 py-3 bg-brand-yellow text-brand-dark font-bold rounded-lg shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-brand-panel transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-neutral-600 disabled:text-neutral-400 disabled:shadow-none"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            Calcular pontuação
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleNextBlock}
                            disabled={!isBlockComplete}
                            className="flex items-center gap-2 px-6 py-3 bg-neutral-700 text-white font-semibold rounded-lg hover:bg-neutral-600 hover:text-brand-yellow focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                        >
                            Próximo
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreForm;
