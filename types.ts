

export enum ProposalCategory {
  PORTAL_BLOG = 'Portal/Blog',
  PORTAL_SOCIAL = 'Redes Sociais + Portal/Blog',
  TV_ALL = 'Televisão + Portal/Blog + Redes Sociais',
  YOUTUBE_ALL = 'Canal Youtube + Portal/Blog + Redes Sociais',
}

export enum QuestionType {
  SELECT = 'SELECT',
  NUMBER = 'NUMBER',
}

export interface ScoreOption {
  label: string;
  value: any;
  score: number;
}

export interface EvaluationCriterion {
  id: string;
  criterion: string;
  indicator: string;
  questionType: QuestionType;
  options: ScoreOption[];
  questionLabel: string;
  placeholder?: string;
  info?: string;
  unit?: 'currency' | 'percentage' | 'number';
  applicableCategories?: ProposalCategory[];
}

export type Scores = {
  [criterionId: string]: {
    score: number;
    value: any;
  };
};

export const SOCIAL_MEDIA_CHANNELS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'X (Twitter)', 'LinkedIn', 'Kwai'] as const;
export type SocialMediaChannel = typeof SOCIAL_MEDIA_CHANNELS[number];

export type PreFormData = {
  [key: string]: string | number | string[] | boolean;
}

export interface ProposalVersion {
  versionNumber: number;
  createdAt: string;
  scores: Scores;
  totalScore: number;
  aiAnalysis: string;
  preFormData: PreFormData;
}

export interface Proposal {
  id: string;
  name: string;
  vehicle?: string;
  investment: number;
  category: ProposalCategory | null;
  // This preFormData holds temporary data before the first version is created.
  preFormData: PreFormData;
  city?: string;
  region?: string;
  maxCompletedStep: number;
  socialChannels?: SocialMediaChannel[];
  proposalDate: string;
  campaignPeriod: string;
  // Versioning
  versions: ProposalVersion[];
  currentVersion: number;
}


export enum View {
  UPLOAD = 'UPLOAD',
  PDF_UPLOAD = 'PDF_UPLOAD',
  LIST = 'LIST',
  CATEGORIZATION = 'CATEGORIZATION',
  PRE_FORM = 'PRE_FORM',
  DETAILS = 'DETAILS',
  COMPARISON = 'COMPARISON',
}

export type AutoFillData = {
    proposalName: string | null;
    proposalInvestment: number | null;
    preFormData: PreFormData;
}