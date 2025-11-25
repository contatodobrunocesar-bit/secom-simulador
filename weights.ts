
import { ProposalCategory } from './types';

/**
 * Defines the weights for each evaluation criterion based on the proposal category.
 * The sum of weights for all applicable criteria in a category will be normalized to 1.
 */

// Weights for criteria that have special importance in a given category.
// Any criteria not listed here will have their weights distributed equally from the remaining percentage.
const CATEGORY_WEIGHTS_CONFIG: { [key in ProposalCategory]: { [criterionId: string]: number } } = {
  [ProposalCategory.PORTAL_BLOG]: {
    // Foco: Visibilidade, Audiência Qualificada e Custo
    cpm: 0.20,
    privileged_visibility: 0.15,
    portal_audience: 0.15,
    demographic_rs_portal: 0.15,
    bonus_portal: 0.05,
    branded_content_text: 0.05,
    portal_formats: 0.05,
    real_reach_portal: 0.05,
    cpc: 0.05,
    portal_existence: 0.04,
    complementary_formats: 0.03,
    crossposting: 0.03,
  },
  [ProposalCategory.PORTAL_SOCIAL]: {
    // --- BLOCO REDES SOCIAIS (55%) ---
    avg_reach: 0.14,               // Alcance real
    social_formats: 0.12,          // Diversidade de formatos
    demographic_rs_social: 0.10,   // Foco RS
    social_followers: 0.05,        // Volume base
    video_views: 0.05,             // Engajamento vídeo
    crossposting: 0.03,            // Eco no ecossistema
    real_reach_social: 0.03,       // Auditoria
    bonus_social: 0.03,            // Bonificação

    // --- BLOCO PORTAL (35%) ---
    cpm: 0.10,                     // Custo
    privileged_visibility: 0.10,   // Destaque
    branded_content_text: 0.04,    // Qualidade
    portal_audience: 0.03,         // Volume
    demographic_rs_portal: 0.03,   // Foco RS
    bonus_portal: 0.02,            // Bonificação
    real_reach_portal: 0.01,       // Auditoria
    portal_formats: 0.01,          // Técnica
    portal_existence: 0.01,        // Estrutura

    // --- MISTO/OUTROS (10%) ---
    cpc: 0.05,
    complementary_formats: 0.05,
  },
  [ProposalCategory.TV_ALL]: {
    // === BLOCO TV (40%) ===
    // Total: 0.40
    tv_program_type: 0.06,
    tv_daily_insertions: 0.06,
    tv_insertion_days: 0.06,
    demographic_rs_tv: 0.06,
    tv_audience_source: 0.05,
    tv_spot_duration: 0.04,
    tv_daypart: 0.04,
    tv_simultaneous_transmission: 0.03,

    // === BLOCO DIGITAL (30%) ===
    // Total: 0.30
    avg_reach: 0.05,
    portal_audience: 0.04,
    privileged_visibility: 0.03,
    cpc: 0.03, 
    demographic_rs_portal: 0.02,
    demographic_rs_social: 0.02,
    social_followers: 0.02,
    video_views: 0.02,
    bonus_portal: 0.01,
    bonus_social: 0.01,
    real_reach_portal: 0.01,
    real_reach_social: 0.01,
    portal_formats: 0.01,
    social_formats: 0.01,
    portal_existence: 0.01,

    // === BLOCO COMERCIAL E MISTO (30%) ===
    // Total: 0.30
    cpm: 0.15,
    branded_content: 0.08,
    crossposting: 0.04,
    complementary_formats: 0.03,
  },
  [ProposalCategory.YOUTUBE_ALL]: {
    // === BLOCO YOUTUBE + GERAL (60%) ===
    cpm: 0.12,
    youtube_views: 0.10,
    youtube_avg_duration: 0.08,
    youtube_demographic_rs: 0.08,
    youtube_video_quantity: 0.05,
    youtube_brand_usage: 0.04,
    branded_content: 0.04,
    cpc: 0.03,
    youtube_content_rights: 0.03,
    youtube_history: 0.01,
    complementary_formats: 0.01,
    crossposting: 0.01,

    // === BLOCO PORTAL (20%) ===
    portal_audience: 0.05,
    demographic_rs_portal: 0.04,
    privileged_visibility: 0.04,
    portal_formats: 0.03,
    real_reach_portal: 0.02,
    bonus_portal: 0.01,
    portal_existence: 0.01,

    // === BLOCO REDES SOCIAIS (20%) ===
    avg_reach: 0.08,
    demographic_rs_social: 0.03,
    real_reach_social: 0.02,
    social_formats: 0.02,
    video_views: 0.02,
    social_followers: 0.02,
    bonus_social: 0.01,
  },
};

/**
 * Calculates and returns a normalized map of weights for a given set of criteria IDs and a proposal category.
 * @param category The category of the proposal.
 * @param applicableCriteriaIds An array of criterion IDs that apply to this proposal.
 * @returns An object mapping each criterion ID to its final weight, with the sum of all weights being 1.
 */
export const getCriteriaWeights = (category: ProposalCategory, applicableCriteriaIds: string[]): { [criterionId: string]: number } => {
    const specificWeights = CATEGORY_WEIGHTS_CONFIG[category] || {};
    const finalWeights: { [criterionId: string]: number } = {};
    
    let totalSpecifiedWeight = 0;
    const unspecifiedCriteria: string[] = [];

    // First pass: apply specific weights and identify unspecified criteria
    applicableCriteriaIds.forEach(id => {
        if (specificWeights[id] !== undefined) {
            finalWeights[id] = specificWeights[id];
            totalSpecifiedWeight += specificWeights[id];
        } else {
            unspecifiedCriteria.push(id);
        }
    });

    // If total specified weight is roughly 1, we normalize strictly the specified ones.
    if (totalSpecifiedWeight >= 0.99) {
        const scaleFactor = 1 / totalSpecifiedWeight;
        Object.keys(finalWeights).forEach(id => {
            finalWeights[id] *= scaleFactor;
        });
        // Any explicitly unspecified criteria get 0 effectively, but our config is now exhaustive.
        unspecifiedCriteria.forEach(id => {
            finalWeights[id] = 0;
        });
        return finalWeights;
    }

    // Second pass: distribute the remaining weight among the unspecified criteria
    if (unspecifiedCriteria.length > 0) {
        const remainingWeight = 1 - totalSpecifiedWeight;
        const weightPerUnspecified = remainingWeight / unspecifiedCriteria.length;
        unspecifiedCriteria.forEach(id => {
            finalWeights[id] = weightPerUnspecified;
        });
    }

    // Final check for normalization to prevent floating point inaccuracies
    let totalWeight = 0;
    Object.values(finalWeights).forEach(w => totalWeight += w);
    if(totalWeight !== 1.0 && totalWeight > 0) {
         const scaleFactor = 1 / totalWeight;
         Object.keys(finalWeights).forEach(id => {
            finalWeights[id] *= scaleFactor;
        });
    }

    return finalWeights;
};
