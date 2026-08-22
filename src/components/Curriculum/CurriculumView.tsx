import React, { useState } from 'react';
import { 
  BookOpen, 
  RotateCw, 
  Network, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  Award, 
  ArrowRight
} from 'lucide-react';
import { CURRICULUM_TRACKS } from '../../data/curriculumData';
import { Lesson, UserProfile } from '../../types.ts';
import { LessonModal } from './LessonModal';

interface CurriculumViewProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onLaunchSimulator: (labId: string) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  userProfile,
  setUserProfile,
  onLaunchSimulator
}) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const getTrackIcon = (iconName: string) => {
    switch (iconName) {
      case 'RotateCw': return RotateCw;
      case 'Network': return Network;
      case 'Cpu': return Cpu;
      case 'CheckCircle2': return CheckCircle2;
      default: return BookOpen;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wide">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Interactive Training Tracks</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Curated AI Training Sets & Hands-On Engineering Labs
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            Move from basic prompt writing to designing production-grade autonomous agent loops, multi-agent state graphs, MCP tool integrations, and automated LLM-as-a-Judge evals.
          </p>
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="space-y-8">
        {CURRICULUM_TRACKS.map((track) => {
          const Icon = getTrackIcon(track.iconName);
          const completedCount = track.lessons.filter(l => userProfile.completedLessons.includes(l.id)).length;
          
          return (
            <div
              key={track.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6 hover:shadow-card-hover transition"
            >
              {/* Track Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${track.color} text-white flex items-center justify-center shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{track.title}</h2>
                    <p className="text-xs text-slate-500 max-w-xl mt-0.5">{track.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  <span>Progress: {completedCount} / {track.lessons.length} Modules</span>
                  {completedCount === track.lessons.length && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />
                  )}
                </div>
              </div>

              {/* Lessons Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {track.lessons.map((lesson) => {
                  const isCompleted = userProfile.completedLessons.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className="bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-5 space-y-4 cursor-pointer transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-100 uppercase">
                            {lesson.level.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-bold text-amber-600 flex items-center space-x-1">
                            <Award className="w-3.5 h-3.5" />
                            <span>+{lesson.xpReward} XP</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                          {lesson.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {lesson.overview}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center space-x-1 text-slate-400 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lesson.durationMinutes} min</span>
                        </span>

                        <span className="flex items-center space-x-1 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition">
                          <span>{isCompleted ? 'Review Lesson' : 'Start Lesson'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* Interactive Lesson Modal */}
      <LessonModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        onLaunchSimulator={onLaunchSimulator}
      />

    </div>
  );
};
