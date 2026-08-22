import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, UserCheck, Award, X } from 'lucide-react';
import { DIAGNOSTIC_QUESTIONS } from '../../data/diagnosticQuestions';
import { UserProfile, UserRole, ExperienceLevel } from '../../types.ts';
import { ROLE_DISPLAY_NAMES } from '../../data/coachKnowledge';
import confetti from 'canvas-confetti';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  setUserProfile
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole>(userProfile.role);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [calculatedLevel, setCalculatedLevel] = useState<ExperienceLevel>(userProfile.level);

  if (!isOpen) return null;

  const roles: UserRole[] = [
    'software_engineer',
    'product_manager',
    'data_ops',
    'business_analyst',
    'executive'
  ];

  const handleSelectOption = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentStep] = optionIndex;
    setSelectedAnswers(newAnswers);

    if (currentStep < DIAGNOSTIC_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Calculate final level
      const points: Record<ExperienceLevel, number> = {
        novice: 0,
        prompt_practitioner: 0,
        agent_builder: 0,
        systems_architect: 0
      };

      newAnswers.forEach((ansIdx, qIdx) => {
        const q = DIAGNOSTIC_QUESTIONS[qIdx];
        const opt = q.options[ansIdx];
        if (opt && opt.levelPoints) {
          Object.keys(opt.levelPoints).forEach((lvl) => {
            const key = lvl as ExperienceLevel;
            points[key] += opt.levelPoints[key] || 0;
          });
        }
      });

      let highestLevel: ExperienceLevel = 'novice';
      let maxScore = -1;
      (Object.keys(points) as ExperienceLevel[]).forEach((lvl) => {
        if (points[lvl] > maxScore) {
          maxScore = points[lvl];
          highestLevel = lvl;
        }
      });

      setCalculatedLevel(highestLevel);
      setIsFinished(true);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  const handleCompleteAssessment = () => {
    setUserProfile(prev => ({
      ...prev,
      role: selectedRole,
      level: calculatedLevel,
      diagnosticCompleted: true,
      xp: prev.xp + 100
    }));
    onClose();
  };

  const levelTitles: Record<ExperienceLevel, string> = {
    novice: 'AI Explorer & Novice',
    prompt_practitioner: 'Prompt & Context Practitioner',
    agent_builder: 'Autonomous Agent Builder',
    systems_architect: 'Enterprise AI Systems Architect'
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 border border-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">AI Ability & Goal Diagnostic</h2>
              <p className="text-xs text-slate-500">Personalize your Lumina coaching journey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isFinished ? (
          <div className="space-y-6">
            
            {/* Step indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Step {currentStep + 1} of {DIAGNOSTIC_QUESTIONS.length + 1}: Select Role & Experience</span>
                <span>{Math.round(((currentStep + 1) / (DIAGNOSTIC_QUESTIONS.length + 1)) * 100)}% Completed</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${((currentStep + 1) / (DIAGNOSTIC_QUESTIONS.length + 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Step 0: Role Selection */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">What is your primary role at the company?</h3>
                  <p className="text-xs text-slate-500">Lumina tailors technical depth, simulator examples, and news summaries to your workflow.</p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {roles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                        selectedRole === role
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                          : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <UserCheck className={`w-4 h-4 ${selectedRole === role ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="text-sm">{ROLE_DISPLAY_NAMES[role]}</span>
                      </div>
                      {selectedRole === role && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-sm transition"
                  >
                    <span>Continue to Questions</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Steps 1..N: Diagnostic Questions */}
            {currentStep > 0 && currentStep <= DIAGNOSTIC_QUESTIONS.length && (
              <div className="space-y-4">
                {(() => {
                  const q = DIAGNOSTIC_QUESTIONS[currentStep - 1];
                  return (
                    <>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-900">{q.question}</h3>
                        <p className="text-xs text-slate-500">{q.context}</p>
                      </div>

                      <div className="space-y-2.5">
                        {q.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectOption(idx)}
                            className="w-full p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition group space-y-1"
                          >
                            <p className="text-xs sm:text-sm font-medium text-slate-800 group-hover:text-indigo-900">
                              {opt.text}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

          </div>
        ) : (
          /* Results Step */
          <div className="space-y-6 text-center py-4 animate-in fade-in">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                Diagnostic Complete (+100 XP)
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Your AI Baseline: {levelTitles[calculatedLevel]}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                As a <strong className="text-slate-900">{ROLE_DISPLAY_NAMES[selectedRole]}</strong> at the <strong className="text-slate-900">{levelTitles[calculatedLevel]}</strong> tier, Lumina has configured a tailored learning mission for you.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left space-y-2 max-w-md mx-auto">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Your Personalized Learning Roadmap:</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-6 list-disc">
                <li>Hands-on Agent Loop Sandbox: ReAct & Self-Correction</li>
                <li>Model Context Protocol (MCP) & Universal Tool Chaining</li>
                <li>State Graphs & Multi-Agent LangGraph Patterns</li>
                <li>Automated LLM-as-a-Judge Evals & Golden Test Datasets</li>
              </ul>
            </div>

            <button
              onClick={handleCompleteAssessment}
              className="w-full max-w-md py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition"
            >
              Enter My Personalized AI Hub
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
