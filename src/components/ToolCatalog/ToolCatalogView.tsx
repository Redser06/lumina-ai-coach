import React, { useState } from 'react';
import { 
  Wrench, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Bookmark, 
  BookmarkCheck,
  Zap
} from 'lucide-react';
import { AI_TOOLS_CATALOG } from '../../data/toolsData';
import { UserProfile } from '../../types.ts';

interface ToolCatalogViewProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export const ToolCatalogView: React.FC<ToolCatalogViewProps> = ({
  userProfile,
  setUserProfile
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: 'All AI Assets' },
    { id: 'model', label: 'Frontier Models' },
    { id: 'ide_extension', label: 'Agentic IDEs' },
    { id: 'orchestration', label: 'State Orchestrators' },
    { id: 'protocol', label: 'Protocols & MCP' },
    { id: 'eval_observability', label: 'Evals & Tracing' },
  ];

  const handleToggleBookmark = (toolId: string) => {
    setUserProfile(prev => {
      const isBookmarked = prev.bookmarkedTools.includes(toolId);
      return {
        ...prev,
        bookmarkedTools: isBookmarked
          ? prev.bookmarkedTools.filter(id => id !== toolId)
          : [...prev.bookmarkedTools, toolId]
      };
    });
  };

  const filteredTools = AI_TOOLS_CATALOG.filter((tool) => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.bestUsedFor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-teal-500 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wide">
            <Wrench className="w-3.5 h-3.5" />
            <span>Curated Enterprise AI Toolkit</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            AI Models, Frameworks & Tool Directory
          </h1>
          <p className="text-indigo-50 text-sm sm:text-base leading-relaxed">
            Discover vetted AI technologies to elevate your day-to-day productivity. Compare context windows, cost tiers, architectural strengths, and best practices.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter models, IDEs, frameworks..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => {
          const isBookmarked = userProfile.bookmarkedTools.includes(tool.id);

          return (
            <div
              key={tool.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-card-hover transition-all duration-200 p-6 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-base text-slate-900 group-hover:text-indigo-600 transition">
                        {tool.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {tool.vendor}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 capitalize">
                      {tool.category.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleBookmark(tool.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark tool'}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {tool.description}
                </p>

                {/* Best Used For */}
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-indigo-500" />
                    <span>Best Used For</span>
                  </span>
                  <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                    {tool.bestUsedFor}
                  </p>
                </div>

                {/* Key Strengths */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Key Strengths</span>
                  <ul className="space-y-1">
                    {tool.keyStrengths.map((str, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cheatsheet Tips */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pro-Tip / Best Practice</span>
                  <ul className="space-y-1">
                    {tool.cheatsheetTips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg leading-relaxed font-mono">
                        💡 {tip}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 text-[11px]">
                  {tool.pricingTier} • {tool.contextWindow || 'Open Source'}
                </span>
                
                <a
                  href={tool.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  <span>Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
