import React, { useState } from 'react';
import { ArrowRight, Flame } from 'lucide-react';
import { AI_NEWS_ITEMS } from '../../data/newsData';
import { UserRole } from '../../types.ts';

interface NewsTickerProps {
  userRole: UserRole;
  onSelectNews: (newsId: string) => void;
  onNavigateNews: () => void;
}

export const NewsTicker: React.FC<NewsTickerProps> = ({
  userRole,
  onSelectNews,
  onNavigateNews
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = AI_NEWS_ITEMS[currentIndex % AI_NEWS_ITEMS.length];

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white py-2 px-4 shadow-sm border-b border-indigo-700/50">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
        
        {/* Left Badge */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold uppercase tracking-wider text-[10px]">
            <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>AI Radar</span>
          </span>
          <span className="hidden sm:inline text-indigo-200/70 font-mono">|</span>
        </div>

        {/* Center Headline & Role Insight */}
        <div 
          onClick={() => onSelectNews(currentItem.id)}
          className="flex-1 mx-3 flex items-center justify-start sm:justify-center space-x-2 truncate cursor-pointer group"
        >
          <span className="px-1.5 py-0.2 rounded bg-indigo-600/60 text-indigo-100 text-[10px] font-semibold">
            {currentItem.badgeText}
          </span>
          <span className="truncate font-medium text-slate-100 group-hover:text-indigo-200 transition">
            {currentItem.title}
          </span>
          <span className="hidden lg:inline text-indigo-300/80 text-[11px] italic">
            — Impact: {currentItem.roleImpacts[userRole].slice(0, 65)}...
          </span>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setCurrentIndex(prev => (prev + 1) % AI_NEWS_ITEMS.length)}
            className="px-2 py-0.5 rounded bg-indigo-700/50 hover:bg-indigo-600/80 text-[11px] font-medium text-indigo-200 hover:text-white transition"
          >
            Next ({currentIndex + 1}/{AI_NEWS_ITEMS.length})
          </button>
          <button
            onClick={onNavigateNews}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white text-indigo-900 hover:bg-indigo-50 text-[11px] font-bold transition shadow-xs"
          >
            <span>Feed</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>
    </div>
  );
};
