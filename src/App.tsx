import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { NewsTicker } from './components/NewsFeed/NewsTicker';
import { DashboardOverview } from './components/Overview/DashboardOverview';
import { CoachView } from './components/AICoach/CoachView';
import { DiagnosticModal } from './components/AICoach/DiagnosticModal';
import { SimulatorHubView } from './components/Simulators/SimulatorHubView';
import { CurriculumView } from './components/Curriculum/CurriculumView';
import { NewsHub } from './components/NewsFeed/NewsHub';
import { ToolCatalogView } from './components/ToolCatalog/ToolCatalogView';
import { UserProfile } from './types.ts';
import { Github } from 'lucide-react';

const STORAGE_KEY = 'lumina_user_profile_v1';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeSimulatorLab, setActiveSimulatorLab] = useState<string>('agent_loop');
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);
  const [pendingCoachQuery, setPendingCoachQuery] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached profile', e);
      }
    }
    return {
      name: 'Conor Redmond',
      role: 'software_engineer',
      level: 'prompt_practitioner',
      department: 'Engineering',
      xp: 250,
      completedMissions: [],
      completedLessons: ['lesson-react-loop'],
      bookmarkedTools: ['tool-claude-37', 'tool-antigravity'],
      diagnosticCompleted: false
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  const handleLaunchSimulator = (labId: string) => {
    setActiveSimulatorLab(labId);
    setActiveTab('simulators');
  };

  const handleSelectNews = (newsId: string) => {
    setSelectedNewsId(newsId);
    setActiveTab('news');
  };

  const handleQuickCoachQuery = (query: string) => {
    setPendingCoachQuery(query);
    setActiveTab('coach');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
      
      {/* Top Navigation & Live Radar Ticker */}
      <div>
        <NewsTicker
          userRole={userProfile.role}
          onSelectNews={handleSelectNews}
          onNavigateNews={() => setActiveTab('news')}
        />
        
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          onOpenDiagnostic={() => setShowDiagnosticModal(true)}
        />

        {/* Main Workspace Views */}
        <main className="pb-16 animate-in fade-in duration-150">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              userProfile={userProfile}
              onNavigateTab={setActiveTab}
              onLaunchSimulator={handleLaunchSimulator}
              onOpenDiagnostic={() => setShowDiagnosticModal(true)}
              onQuickCoachQuery={handleQuickCoachQuery}
            />
          )}

          {activeTab === 'coach' && (
            <CoachView
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              onLaunchSimulator={handleLaunchSimulator}
              onNavigateTab={setActiveTab}
              initialQuery={pendingCoachQuery}
              onClearInitialQuery={() => setPendingCoachQuery(null)}
            />
          )}

          {activeTab === 'simulators' && (
            <SimulatorHubView initialLab={activeSimulatorLab} />
          )}

          {activeTab === 'curriculum' && (
            <CurriculumView
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              onLaunchSimulator={handleLaunchSimulator}
            />
          )}

          {activeTab === 'news' && (
            <NewsHub
              userRole={userProfile.role}
              onLaunchSimulator={handleLaunchSimulator}
              selectedNewsId={selectedNewsId}
            />
          )}

          {activeTab === 'tools' && (
            <ToolCatalogView
              userProfile={userProfile}
              setUserProfile={setUserProfile}
            />
          )}
        </main>
      </div>

      {/* Modern Bright Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              L
            </div>
            <span className="font-semibold text-slate-800">Lumina AI Coach</span>
            <span>— Internal AI Enablement Platform</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Version 1.0.0 • React + Vite + Tailwind</span>
            <a
              href="https://github.com/Redser06/lumina-ai-coach"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-slate-600 hover:text-indigo-600 font-medium transition"
            >
              <Github className="w-4 h-4" />
              <span>Redser06/lumina-ai-coach</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Onboarding Diagnostic Modal */}
      <DiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
      />

    </div>
  );
};
