import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Copy, 
  Check, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Lesson, UserProfile } from '../../types.ts';
import confetti from 'canvas-confetti';

interface LessonModalProps {
  lesson: Lesson | null;
  onClose: () => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onLaunchSimulator: (labId: string) => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  lesson,
  onClose,
  userProfile,
  setUserProfile,
  onLaunchSimulator
}) => {
  if (!lesson) return null;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmittedQuiz, setHasSubmittedQuiz] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isLessonCompleted = userProfile.completedLessons.includes(lesson.id);

  const handleCopyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleQuizSubmit = () => {
    if (!selectedOptionId) return;
    setHasSubmittedQuiz(true);

    const chosen = lesson.quiz.options.find(o => o.id === selectedOptionId);
    if (chosen?.isCorrect && !isLessonCompleted) {
      setUserProfile(prev => ({
        ...prev,
        completedLessons: [...prev.completedLessons, lesson.id],
        xp: prev.xp + lesson.xpReward
      }));
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 border border-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase">
                {lesson.durationMinutes} min • +{lesson.xpReward} XP
              </span>
              {isLessonCompleted && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Mastered</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{lesson.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Overview */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lesson Overview</h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {lesson.overview}
          </p>
        </div>

        {/* Key Concepts */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Key Concepts & Principles</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {lesson.keyConcepts.map((concept, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{concept}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Snippets */}
        {lesson.codeSnippets && lesson.codeSnippets.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Architecture & Code Pattern</h3>
            {lesson.codeSnippets.map((snippet, idx) => (
              <div key={idx} className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md font-mono text-xs overflow-x-auto">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-semibold text-indigo-400">{snippet.title}</span>
                  <button
                    onClick={() => handleCopyCode(snippet.code, idx)}
                    className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 transition"
                  >
                    {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-indigo-200 leading-relaxed">{snippet.code}</pre>
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-sans">
                  💡 {snippet.explanation}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Practical Lab Link */}
        {lesson.relatedSimulatorTab && (
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-teal-500/10 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900">Hands-on Simulator Exercise</h4>
              <p className="text-[11px] text-slate-600">{lesson.practicalExercise.instruction}</p>
            </div>
            <button
              onClick={() => {
                const lab = lesson.relatedSimulatorTab!;
                onClose();
                onLaunchSimulator(lab);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-sm transition"
            >
              <Play className="w-3 h-3" />
              <span>Launch Lab</span>
            </button>
          </div>
        )}

        {/* Interactive Knowledge Check (Quiz) */}
        <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Scenario Knowledge Check</h3>
          </div>

          <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
            {lesson.quiz.scenario}
          </p>

          <div className="space-y-2">
            {lesson.quiz.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  disabled={hasSubmittedQuiz}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition flex items-start space-x-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {!hasSubmittedQuiz ? (
            <button
              onClick={handleQuizSubmit}
              disabled={!selectedOptionId}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              Submit Answer
            </button>
          ) : (
            <div className="space-y-2 pt-2">
              {(() => {
                const chosen = lesson.quiz.options.find(o => o.id === selectedOptionId);
                const isCorrect = chosen?.isCorrect;
                return (
                  <div className={`p-4 rounded-xl text-xs space-y-1 ${
                    isCorrect ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}>
                    <div className="font-bold flex items-center space-x-1.5 text-sm">
                      {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                      <span>{isCorrect ? `Correct! (+${lesson.xpReward} XP)` : 'Not quite!'}</span>
                    </div>
                    <p className="leading-relaxed">{chosen?.explanation}</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Close Lesson
          </button>
        </div>

      </div>
    </div>
  );
};
