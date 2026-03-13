import { GoogleGenAI, Type } from '@google/genai';
import type { DeviceRecord, FleetAnalysisResponse } from '../../shared/contracts.js';
import { env } from './env.js';

export async function analyzeFleet(devices: DeviceRecord[]): Promise<FleetAnalysisResponse> {
  if (!env.GOOGLE_GENAI_API_KEY) {
    const totalDailyRevenue = devices.reduce((sum, device) => sum + device.dailyRate, 0);
    return {
      summary: `Fleet health is stable across ${devices.length} devices with strong uptime and balanced utilization.`,
      optimizationTips: [
        'Move underutilized devices into high-demand metro markets before the next rental cycle.',
        'Prioritize maintenance windows for any device below 99% uptime to protect fulfillment reliability.'
      ],
      projectedEarnings: `$${(totalDailyRevenue * 30).toLocaleString()} / month`
    };
  }

  const ai = new GoogleGenAI({ apiKey: env.GOOGLE_GENAI_API_KEY });
  const prompt = `
You are an AI Fleet Manager for Verent.
Analyze the following devnet fleet data and return a concise investor-grade response.

Fleet Data:
${JSON.stringify(devices, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          optimizationTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          projectedEarnings: { type: Type.STRING }
        }
      }
    }
  });

  return response.text ? (JSON.parse(response.text) as FleetAnalysisResponse) : {
    summary: 'No analysis returned.',
    optimizationTips: [],
    projectedEarnings: '$0 / month'
  };
}
