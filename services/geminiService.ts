
import { GoogleGenAI } from "@google/genai";
import { Proposal, AutoFillData, PreFormData, SocialMediaChannel, SOCIAL_MEDIA_CHANNELS, ProposalCategory, ProposalVersion } from '../types';
import { EVALUATION_MATRIX } from '../constants';

interface BenchmarkStats {
  avgScore: number;
  avgInvestment: number;
  avgCpm: number;
  avgCpc: number;
  avgRsReach: number;
  avgCostPerScore: number;
  proposalCount: number;
}
interface Benchmarks {
  overall: BenchmarkStats;
  byRegion: { [region: string]: BenchmarkStats };
  byCategory: { [category: string]: BenchmarkStats };
}


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

function formatScoresForPrompt(proposal: Proposal, version: ProposalVersion): string {
    const applicableCriteria = EVALUATION_MATRIX.filter(c => 
        !c.applicableCategories || c.applicableCategories.includes(proposal.category!)
    );

    let formattedString = '';
    applicableCriteria.forEach(criterion => {
        const scoreData = version.scores[criterion.id];
        if (scoreData) {
            formattedString += `\n${criterion.criterion}:\n`;
            formattedString += `- ${criterion.indicator}: Pontuação ${scoreData.score}/3 (Valor: ${scoreData.value})\n`;
        }
    });
    return formattedString;
}


export const analyzePdfForAutoFill = async (pdfBase64: string, mimeType: string): Promise<AutoFillData> => {
  const model = 'gemini-2.5-flash';
  
  const prompt = `
    Você é um analista especialista em compra de mídia no Brasil. Sua tarefa é analisar o documento de proposta de mídia em PDF anexado e extrair as principais métricas e descrições com alta precisão.

    Com base no documento, preencha os valores para a seguinte estrutura JSON.
    - Para valores numéricos (pageviews, seguidores, investimento), forneça apenas o número. Não inclua "R$", pontos ou vírgulas para milhares. Use um ponto para decimais.
    - Para valores de porcentagem, forneça apenas o número (ex: para 15%, retorne 15).
    - Para valores categóricos, retorne a string de valor mais apropriada das opções fornecidas.
    - Para os campos de descrição (ex: "portal_blog_description"), extraia um resumo conciso de como a proposta planeja usar aquela mídia.
    - Se você não conseguir encontrar uma informação específica no documento, DEVE retornar null para esse campo. Não adivinhe dados.

    A estrutura JSON para preencher é:
    {
      "proposalName": "string | null",
      "proposalInvestment": "number | null",
      "preFormData": {
        "portal_blog_description": "string | null",
        "social_media_description": "string | null",
        "portal_existence": "inexistente" | "desatualizado" | "semanal" | "diario" | null,
        "portal_audience": "number | null",
        "complementary_formats": "0" | "1" | "2" | "3" | null,
        "crossposting": "0" | "1" | "2" | "3" | "4" | null,
        "demographic_rs_portal": "number | null",
        "privileged_visibility": "nenhum" | "media" | "boa" | "premium" | null,
        "cpm": "number | null",
        "cpc": "number | null",
        "real_reach_portal": "nao_estimado" | "generico" | "historico" | "auditado" | null,
        "real_reach_social": "nao_estimado" | "generico" | "historico" | "auditado" | null,
        "portal_formats": "0" | "1" | "2" | "3" | null,
        "social_formats": "0" | "1" | "2" | "3" | null,
        "branded_content": "sim" | "nao" | null
      },
      "socialMediaMetrics": {
        "Instagram": { "followers": "number | null", "avg_reach": "number | null", "demographic_rs_social": "number | null" },
        "Facebook": { "followers": "number | null", "avg_reach": "number | null", "demographic_rs_social": "number | null" },
        "TikTok": { "followers": "number | null", "avg_reach": "number | null", "demographic_rs_social": "number | null", "video_views": "number | null" },
        "YouTube": { "followers": "number | null", "avg_reach": "number | null", "demographic_rs_social": "number | null", "video_views": "number | null" },
        "X (Twitter)": { "followers": "number | null", "avg_reach": "number | null", "demographic_rs_social": "number | null" },
        "LinkedIn": { "followers": "number | null", "avg_reach": "number | null", "demographic_rs_social": "number | null" },
        "Kwai": { "followers": "number | null", "avg_reach": "number | null", "demographic_rs_social": "number | null", "video_views": "number | null" }
      }
    }

    Retorne APENAS o objeto JSON válido. Não adicione explicações ou texto markdown fora do JSON.
  `;
  
  try {
     const response = await ai.models.generateContent({
        model: model,
        contents: {
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        data: pdfBase64,
                        mimeType: mimeType,
                    },
                },
            ],
        },
    });

    let jsonText = response.text || "{}";
    
    // Robust clean-up for Markdown code blocks
    const markdownMatch = jsonText.match(/```json([\s\S]*?)```/);
    if (markdownMatch) {
        jsonText = markdownMatch[1];
    } else {
        // Fallback: Try to find the first '{' and last '}'
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        }
    }

    let parsedData;
    try {
        parsedData = JSON.parse(jsonText);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        console.error("Raw Text:", response.text);
        throw new Error("O formato de dados retornado pela IA não é válido.");
    }

    const sanitizedPreFormData: PreFormData = {};
    
    // Handle non-social fields
    if (parsedData.preFormData) {
        for (const key in parsedData.preFormData) {
            if (parsedData.preFormData[key] !== null) {
                sanitizedPreFormData[key] = parsedData.preFormData[key];
            }
        }
    }

    // Handle social media metrics, flatten them, and find active channels
    const activeSocialChannels: SocialMediaChannel[] = [];
    if (parsedData.socialMediaMetrics) {
        for (const channel in parsedData.socialMediaMetrics) {
            // Ensure the channel from the JSON is one of our defined channels
            if (SOCIAL_MEDIA_CHANNELS.includes(channel as SocialMediaChannel)) {
                const metrics = parsedData.socialMediaMetrics[channel];
                let channelHasData = false;
                for (const metric in metrics) {
                    if (metrics[metric] !== null) {
                        // Flatten the data: e.g., followers_Instagram = 12345
                        sanitizedPreFormData[`${metric}_${channel}`] = metrics[metric];
                        channelHasData = true;
                    }
                }
                if (channelHasData) {
                    activeSocialChannels.push(channel as SocialMediaChannel);
                }
            }
        }
    }

    // Add the list of active channels to the form data to pre-select them
    if (activeSocialChannels.length > 0) {
        sanitizedPreFormData.social_followers_channels = activeSocialChannels;
    }


    return {
        proposalName: parsedData.proposalName,
        proposalInvestment: parsedData.proposalInvestment,
        preFormData: sanitizedPreFormData,
    };
  } catch (error) {
    console.error("Gemini PDF analysis failed:", error);
    throw new Error("Falha ao analisar o PDF com a IA da Gemini. Verifique se o arquivo é legível.");
  }
};


export const generateAnalysis = async (proposal: Proposal, version: ProposalVersion, benchmarks: Benchmarks): Promise<string> => {
  const model = 'gemini-2.5-flash';
  
  const scoresText = formatScoresForPrompt(proposal, version);
  const socialChannelsInfo = proposal.socialChannels && proposal.socialChannels.length > 0 
    ? `- Canais de Redes Sociais: ${proposal.socialChannels.join(', ')}\n`
    : '';
    
  const regionBenchmark = proposal.region ? benchmarks.byRegion[proposal.region] : null;
  const categoryBenchmark = proposal.category ? benchmarks.byCategory[proposal.category] : null;

  let benchmarkText = '\nDados de Benchmark (Média Histórica):\n';
  if (regionBenchmark && regionBenchmark.proposalCount > 0) {
     benchmarkText += `- Média para Região (${proposal.region}): Pontuação=${regionBenchmark.avgScore.toFixed(2)}, CPM=R$${regionBenchmark.avgCpm.toFixed(2)}\n`;
  } else {
     benchmarkText += '- Nenhum dado de benchmark para esta região ainda.\n';
  }
  if (categoryBenchmark && categoryBenchmark.proposalCount > 0) {
     benchmarkText += `- Média para Categoria (${proposal.category}): Pontuação=${categoryBenchmark.avgScore.toFixed(2)}, CPM=R$${categoryBenchmark.avgCpm.toFixed(2)}\n`;
  } else {
     benchmarkText += '- Nenhum dado de benchmark para esta categoria ainda.\n';
  }
  benchmarkText += `- Média Geral: Pontuação=${benchmarks.overall.avgScore.toFixed(2)}, CPM=R$${benchmarks.overall.avgCpm.toFixed(2)}\n`;
  
  const prompt = `
    Você é um especialista sênior em mídia patrocinada com vasta experiência no mercado do Rio Grande do Sul. Sua tarefa é analisar uma proposta de publicidade digital com base nas pontuações fornecidas (em uma escala de 0 a 3, gerada a partir de dados objetivos) e fornecer uma análise estratégica concisa.

    Sua análise deve seguir premissas inegociáveis:
    1. A compra de mídia deve ser obrigatoriamente baseada no volume de entrega, ou seja, CPM (Custo por Mil Impressões) ou CPV (Custo por Visualização).
    2. A visibilidade da campanha deve ser privilegiada, com destaque na home/página principal do veículo. Propostas sem isso são consideradas de alto risco e devem ser renegociadas.

    Detalhes da Proposta (Versão ${version.versionNumber}):
    - Nome: ${proposal.name}
    - Veículo: ${proposal.vehicle || 'Não informado'}
    - Tipo de Compra: ${proposal.category}
    ${socialChannelsInfo}
    - Cidade Principal: ${proposal.city || 'Não informada'}
    - Região Funcional (RF): ${proposal.region || 'N/A'}
    - Investimento Total: R$ ${proposal.investment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    - Pontuação Geral Calculada: ${version.totalScore.toFixed(2)} de 3

    Pontuações por Critério:
    ${scoresText}
    ${benchmarkText}

    Sua Análise:
    Com base nos dados da proposta E nos dados de benchmark, forneça uma análise em 4 partes. Use os seguintes títulos para cada seção, exatamente como escritos (em minúsculas, exceto a primeira letra) e sem nenhuma formatação (como negrito ou markdown):
    Pontos fortes
    Pontos de atenção
    Análise de rentabilidade
    Recomendação final

    Em "Pontos fortes", identifique os 2-3 critérios com melhor pontuação e explique sua importância técnica.
    Em "Pontos de atenção", identifique os 2-3 critérios com pontuação mais baixa, explique os riscos e sugira pontos para negociação. Dê atenção especial à 'Visibilidade privilegiada'; se a pontuação for baixa, destaque isso como um ponto crítico.
    Em "Análise de rentabilidade", avalie o custo-benefício, comparando o investimento com a pontuação geral e métricas-chave como CPM. CRUCIALMENTE, compare o CPM da proposta com a média da região/categoria/geral e declare se está acima, abaixo ou na média. Use isso como um forte argumento sobre a competitividade do valor.
    Em "Recomendação final", dê um parecer claro (Ex: "A proposta é recomendada", "A proposta é recomendada com necessidade de renegociação dos pontos X e Y", "A proposta não é recomendada no formato atual").

    Mantenha um tom estritamente profissional e formal. Evite o uso de adjetivos subjetivos ou linguagem que expresse emoção (ex: "inaceitável", "excelente"). Baseie a análise puramente nos dados quantitativos fornecidos. O resultado deve ser texto puro.
    `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    // Safeguard to ensure no markdown bolding is present in the final output.
    const cleanedText = response.text.replace(/\*\*/g, '');
    return cleanedText;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Falha ao comunicar com a IA da Gemini.");
  }
};

export const generateComparisonAnalysis = async (proposals: Proposal[]): Promise<string> => {
    const model = 'gemini-2.5-flash';

    let proposalsText = '';
    
    proposals.forEach((p, index) => {
        const version = p.versions[p.currentVersion - 1];
        const score = version?.totalScore.toFixed(2) || '0';
        const cpm = version?.preFormData.cpm || 'N/A';
        const cpc = version?.preFormData.cpc || 'N/A';
        const rsReach = version?.preFormData.demographic_rs_portal || version?.preFormData.demographic_rs_social || 'N/A';
        
        proposalsText += `\nProposta ${index + 1}: ${p.name}\n`;
        proposalsText += `- Veículo: ${p.vehicle}\n`;
        proposalsText += `- Investimento: R$ ${p.investment.toLocaleString('pt-BR')}\n`;
        proposalsText += `- Pontuação Técnica: ${score}/3.0\n`;
        proposalsText += `- CPM: R$ ${cpm}\n`;
        proposalsText += `- CPC: R$ ${cpc}\n`;
        proposalsText += `- Alcance RS: ${rsReach}%\n`;
    });

    const prompt = `
      Atue como um Diretor de Mídia sênior. Compare as seguintes propostas de publicidade digital e forneça uma análise comparativa estratégica para tomada de decisão.

      DADOS DAS PROPOSTAS:
      ${proposalsText}

      OBJETIVO DA ANÁLISE:
      Identificar a melhor alocação de verba considerando eficiência técnica (pontuação), custo-benefício (CPM/CPC) e impacto (Alcance/Investimento).

      ESTRUTURA DA RESPOSTA (Use exatamente estes títulos):
      
      Comparativo de Eficiência Técnica
      Compare as notas técnicas. Qual veículo apresenta a melhor qualidade de entrega segundo os critérios? Há uma discrepância grande de qualidade entre as opções?

      Análise Financeira e ROI
      Compare o CPM e o Investimento Total. Qual proposta entrega mais pelo menor custo? Se uma proposta é mais cara, a pontuação técnica justifica o valor extra?

      Veredito
      Indique claramente qual proposta é a vencedora no cenário atual e porquê. Se houver um empate técnico, sugira o critério de desempate (ex: priorizar menor preço ou maior alcance regional).

      Mantenha o texto direto, profissional e imparcial. Não use negrito ou markdown.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text.replace(/\*\*/g, '');
    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error("Falha ao gerar comparativo com IA.");
    }
};
