import { Proposal, ProposalCategory, ProposalVersion } from '../types';

export interface BenchmarkStats {
  avgScore: number;
  avgInvestment: number;
  avgCpm: number;
  avgCpc: number;
  avgRsReach: number;
  avgCostPerScore: number;
  proposalCount: number;
}

export interface Benchmarks {
  overall: BenchmarkStats;
  byRegion: { [region: string]: BenchmarkStats };
  byCategory: { [category: string]: BenchmarkStats };
}

const getActiveVersion = (proposal: Proposal): ProposalVersion | null => {
  if (!proposal || proposal.versions.length === 0) {
    return null;
  }
  return proposal.versions[proposal.currentVersion - 1] || null;
};

const calculateStatsForSet = (proposals: Proposal[]): BenchmarkStats => {
    const validProposalsWithVersion = proposals.map(p => ({ p, v: getActiveVersion(p) })).filter(item => item.v !== null);

    if (validProposalsWithVersion.length === 0) {
        return { avgScore: 0, avgInvestment: 0, avgCpm: 0, avgCpc: 0, avgRsReach: 0, avgCostPerScore: 0, proposalCount: 0 };
    }

    const withScore = validProposalsWithVersion.filter(item => item.v!.totalScore > 0);
    const withCpm = validProposalsWithVersion.filter(item => item.v!.preFormData.cpm && Number(item.v!.preFormData.cpm) > 0);
    const withCpc = validProposalsWithVersion.filter(item => item.v!.preFormData.cpc && Number(item.v!.preFormData.cpc) > 0);
    const withRsReach = validProposalsWithVersion.filter(item => 
        (item.v!.preFormData.demographic_rs_portal && Number(item.v!.preFormData.demographic_rs_portal) > 0) ||
        (item.v!.preFormData.demographic_rs_social && Number(item.v!.preFormData.demographic_rs_social) > 0)
    );
    const withCostPerScore = validProposalsWithVersion.filter(item => item.p.investment > 0 && item.v!.totalScore > 0);

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const avgScore = withScore.length > 0 ? sum(withScore.map(item => item.v!.totalScore)) / withScore.length : 0;
    const avgInvestment = proposals.length > 0 ? sum(proposals.map(p => p.investment)) / proposals.length : 0;
    const avgCpm = withCpm.length > 0 ? sum(withCpm.map(item => Number(item.v!.preFormData.cpm))) / withCpm.length : 0;
    const avgCpc = withCpc.length > 0 ? sum(withCpc.map(item => Number(item.v!.preFormData.cpc))) / withCpc.length : 0;
    
    const rsReaches = withRsReach.map(item => Number(item.v!.preFormData.demographic_rs_portal) || Number(item.v!.preFormData.demographic_rs_social) || 0);
    const avgRsReach = withRsReach.length > 0 ? sum(rsReaches) / withRsReach.length : 0;
    
    const costsPerScore = withCostPerScore.map(item => item.p.investment / item.v!.totalScore);
    const avgCostPerScore = withCostPerScore.length > 0 ? sum(costsPerScore) / withCostPerScore.length : 0;

    return {
        avgScore,
        avgInvestment,
        avgCpm,
        avgCpc,
        avgRsReach,
        avgCostPerScore,
        proposalCount: proposals.length,
    };
};


export const calculateBenchmarks = (proposals: Proposal[]): Benchmarks => {
    const byRegion: { [region: string]: Proposal[] } = {};
    const byCategory: { [category: string]: Proposal[] } = {};

    for (const proposal of proposals) {
        if (proposal.region) {
            if (!byRegion[proposal.region]) byRegion[proposal.region] = [];
            byRegion[proposal.region].push(proposal);
        }
        if (proposal.category) {
            if (!byCategory[proposal.category]) byCategory[proposal.category] = [];
            byCategory[proposal.category].push(proposal);
        }
    }

    const benchmarksByRegion: { [region: string]: BenchmarkStats } = {};
    for (const region in byRegion) {
        benchmarksByRegion[region] = calculateStatsForSet(byRegion[region]);
    }

    const benchmarksByCategory: { [category: string]: BenchmarkStats } = {};
    for (const category in byCategory) {
        benchmarksByCategory[category as ProposalCategory] = calculateStatsForSet(byCategory[category]);
    }
    
    return {
        overall: calculateStatsForSet(proposals),
        byRegion: benchmarksByRegion,
        byCategory: benchmarksByCategory,
    };
};