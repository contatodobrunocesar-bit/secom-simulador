export interface RFData {
  id: string;
  name: string;
  population: number;
  avgPopulation: number;
}

export const RF_DATA: RFData[] = [
  { id: 'RF1', name: 'Metropolitana e Delta do Jacuí', population: 4485646, avgPopulation: 64081 },
  { id: 'RF2', name: 'Vales', population: 809165, avgPopulation: 13715 },
  { id: 'RF3', name: 'Serra', population: 1229354, avgPopulation: 25089 },
  { id: 'RF4', name: 'Litoral', population: 385422, avgPopulation: 18353 },
  { id: 'RF5', name: 'Sul', population: 847888, avgPopulation: 38540 },
  { id: 'RF6', name: 'Fronteira Oeste e Campanha', population: 745827, avgPopulation: 37291 },
  { id: 'RF7', name: 'Noroeste e Missões', population: 780261, avgPopulation: 16599 },
  { id: 'RF9', name: 'Produção e Norte', population: 1136011, avgPopulation: 8739 },
];
