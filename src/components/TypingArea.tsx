import React, { useEffect, useState } from 'react';
import { useTypingEngine } from '../hooks/useTypingEngine';
import type { Level } from '../types';
import { Play, ChevronRight, Award, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import VirtualKeyboard from './VirtualKeyboard';

interface TypingAreaProps {
  level: Level;
  onNextLevel: () => void;
  onBackToLevels: () => void;
  onPlayPracticeGame: (level: Level) => void;
}

export const TypingArea: React.FC<TypingAreaProps> = ({ level, onNextLevel, onBackToLevels, onPlayPracticeGame }) => {
  const { user, updateUserProgress, isMuted, toggleMute } = useAuth();
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [wasAlreadyCompleted] = useState(() => {
    return user?.levelHistory.some(h => h.levelId === level.id) || false;
  });
  
  const {
    activeText,
    currentIndex,
    charStatuses,
    errors,
    elapsedTime,
    wpm,
    accuracy,
    isCompleted,
    shakeIndex,
    isRemediation,
    isSlowRepeat,
    struggleChars,
    handleKeyPress,
    reset
  } = useTypingEngine({
    levelId: level.id,
    text: level.text,
    targetWPM: level.targetWPM,
    targetAccuracy: level.targetAccuracy,
    onComplete: (finalWpm, finalAcc, stars) => {
      updateUserProgress(level.id, finalWpm, finalAcc, stars);
    }
  });

  // Listen for global keyboard key presses and check Caps Lock modifier state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.getModifierState) {
        setIsCapsLockOn(e.getModifierState('CapsLock'));
      }

      if (e.key === ' ') {
        e.preventDefault();
      }

      handleKeyPress(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.getModifierState) {
        setIsCapsLockOn(e.getModifierState('CapsLock'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyPress]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const starsCount = isCompleted ? (accuracy >= 97 && wpm >= level.targetWPM ? 3 : accuracy >= 93 && wpm >= level.targetWPM * 0.7 ? 2 : accuracy >= 90 ? 1 : 0) : 0;
  const isPassed = starsCount >= 1;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      {/* Top Header Panel */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider text-indigo-500 uppercase px-2.5 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15">
            {level.difficulty}
          </span>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mt-2">
            Casharka {level.id}: {level.title}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {level.description}
          </p>
        </div>

        {/* Action Toggles */}
        <div className="flex gap-2">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onBackToLevels}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Casharada
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Xawaaraha (WPM)</div>
          <div className="text-3xl font-extrabold text-emerald-500 mt-1 font-mono">
            {wpm}
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Yoolka: {level.targetWPM} WPM</div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Saxnaanta (Accuracy)</div>
          <div className="text-3xl font-extrabold text-amber-500 mt-1 font-mono">
            {accuracy}%
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Yoolka: {level.targetAccuracy}%</div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Waqtiga (Timer)</div>
          <div className="text-3xl font-extrabold text-blue-500 mt-1 font-mono">
            {formatTime(elapsedTime)}
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Laba-laab shaqal/shibban</div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Khaladaadka (Errors)</div>
          <div className="text-3xl font-extrabold text-rose-500 mt-1 font-mono">
            {errors}
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Guji badhanka si aad u saxdo</div>
        </div>
      </div>

      {/* Remediation Mode Banner Alert */}
      {isRemediation && (
        <div className="p-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-sm font-semibold flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            <strong>Habka Saxidda (Remediation Mode):</strong> Waxaa kugu adkaaday xarfaha: <strong>{struggleChars.join(', ').toUpperCase()}</strong>. Fadlan ku celceli erayadan si aad u horumariso xawaarahaaga intaanad casharka xiga u gudbin!
          </span>
        </div>
      )}

      {/* Slow Repeat Banner Alert */}
      {isSlowRepeat && (
        <div className="p-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-sm font-semibold flex items-center gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            <strong>Ku Celcelinta Xawaare Hoose:</strong> Xawaarahaagu aad buu u hooseeyaa. Fadlan ku celceli casharkan adigoo isticmaalaya erayo kale ilaa aad ka gaarto yoolka!
          </span>
        </div>
      )}

      {/* Main Typing Block Container */}
      <div 
        className={`relative w-full p-8 md:p-12 rounded-3xl border transition-all duration-300 ${
          shakeIndex !== null 
            ? 'animate-shake border-red-500/50 bg-red-500/5' 
            : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/30'
        } shadow-lg`}
      >
        {/* Help tip when session hasn't started */}
        {elapsedTime === 0 && !isCompleted && (
          <div className="absolute top-3 right-6 flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-xs animate-pulse">
            <Play className="w-3.5 h-3.5" />
            <span>Ku bilaaw inaad badhanka taabato...</span>
          </div>
        )}

        {/* Caps Lock warning indicator */}
        {isCapsLockOn && (
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-pulse shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Caps Lock waa uu shidan yahay!</span>
          </div>
        )}

        {/* Dynamic Text Visualizer */}
        <div className="text-xl md:text-2xl leading-relaxed font-medium font-mono select-none tracking-wide text-left break-words max-h-48 overflow-y-auto pr-2">
          {activeText.split('').map((char, index) => {
            const status = charStatuses[index];
            let color = "text-zinc-400 dark:text-zinc-600";
            let isCurrent = index === currentIndex;
            
            if (status === 'correct') {
              color = "text-emerald-500 dark:text-emerald-400 font-bold transition-all duration-150";
            } else if (status === 'incorrect') {
              color = "text-rose-500 dark:text-rose-400 font-bold border-b-2 border-rose-500 bg-rose-500/10";
            }

            return (
              <span 
                key={index}
                className={`relative ${color} ${
                  isCurrent ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ring-2 ring-indigo-500/50 rounded-sm' : ''
                }`}
              >
                {isCurrent && (
                  <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-indigo-500 animate-blink" />
                )}
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>
      </div>

      {/* On-Screen Keyboard */}
      {!isCompleted && (
        <div className="w-full">
          <VirtualKeyboard nextChar={activeText[currentIndex] || ''} isCapsLockOn={isCapsLockOn} />
        </div>
      )}

      {/* Modal Dialog Success Overlay (Centered over page, matching Screenshot 2 layout) */}
      {isCompleted && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16171d] text-zinc-800 dark:text-zinc-100 shadow-2xl text-center flex flex-col items-center gap-5 relative">
            {isPassed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2 border border-emerald-500/20">
                  <Award className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">
                  Guul Baad Gaadhay!
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                  Waxaad si guul leh u dhamaysay Casharka {level.id}. Waxaad kasbatay XP iyo Xiddigo!
                </p>

                {/* Stars Display */}
                <div className="flex gap-2 my-2">
                  {[1, 2, 3].map((s) => (
                    <span 
                      key={s} 
                      className={`text-3xl transition-all duration-300 transform scale-110 ${
                        s <= starsCount ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>

                {/* XP Earned badge */}
                <div className="text-xs font-bold px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-500/20">
                  +{wasAlreadyCompleted ? 0 : starsCount * wpm * 10} XP
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2 border border-rose-500/20">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">
                  Waa Lagaa Adkaaday!
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
                  Waxaad u baahan tahay ugu yaraan **90% Saxnaan** iyo xawaare fiican si aad u gudubto. Fadlan dib u bilow casharka.
                </p>
                <div className="text-xs font-semibold text-rose-500 my-2">
                  Saxnaantaadii: {accuracy}% (Loo baahan yahay: 90%+)
                </div>
              </div>
            )}

            {/* Metrics Breakdown Grid */}
            <div className="w-full grid grid-cols-3 gap-3 border-t border-b border-zinc-100 dark:border-zinc-800 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Xawaaraha</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{wpm} WPM</span>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Saxnaanta</span>
                <span className="text-base font-extrabold text-amber-500">{accuracy}%</span>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Waqtiga</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{elapsedTime}s</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 w-full justify-center">
              <button
                onClick={reset}
                className="flex-1 py-2.5 rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all active:scale-[0.98]"
              >
                Dib u Bilow
              </button>

              {isPassed ? (
                <>
                  <button
                    onClick={() => onPlayPracticeGame(level)}
                    className="flex-1 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
                  >
                    <span>Game Ku Celis</span>
                  </button>
                  <button
                    onClick={onNextLevel}
                    className="flex-1 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1 shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
                  >
                    <span>Casharka Xiga</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={reset}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-[0.98]"
                >
                  Isku day Mar Kale
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Helper text on how to type Somali characters */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/20 text-xs text-zinc-500 dark:text-zinc-400 text-left border border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-1.5 leading-relaxed">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">💡 Hagaha Qorista Af-Soomaaliga:</span>
        <p>• Ku fiiro shaqallada labanlaabma (aa, ee, ii, oo, uu) iyo shibbanayaasha sida (dh, sh, kh, dd, rr). Ku qor si xiriir ah.</p>
        <p>• Tababarku wuxuu u baahan yahay saxnaan aad u sarreysa. Haddii aad qaladdo, xarafku wuxuu isu beddelayaa casaan. Waa inaad qortaa xarafka saxda ah si aad u sii socoto.</p>
      </div>
    </div>
  );
};
export default TypingArea;
