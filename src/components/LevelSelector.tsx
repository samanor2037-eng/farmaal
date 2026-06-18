import React, { useState } from 'react';
import type { Level } from '../types';
import { useAuth } from '../context/AuthContext';
import { Lock, Play, Star, CheckCircle, Award } from 'lucide-react';

interface LevelSelectorProps {
  levels: Level[];
  onSelectLevel: (level: Level) => void;
}

type DifficultyFilter = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export const LevelSelector: React.FC<LevelSelectorProps> = ({ levels, onSelectLevel }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<DifficultyFilter>('Beginner');

  // Filter levels
  const filteredLevels = levels.filter((lvl) => lvl.difficulty === filter);

  // Check level states
  const getLevelState = (levelId: number) => {
    if (!user) return { isLocked: true, completed: null };
    
    // Level 1 is always unlocked
    if (levelId === 1) {
      const history = user.levelHistory.find(h => h.levelId === 1);
      return { isLocked: false, completed: history || null };
    }

    const isLocked = levelId > user.currentLevel;
    const history = user.levelHistory.find(h => h.levelId === levelId);
    return { isLocked, completed: history || null };
  };

  const renderUnlockBanner = () => {
    if (!user) return null;

    let message = "";
    let isTierLocked = false;
    let needed = 0;

    if (filter === 'Intermediate') {
      if (user.currentLevel < 76) {
        needed = 76 - user.currentLevel;
        isTierLocked = true;
        message = `Si aad u furto casharrada Intermediate (Heerka 76-90), waxaad u baahan tahay inaad dhammayso ${needed} cashar oo kale. (To unlock Intermediate, you need to complete ${needed} more lessons.)`;
      }
    } else if (filter === 'Advanced') {
      if (user.currentLevel < 91) {
        needed = 91 - user.currentLevel;
        isTierLocked = true;
        message = `Si aad u furto casharrada Advanced (Heerka 91-105), waxaad u baahan tahay inaad dhammayso ${needed} cashar oo kale. (To unlock Advanced, you need to complete ${needed} more lessons.)`;
      }
    } else if (filter === 'Expert') {
      if (user.currentLevel < 106) {
        needed = 106 - user.currentLevel;
        isTierLocked = true;
        message = `Si aad u furto casharrada Expert (Heerka 106-120), waxaad u baahan tahay inaad dhammayso ${needed} cashar oo kale. (To unlock Expert, you need to complete ${needed} more lessons.)`;
      }
    } else if (filter === 'Beginner') {
      if (user.currentLevel < 76) {
        needed = 76 - user.currentLevel;
        message = `Horey u soco! Waxaad u baahan tahay ${needed} cashar oo kale si aad u gaadho heerka xiga ee 'Intermediate'. (Keep going! You need ${needed} more lessons to reach the next tier 'Intermediate'.)`;
      }
    }

    if (!message) return null;

    return (
      <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all duration-300 ${
        isTierLocked 
          ? 'border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-400' 
          : 'border-indigo-500/20 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400'
      }`}>
        <Lock className={`w-5 h-5 flex-shrink-0 ${isTierLocked ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-semibold leading-relaxed">
          {message}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Filters Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-500" />
            <span>Xulo Casharka (Select Lesson)</span>
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Dooro mid ka mid ah {levels.length}-ka heer ee hoose si aad u tababarto Af-Soomaaliga.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/40">
          {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as DifficultyFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === cat
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Unlock Requirements Banner */}
      {renderUnlockBanner()}

      {/* Levels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredLevels.map((lvl) => {
          const { isLocked, completed } = getLevelState(lvl.id);

          return (
            <div
              key={lvl.id}
              onClick={() => !isLocked && onSelectLevel(lvl)}
              className={`group relative p-5 rounded-2xl border transition-all duration-300 ${
                isLocked
                  ? 'border-zinc-200 dark:border-zinc-800/60 bg-zinc-100/30 dark:bg-zinc-900/10 opacity-60 cursor-not-allowed'
                  : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 hover:border-indigo-500/50 hover:shadow-lg dark:hover:bg-zinc-900/80 cursor-pointer transform hover:-translate-y-0.5'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  Casharka {lvl.id}
                </span>

                {isLocked ? (
                  <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                ) : completed ? (
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 group-hover:animate-ping" />
                )}
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mt-2 line-clamp-1 group-hover:text-indigo-500 transition-colors">
                {lvl.title}
              </h3>

              {/* Target / Stats details */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 min-h-[32px]">
                {lvl.description}
              </p>

              {/* Card Footer Info */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  lvl.difficulty === 'Beginner' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                  lvl.difficulty === 'Intermediate' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                  lvl.difficulty === 'Advanced' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                  'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                  {lvl.difficulty}
                </span>

                {completed ? (
                  <div className="flex items-center gap-1">
                    {/* Render Stars Completed */}
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= completed.stars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-200 dark:text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    Target: {lvl.targetWPM} WPM
                  </div>
                )}
              </div>

              {/* Highscore info inside completed level */}
              {completed && (
                <div className="mt-2 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 flex justify-between">
                  <span>WPM: {completed.wpm}</span>
                  <span>Acc: {completed.accuracy}%</span>
                </div>
              )}

              {/* Play Icon hover highlight */}
              {!isLocked && (
                <div className="absolute right-4 top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white p-2 rounded-xl shadow-md transform translate-x-2 group-hover:translate-x-0 duration-300">
                  <Play className="w-3.5 h-3.5 fill-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default LevelSelector;
