'use client';

import { Brain, Coins, Feather, X, Minimize2 } from 'lucide-react';
import { useState } from 'react';

interface Review {
  role: string;
  score: number;
  comment: string;
}

interface CouncilPanelProps {
  reviews: Review[];
  overallVerdict: string;
  onClose: () => void;
}

// Agent configuration with icons and colors
const AGENT_CONFIG = {
  Logician: {
    icon: Brain,
    accentColor: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600',
    scoreColor: 'text-blue-700',
  },
  Merchant: {
    icon: Coins,
    accentColor: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-600',
    scoreColor: 'text-amber-700',
  },
  Poet: {
    icon: Feather,
    accentColor: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-600',
    scoreColor: 'text-purple-700',
  },
};

export default function CouncilPanel({ reviews, overallVerdict, onClose }: CouncilPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-[13px] font-sans rounded-md hover:bg-zinc-800 transition-colors shadow-lg"
        >
          <Brain className="w-4 h-4" />
          THE COUNCIL
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-zinc-900 shadow-2xl animate-slide-up">
      {/* Header */}
      <div className="bg-zinc-900 text-white px-6 py-3 flex items-center justify-between">
        <h2 className="text-[14px] uppercase tracking-widest font-sans font-bold flex items-center gap-2">
          <Brain className="w-4 h-4" />
          THE COUNCIL IS IN SESSION
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-h-[50vh] overflow-y-auto">
        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {reviews.map((review, index) => {
            const config = AGENT_CONFIG[review.role as keyof typeof AGENT_CONFIG];
            if (!config) return null;

            const Icon = config.icon;

            return (
              <div
                key={index}
                className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-5 transition-all hover:shadow-md`}
              >
                {/* Card Header */}
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-5 h-5 ${config.textColor}`} />
                  <h3 className={`text-[12px] uppercase tracking-wider font-sans font-bold ${config.textColor}`}>
                    {review.role}
                  </h3>
                </div>

                {/* Score */}
                <div className="mb-4">
                  <div className={`text-6xl font-bold ${config.scoreColor} font-sans leading-none`}>
                    {review.score}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-sans mt-1">
                    / 100
                  </div>
                </div>

                {/* Comment */}
                <p className="text-sm text-zinc-700 leading-relaxed font-sans">
                  {review.comment}
                </p>
              </div>
            );
          })}
        </div>

        {/* Overall Verdict */}
        {overallVerdict && (
          <div className="bg-zinc-50 border-2 border-zinc-200 rounded-lg p-4">
            <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 font-sans font-bold mb-2">
              OVERALL VERDICT
            </h4>
            <p className="text-base text-zinc-800 leading-relaxed font-sans">
              {overallVerdict}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
