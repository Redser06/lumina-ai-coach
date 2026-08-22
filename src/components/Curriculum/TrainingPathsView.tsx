import React, { useState } from 'react';
import { UserProfile, Lesson } from '../../types.ts';
import { CURRICULUM_TRACKS } from '../../data/curriculumData.ts';
import { LessonModal } from './LessonModal.tsx';

interface TrainingPathsViewProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onLaunchSimulator: (labId: string) => void;
}

export const TrainingPathsView: React.FC<TrainingPathsViewProps> = ({
  userProfile,
  setUserProfile,
  onLaunchSimulator
}) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-gutter max-w-container-max mx-auto w-full pb-stack-lg">
      
      {/* Header */}
      <header className="mb-stack-lg pt-4 md:pt-0">
        <h1 className="font-headline-xl text-headline-lg md:text-headline-xl text-on-surface mb-2 font-bold tracking-tight">
          Training Paths
        </h1>
        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl">
          Your guided journey to mastery. Continue your active sets or explore new developmental roadmaps curated by Lumina AI.
        </p>
      </header>

      {/* Ability Overview (AI Block) */}
      <section className="mb-stack-lg bg-surface-container-lowest rounded-xl p-6 card-shadow-lvl1 ai-block-border flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <h2 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">
              Current Ability Level: {userProfile.level === 'systems_architect' ? 'Systems Architect' : userProfile.level === 'agent_builder' ? 'Agent Builder' : 'Advanced Practitioner'}
            </h2>
          </div>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Based on your recent deep-dives and quizzes, you are performing in the top 15% for conceptual synthesis and agent patterns.
          </p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Architecture</span>
              <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[85%]"></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Strategy</span>
              <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[70%]"></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Execution</span>
              <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[65%]"></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">News Literacy</span>
              <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[90%]"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-64 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
          <div className="flex justify-between font-label-sm text-xs text-on-surface-variant mb-1.5 font-semibold">
            <span>Overall Progress</span>
            <span className="text-secondary font-bold">78%</span>
          </div>
          <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden mb-2">
            <div className="h-full bg-secondary rounded-full" style={{ width: '78%' }}></div>
          </div>
          <p className="text-[11px] text-on-surface-variant text-center font-medium">
            {userProfile.completedLessons.length} of 12 Core Modules Mastered
          </p>
        </div>
      </section>

      {/* In-Progress Sets (Bento Grid) */}
      <section className="mb-stack-lg">
        <h2 className="font-headline-md text-base sm:text-lg text-on-surface mb-stack-md flex items-center gap-2 font-bold">
          <span className="material-symbols-outlined text-primary text-[22px]">play_circle</span>
          <span>In-Progress Training Sets</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CURRICULUM_TRACKS.slice(0, 2).map((track, trackIdx) => {
            const completedCount = track.lessons.filter((l) =>
              userProfile.completedLessons.includes(l.id)
            ).length;
            const progressPercent = Math.round((completedCount / track.lessons.length) * 100);

            return (
              <div
                key={track.id}
                className="bg-surface-container-lowest rounded-xl p-6 card-shadow-lvl1 card-hover-lvl2 border border-transparent flex flex-col relative overflow-hidden group"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${trackIdx === 0 ? 'bg-primary' : 'bg-secondary'}`} />
                
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full font-label-sm text-[11px] font-bold ${
                    trackIdx === 0 ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                  }`}>
                    {trackIdx === 0 ? 'Active Sprint' : 'Core Foundations'}
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors text-[20px]">
                    arrow_forward
                  </span>
                </div>

                <h3 className="font-headline-md text-base sm:text-lg text-on-surface mb-1 font-bold">
                  {track.title}
                </h3>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-4 leading-relaxed">
                  {track.description}
                </p>

                {/* Lesson Checklist */}
                <div className="flex flex-col gap-2.5 mb-6">
                  {track.lessons.map((lesson, idx) => {
                    const isDone = userProfile.completedLessons.includes(lesson.id);
                    const isCurrent = !isDone && idx === completedCount;
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        className={`flex items-center gap-3 text-xs p-1.5 rounded-lg cursor-pointer transition ${
                          isDone
                            ? 'text-on-surface hover:bg-surface-container-low'
                            : isCurrent
                            ? 'text-primary font-bold bg-primary/5 hover:bg-primary/10'
                            : 'text-on-surface-variant opacity-60 hover:opacity-100'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${
                          isDone ? 'text-secondary font-bold' : isCurrent ? 'text-primary animate-pulse' : 'text-outline'
                        }`}>
                          {isDone ? 'check_circle' : isCurrent ? 'play_circle' : 'lock'}
                        </span>
                        <span className="flex-grow truncate">{idx + 1}. {lesson.title}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                            IN PROGRESS
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="mb-4 mt-auto">
                  <div className="flex justify-between font-label-sm text-xs text-on-surface-variant mb-1.5 font-medium">
                    <span>{track.lessons.length} Modules • {track.lessons.reduce((acc, l) => acc + l.durationMinutes, 0)} min</span>
                    <span className="font-bold text-primary">{progressPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${trackIdx === 0 ? 'bg-primary' : 'bg-secondary'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => setSelectedLesson(track.lessons[0])}
                  className="w-full bg-primary text-on-primary font-label-md text-xs sm:text-sm py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Continue Learning</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Available Paths */}
      <section>
        <h2 className="font-headline-md text-base sm:text-lg text-on-surface mb-stack-md flex items-center gap-2 font-bold">
          <span className="material-symbols-outlined text-on-surface-variant text-[22px]">explore</span>
          <span>Available Mastery Paths</span>
        </h2>

        <div className="flex flex-col gap-4">
          {CURRICULUM_TRACKS.slice(2).map((track) => (
            <div
              key={track.id}
              onClick={() => setSelectedLesson(track.lessons[0])}
              className="bg-surface-container-lowest rounded-xl p-5 card-shadow-lvl1 border border-outline-variant/10 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-surface-bright transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-[24px]">dns</span>
              </div>
              
              <div className="flex-grow">
                <h3 className="font-headline-sm text-sm sm:text-base text-on-surface font-bold">
                  {track.title}
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 max-w-2xl leading-relaxed">
                  {track.description}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-surface-variant/50 text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                    {track.lessons.length} Modules
                  </span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                    {track.lessons.reduce((acc, l) => acc + l.durationMinutes, 0)} min total
                  </span>
                </div>
              </div>

              <button className="w-full md:w-auto px-4 py-2 bg-surface-container text-on-surface font-label-sm text-xs font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-all shrink-0">
                Start Path
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Lesson Modal */}
      {selectedLesson && (
        <LessonModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          onLaunchSimulator={onLaunchSimulator}
        />
      )}

    </div>
  );
};
