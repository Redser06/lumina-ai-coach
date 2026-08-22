import { useState, useEffect } from 'react';
import { SideNavBar } from './components/SideNavBar.tsx';
import { TopNavBar } from './components/TopNavBar.tsx';
import { CoachDashboardView } from './components/AICoach/CoachDashboardView.tsx';
import { TrainingPathsView } from './components/Curriculum/TrainingPathsView.tsx';
import { NewsFeedView } from './components/NewsFeed/NewsFeedView.tsx';
import { TechnicalDeepDivesView } from './components/Simulators/TechnicalDeepDivesView.tsx';
import { ToolHubView } from './components/ToolCatalog/ToolHubView.tsx';
import { DiagnosticModal } from './components/AICoach/DiagnosticModal.tsx';
import type { UserProfile } from './types.ts';

const STORAGE_KEY = 'lumina_user_profile_v2';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Alex Vance',
  role: 'software_engineer',
  level: 'agent_builder',
  department: 'Platform Engineering',
  xp: 320,
  completedMissions: ['m-react-loop', 'm-mcp-connect'],
  completedLessons: ['l-react-1', 'l-eval-1'],
  bookmarkedTools: ['claude-3-7-sonnet', 'antigravity-sdk'],
  diagnosticCompleted: false,
};

export function App() {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('coach');
  const [activeLabId, setActiveLabId] = useState<string | null>(null);
  const [initialCoachQuery, setInitialCoachQuery] = useState<string | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  const handleLaunchSimulator = (labId: string) => {
    setActiveLabId(labId);
    setActiveTab('deep_dives');
  };

  const handleNavigateWithQuery = (tab: string, query?: string, subView?: string) => {
    if (subView) setActiveLabId(subView);
    if (query) setInitialCoachQuery(query);
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-on-background antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      
      {/* Desktop Side Navigation */}
      <SideNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        onOpenDiagnostic={() => setIsDiagnosticOpen(true)}
      />

      {/* Mobile Top Navigation */}
      <TopNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userProfile={userProfile}
        onOpenDiagnostic={() => setIsDiagnosticOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden bg-surface">
        {activeTab === 'coach' && (
          <CoachDashboardView
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            onLaunchSimulator={handleLaunchSimulator}
            onNavigateTab={setActiveTab}
            initialQuery={initialCoachQuery}
            onClearInitialQuery={() => setInitialCoachQuery(null)}
          />
        )}

        {activeTab === 'paths' && (
          <TrainingPathsView
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            onLaunchSimulator={handleLaunchSimulator}
          />
        )}

        {activeTab === 'news' && (
          <NewsFeedView
            userRole={userProfile.role}
            onSelectActionLink={(tab, subView) => handleNavigateWithQuery(tab, undefined, subView)}
          />
        )}

        {activeTab === 'deep_dives' && (
          <TechnicalDeepDivesView
            activeLabId={activeLabId}
            onClearActiveLab={() => setActiveLabId(null)}
          />
        )}

        {activeTab === 'tools' && (
          <ToolHubView
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            onLaunchSimulator={handleLaunchSimulator}
          />
        )}
      </main>

      {/* Interactive AI Diagnostic Modal */}
      <DiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
      />

    </div>
  );
}

export default App;
