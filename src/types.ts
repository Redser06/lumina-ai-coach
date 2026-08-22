export type UserRole = 'software_engineer' | 'product_manager' | 'data_ops' | 'business_analyst' | 'executive';

export type ExperienceLevel = 'novice' | 'prompt_practitioner' | 'agent_builder' | 'systems_architect';

export interface UserProfile {
  name: string;
  role: UserRole;
  level: ExperienceLevel;
  department: string;
  xp: number;
  completedMissions: string[];
  completedLessons: string[];
  bookmarkedTools: string[];
  diagnosticCompleted: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  category: 'models' | 'agents' | 'mcp' | 'evals' | 'governance';
  date: string;
  badgeText: string;
  summary: string;
  keyTakeaways: string[];
  roleImpacts: Record<UserRole, string>;
  recommendedAction: string;
  readTime: string;
  relatedLabId?: string;
  source: string;
}

export interface QuizQuestion {
  id: string;
  scenario: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface Lesson {
  id: string;
  title: string;
  trackId: string;
  level: ExperienceLevel;
  durationMinutes: number;
  xpReward: number;
  overview: string;
  keyConcepts: string[];
  codeSnippets?: {
    title: string;
    language: string;
    code: string;
    explanation: string;
  }[];
  practicalExercise: {
    instruction: string;
    hints: string[];
    solutionSnippet?: string;
  };
  quiz: QuizQuestion;
  relatedSimulatorTab?: 'agent_loop' | 'graph_builder' | 'mcp_chaining' | 'evals_matrix';
}

export interface LearningTrack {
  id: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
  lessons: Lesson[];
}

export interface CoachMessage {
  id: string;
  sender: 'coach' | 'user' | 'system';
  timestamp: string;
  content: string;
  suggestedPrompts?: string[];
  actionLink?: {
    tab: 'dashboard' | 'coach' | 'curriculum' | 'simulators' | 'news' | 'tools';
    subView?: string;
    label: string;
  };
  interactiveQuiz?: QuizQuestion;
}

export interface ToolEntry {
  id: string;
  name: string;
  category: 'model' | 'ide_extension' | 'orchestration' | 'eval_observability' | 'protocol';
  vendor: string;
  description: string;
  keyStrengths: string[];
  bestUsedFor: string;
  license: string;
  contextWindow?: string;
  pricingTier: string;
  status: 'Production' | 'Emerging' | 'Preview';
  cheatsheetTips: string[];
  docUrl: string;
}

export interface DiagnosticQuestion {
  id: string;
  question: string;
  context: string;
  options: {
    text: string;
    levelPoints: Record<ExperienceLevel, number>;
    roleBonus?: UserRole;
  }[];
}
