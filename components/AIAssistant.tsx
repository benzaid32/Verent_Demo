import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, Loader2 } from 'lucide-react';
import { analyzeFleetStatus } from '../services/geminiService';
import { Device, AIAnalysisResponse } from '../types';

interface AIAssistantProps {
  devices: Device[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ devices }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    const result = await analyzeFleetStatus(devices);
    setAnalysis(result);
    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); if (!analysis) handleAnalyze(); }}
        className="fixed bottom-6 right-6 bg-gray-900 text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition-all duration-300 flex items-center space-x-2 border border-gray-700 z-50 group"
      >
        <Sparkles className="w-5 h-5 text-verent-green" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-medium">
          Ask Verent AI
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      <div className="p-4 bg-gray-900 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-verent-green" />
          <h3 className="text-white font-medium text-sm">Verent Intelligence</h3>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 bg-white max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-8 h-8 text-verent-green animate-spin" />
            <p className="text-xs text-gray-500 font-medium animate-pulse">Analyzing fleet telemetry...</p>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Executive Summary</h4>
              <p className="text-sm text-gray-800 leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            <div>
               <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Projected MRR</h4>
               <div className="text-2xl font-bold text-verent-green tracking-tight">
                  {analysis.projectedEarnings}
               </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Optimization Actions</h4>
              <ul className="space-y-3">
                {analysis.optimizationTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-verent-green flex-shrink-0" />
                    <span className="text-xs text-gray-600">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <button 
              onClick={handleAnalyze}
              className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              Refresh Analysis
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-4">Connection error. Please try again.</p>
            <button onClick={handleAnalyze} className="text-xs text-verent-green underline">Retry</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;
