import React, { useState } from 'react';
import { 
  Sparkles, 
  Compass, 
  MessageSquareCode, 
  Cpu, 
  BookOpen, 
  Newspaper, 
  Wrench, 
  UserCheck, 
  Award, 
  ChevronDown,
  Activity
} from 'lucide-react';
import { UserProfile, UserRole } from '../types.ts';
import { ROLE_DISPLAY_NAMES } from '../data/coachKnowledge';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onOpenDiagnostic: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userProfile,
  setUserProfile,
  onOpenDiagnostic
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roles: UserRole[] = [
    'software_engineer',
    'product_manager',
    'data_ops',
    'business_analyst',
    'executive'
  ];

  const handleSelectRole = (role: UserRole) => {
    setUserProfile(prev => ({ ...prev, role }));
    setShowRoleDropdown(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Compass },
    { id: 'coach', label: 'AI Coach', icon: MessageSquareCode, highlight: true },
    { id: 'simulators', label: 'Simulators & Labs', icon: Cpu, badge: '4 Labs' },
    { id: 'curriculum', label: 'Training Sets', icon: BookOpen },
    { id: 'news', label: 'AI News Feed', icon: Newspaper, live: true },
    { id: 'tools', label: 'Tools & Models', icon: Wrench },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Lumina</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">AI Coach</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Internal Enablement Hub</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'text-indigo-600 bg-indigo-50/80 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {item.badge}
                    </span>
                  )}
                  {item.live && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Role, XP & Diagnostic Controls */}
          <div className="flex items-center space-x-3">
            
            {/* XP Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/70 rounded-full text-xs font-semibold text-amber-800">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>{userProfile.xp} XP</span>
            </div>

            {/* Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
                title="Change your employee role to customize learning sets and news impact"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span className="max-w-[120px] truncate">{ROLE_DISPLAY_NAMES[userProfile.role]}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Select Your Role</p>
                  </div>
                  {roles.map((roleKey) => (
                    <button
                      key={roleKey}
                      onClick={() => handleSelectRole(roleKey)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-50 hover:text-indigo-600 transition ${
                        userProfile.role === roleKey ? 'bg-indigo-50/70 text-indigo-700 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <span>{ROLE_DISPLAY_NAMES[roleKey]}</span>
                      {userProfile.role === roleKey && <span className="text-[10px] text-indigo-600 font-bold">Active</span>}
                    </button>
                  ))}
                  <div className="p-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowRoleDropdown(false);
                        onOpenDiagnostic();
                      }}
                      className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium text-center flex items-center justify-center space-x-1 shadow-sm"
                    >
                      <Activity className="w-3 h-3" />
                      <span>Retake AI Diagnostic</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Diagnostic Button */}
            {!userProfile.diagnosticCompleted && (
              <button
                onClick={onOpenDiagnostic}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Assessment</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
