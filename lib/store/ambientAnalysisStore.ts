import { create } from 'zustand';

interface AmbientAnalysisState {
  // Sentiment color (based on emotional tone)
  sentimentColor: string;
  
  // Originality color (based on AI vs Human ratio)
  originalityColor: string;
  
  // Actions
  setSentimentColor: (color: string) => void;
  setOriginalityColor: (color: string) => void;
  setColors: (sentiment: string, originality: string) => void;
}

const DEFAULT_COLORS = {
  sentimentColor: 'rgb(161 161 170)', // Neutral gray (zinc-400)
  originalityColor: 'rgb(234 179 8)', // Gold (100% human)
};

export const useAmbientAnalysisStore = create<AmbientAnalysisState>((set) => ({
  // Initial state
  ...DEFAULT_COLORS,
  
  // Actions
  setSentimentColor: (color) => set({ sentimentColor: color }),
  setOriginalityColor: (color) => set({ originalityColor: color }),
  setColors: (sentiment, originality) => 
    set({ sentimentColor: sentiment, originalityColor: originality }),
}));
