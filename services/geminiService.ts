import { analyzeFleetApi } from './api';

export const analyzeFleetStatus = async () => {
  try {
    return await analyzeFleetApi();
  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    return null;
  }
};
