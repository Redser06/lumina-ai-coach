import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types.ts';
import { ROLE_DISPLAY_NAMES } from '../data/coachKnowledge.ts';

interface SideNavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onOpenDiagnostic: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  activeTab,
  setActiveTab,
  userProfile,
  setUserProfile,
  onOpenDiagnostic
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roles: UserRole[] = [
    'software_engineer',
    'product_manager',
    'data_ops',
    'business_analyst',
    'executive'
  ];

  const navItems = [
    { id: 'coach', label: 'Coach', icon: 'psychology' },
    { id: 'paths', label: 'Paths', icon: 'route' },
    { id: 'news', label: 'News', icon: 'rss_feed' },
    { id: 'deep_dives', label: 'Deep-Dives', icon: 'terminal' },
    { id: 'tools', label: 'Tools', icon: 'handyman' },
  ];

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant/20 p-4 shadow-sm z-40">
      
      {/* Brand Header */}
      <div className="mb-6 px-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm shadow-primary/20">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            psychology
          </span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary font-bold tracking-tight">Lumina AI</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Intelligent Clarity</p>
        </div>
      </div>

      {/* Role / XP Selector Pill */}
      <div className="mb-4 px-2 relative">
        <button
          onClick={() => setShowRoleMenu(!showRoleMenu)}
          className="w-full flex items-center justify-between p-2.5 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/20 rounded-xl text-left transition shadow-2xs group"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <div className="truncate">
              <p className="text-[11px] font-bold text-on-surface truncate">{ROLE_DISPLAY_NAMES[userProfile.role]}</p>
              <p className="text-[10px] text-on-surface-variant font-medium">{userProfile.xp} XP • {userProfile.level.replace('_', ' ')}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-outline text-[18px] group-hover:text-primary transition-colors">
            expand_more
          </span>
        </button>

        {showRoleMenu && (
          <div className="absolute left-2 right-2 mt-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-level-2 py-1 z-50 animate-in fade-in">
            <div className="px-3 py-1.5 border-b border-outline-variant/10 text-[10px] font-bold text-outline uppercase tracking-wider">
              Switch Employee Role
            </div>
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setUserProfile(prev => ({ ...prev, role: r }));
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-primary/5 transition ${
                  userProfile.role === r ? 'text-primary font-bold bg-primary/5' : 'text-on-surface'
                }`}
              >
                <span>{ROLE_DISPLAY_NAMES[r]}</span>
                {userProfile.role === r && <span className="material-symbols-outlined text-primary text-sm">check</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-md text-label-md text-left transition-all duration-200 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm translate-x-1'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
        <button
          onClick={onOpenDiagnostic}
          className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-label-md text-label-md font-bold transition flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          <span>AI Diagnostic</span>
        </button>

        <div className="flex flex-col gap-1 text-on-surface-variant">
          <a
            href="https://github.com/Redser06/lumina-ai-coach"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2 rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-sm">code</span>
            <span>Source Repo</span>
          </a>
          <button
            onClick={onOpenDiagnostic}
            className="flex items-center gap-3 px-4 py-2 rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors text-left"
          >
            <span className="material-symbols-outlined text-sm">help</span>
            <span>Help & Guides</span>
          </button>
        </div>
      </div>

    </aside>
  );
};
