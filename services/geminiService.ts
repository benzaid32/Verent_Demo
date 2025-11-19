import { GoogleGenAI, Type } from "@google/genai";
import { Device } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFleetStatus = async (devices: Device[]) => {
  try {
    const prompt = `
      You are an AI Fleet Manager for a DePIN (Decentralized Physical Infrastructure Network) protocol called Verent.
      Analyze the following fleet data and provide a concise, professional executive summary.
      
      Fleet Data:
      ${JSON.stringify(devices, null, 2)}
      
      Focus on:
      1. Overall network health.
      2. Revenue efficiency.
      3. Two specific actionable optimization tips.
      
      Keep the tone precise, mathematical, and enterprise-grade.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            optimizationTips: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            projectedEarnings: { type: Type.STRING, description: "A short string estimating monthly earnings based on current rates" }
          }
        }
      }
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};
