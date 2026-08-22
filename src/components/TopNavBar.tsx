import React from 'react';
import { UserProfile } from '../types.ts';

interface TopNavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userProfile: UserProfile;
  onOpenDiagnostic: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  setActiveTab,
  userProfile,
  onOpenDiagnostic
}) => {
  const tabs = [
    { id: 'coach', label: 'Coach' },
    { id: 'paths', label: 'Paths' },
    { id: 'news', label: 'News' },
    { id: 'deep_dives', label: 'Deep-Dives' },
    { id: 'tools', label: 'Tools' },
  ];

  return (
    <header className="md:hidden sticky top-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/20 shadow-sm">
      <div className="flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-2" onClick={() => setActiveTab('coach')}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-xs">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              psychology
            </span>
          </div>
          <span className="font-headline-md text-lg text-primary font-bold">Lumina AI</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenDiagnostic}
            className="p-2 text-primary hover:bg-primary/10 rounded-full transition"
            title="Start Diagnostic"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-bold text-xs flex items-center justify-center border border-primary/20">
            {userProfile.name.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Tab Scroll */}
      <div className="flex overflow-x-auto gap-4 px-4 pb-2 scrollbar-none border-t border-outline-variant/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`font-label-md text-xs whitespace-nowrap py-1.5 transition ${
              activeTab === t.id
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
};
