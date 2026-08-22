import React, { useState } from 'react';
import { 
  Newspaper, 
  Search, 
  Tag, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  Cpu, 
  BarChart3,
  UserCheck
} from 'lucide-react';
import { AI_NEWS_ITEMS } from '../../data/newsData';
import { NewsItem, UserRole } from '../../types.ts';
import { ROLE_DISPLAY_NAMES } from '../../data/coachKnowledge';

interface NewsHubProps {
  userRole: UserRole;
  onLaunchSimulator: (labId: string) => void;
  selectedNewsId?: string | null;
}

export const NewsHub: React.FC<NewsHubProps> = ({
  userRole,
  onLaunchSimulator,
  selectedNewsId
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalNews, setActiveModalNews] = useState<NewsItem | null>(() => {
    if (selectedNewsId) {
      return AI_NEWS_ITEMS.find(n => n.id === selectedNewsId) || null;
    }
    return null;
  });

  const categories = [
    { id: 'all', label: 'All Updates', icon: Layers },
    { id: 'models', label: 'Models & Reasoning', icon: Sparkles },
    { id: 'agents', label: 'Agents & Loops', icon: Cpu },
    { id: 'mcp', label: 'MCP & Tooling', icon: Tag },
    { id: 'evals', label: 'Evals & Reliability', icon: BarChart3 },
  ];

  const filteredNews = AI_NEWS_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keyTakeaways.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
            <Newspaper className="w-3.5 h-3.5" />
            <span>Curated Enterprise Radar</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Latest AI Breakthroughs & Practical Industry Pulse
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            Cut through the marketing noise. Get empirical analysis of frontier models, reasoning tokens, MCP protocol updates, and agent architectures — with tailored impact assessments for your role as a <strong className="text-white underline decoration-teal-300">{ROLE_DISPLAY_NAMES[userRole]}</strong>.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news, models, tools..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

      </div>

      {/* News Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredNews.map((item) => {
          const roleImpact = item.roleImpacts[userRole];
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6 space-y-4">
                
                {/* Meta header */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60">
                    {item.badgeText}
                  </span>
                  <div className="text-[11px] font-medium text-slate-400 flex items-center space-x-2">
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.readTime}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 
                  onClick={() => setActiveModalNews(item)}
                  className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition cursor-pointer leading-snug"
                >
                  {item.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.summary}
                </p>

                {/* Key Takeaways */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Key Takeaways</span>
                  <ul className="space-y-1">
                    {item.keyTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Role Specific Callout */}
                <div className="bg-gradient-to-r from-teal-50/70 to-indigo-50/70 border border-teal-200/60 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-teal-800 text-[11px] font-bold">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Impact on {ROLE_DISPLAY_NAMES[userRole]}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {roleImpact}
                  </p>
                </div>

              </div>

              {/* Action Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Source: {item.source}</span>
                {item.relatedLabId ? (
                  <button
                    onClick={() => onLaunchSimulator(item.relatedLabId!)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <span>Try in Interactive Lab</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveModalNews(item)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>Read Deep Dive</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* News Details Modal */}
      {activeModalNews && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                {activeModalNews.badgeText}
              </span>
              <button
                onClick={() => setActiveModalNews(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">{activeModalNews.title}</h2>
              <p className="text-xs text-slate-400 font-medium">Source: {activeModalNews.source} • {activeModalNews.date}</p>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {activeModalNews.summary}
            </p>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detailed Analysis & Takeaways</h4>
              <div className="space-y-2">
                {activeModalNews.keyTakeaways.map((t, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-indigo-900 flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Your Role-Specific Implementation Guidance ({ROLE_DISPLAY_NAMES[userRole]})</span>
              </h4>
              <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                {activeModalNews.roleImpacts[userRole]}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveModalNews(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                Close
              </button>
              {activeModalNews.relatedLabId && (
                <button
                  onClick={() => {
                    const lab = activeModalNews.relatedLabId!;
                    setActiveModalNews(null);
                    onLaunchSimulator(lab);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                >
                  <span>Launch Recommended Lab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
