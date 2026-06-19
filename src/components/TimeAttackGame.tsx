import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import sounds from '../utils/soundEffects';
import { Play, RotateCcw, Home, Award, Volume2, VolumeX, Timer, Target } from 'lucide-react';

interface TimeAttackGameProps {
  onBackToSelector: () => void;
  levelFilter?: { id: number; text: string; title: string } | null;
}

import { GAME_WORDS_SHORT, GAME_WORDS_MEDIUM, GAME_WORDS_LONG } from '../data/gameWords';

const getCheckpointAllowedKeys = (levelId: number): Set<string> => {
  const allowed = new Set<string>();
  if (levelId <= 15) {
    ['a', 's', 'd', 'f'].forEach(c => allowed.add(c));
  } else if (levelId <= 30) {
    ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'].forEach(c => allowed.add(c));
  } else if (levelId <= 45) {
    ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', 'g', 'h'].forEach(c => allowed.add(c));
  } else if (levelId <= 60) {
    ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', 'g', 'h', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].forEach(c => allowed.add(c));
  } else {
    ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', 'g', 'h', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'z', 'x', 'c', 'v', 'b', 'n', 'm'].forEach(c => allowed.add(c));
  }
  return allowed;
};

interface FloatingTimeBonus {
  id: string;
  text: string;
  x: number;
  y: number;
}

export const TimeAttackGame: React.FC<TimeAttackGameProps> = ({ onBackToSelector, levelFilter }) => {
  const { user, addGameXP, isMuted, toggleMute } = useAuth();
  
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [targetWord, setTargetWord] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [xpEarned, setXpEarned] = useState(0);
  const [floatingBonuses, setFloatingBonuses] = useState<FloatingTimeBonus[]>([]);
  const [difficultyMode, setDifficultyMode] = useState<'current' | 'all'>('all');
  const [laserActive, setLaserActive] = useState(false);

  const timerRef = useRef<number | null>(null);
  const hasSavedXPRef = useRef(false);

  // Extract allowed keys
  const allowedSet = React.useMemo(() => {
    // If checkpoint is active, force checkpoint keys
    if (levelFilter) {
      return getCheckpointAllowedKeys(levelFilter.id);
    }
    // If practicing current level
    if (difficultyMode === 'current' && user) {
      return getCheckpointAllowedKeys(user.currentLevel);
    }
    // All words
    return null;
  }, [levelFilter, difficultyMode, user]);

  const allowedLettersArray = React.useMemo(() => {
    if (!allowedSet) return [];
    return Array.from(allowedSet);
  }, [allowedSet]);

  // Generate a random word
  const getNextWord = () => {
    let wordText = '';

    if (allowedSet && allowedLettersArray.length > 0) {
      const filterList = (list: string[]) => 
        list.filter(w => w.toLowerCase().split('').every(c => allowedSet.has(c)));

      const filteredShort = filterList(GAME_WORDS_SHORT);
      const filteredMedium = filterList(GAME_WORDS_MEDIUM);
      const filteredLong = filterList(GAME_WORDS_LONG);

      let combined = [...filteredShort];
      if (wordsCompleted >= 5) combined = [...combined, ...filteredMedium];
      if (wordsCompleted >= 15) combined = [...combined, ...filteredLong];

      if (combined.length >= 5) {
        wordText = combined[Math.floor(Math.random() * combined.length)];
      } else {
        // Procedural generation
        const len = 3 + Math.floor(Math.random() * 3); // length 3-5
        let generated = '';
        for (let i = 0; i < len; i++) {
          generated += allowedLettersArray[Math.floor(Math.random() * allowedLettersArray.length)];
        }
        wordText = generated;
      }
    } else {
      let wordList = GAME_WORDS_SHORT;
      if (wordsCompleted >= 5 && wordsCompleted < 15) {
        wordList = Math.random() > 0.4 ? GAME_WORDS_MEDIUM : GAME_WORDS_SHORT;
      } else if (wordsCompleted >= 15) {
        const rand = Math.random();
        wordList = rand > 0.6 ? GAME_WORDS_LONG : rand > 0.2 ? GAME_WORDS_MEDIUM : GAME_WORDS_SHORT;
      }
      wordText = wordList[Math.floor(Math.random() * wordList.length)];
    }

    return wordText;
  };

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(30);
    setScore(0);
    setWordsCompleted(0);
    setStreak(0);
    setMultiplier(1);
    setXpEarned(0);
    setInputValue('');
    setFloatingBonuses([]);
    hasSavedXPRef.current = false;
    
    // Set first word
    const firstWord = getNextWord();
    setTargetWord(firstWord);
  };

  // Timer countdown hook
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          sounds.playError();
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Handle XP saving on Game Over
  useEffect(() => {
    if (gameState === 'gameover' && !hasSavedXPRef.current) {
      hasSavedXPRef.current = true;
      // Base XP is 10, plus 1 XP per 3 completed words
      const calculatedXP = 10 + Math.floor(wordsCompleted / 3);
      const cappedXP = Math.min(30, calculatedXP); // cap at 30 XP max to prevent abuse
      setXpEarned(cappedXP);
      addGameXP(cappedXP);
    }
  }, [gameState, wordsCompleted, addGameXP]);

  // Handle word input matching
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const normalizedVal = val.trim();
    if (normalizedVal === targetWord) {
      // Correct! Play success effects
      sounds.playClick();
      setLaserActive(true);
      setTimeout(() => setLaserActive(false), 250);

      // Add floating time bonus indicator
      const bonusId = Math.random().toString(36).substring(2, 9);
      const newBonus: FloatingTimeBonus = {
        id: bonusId,
        text: '+2s',
        x: 40 + Math.random() * 20, // offset near center
        y: 40 + Math.random() * 20
      };
      setFloatingBonuses(prev => [...prev, newBonus]);
      // Remove floating bonus after animation finishes
      setTimeout(() => {
        setFloatingBonuses(prev => prev.filter(b => b.id !== bonusId));
      }, 1000);

      // Update time left (+2s, cap at 60s)
      setTimeLeft(t => Math.min(60, t + 2));

      // Calculate score based on multiplier
      const basePoints = targetWord.length * 15;
      const pointsEarned = basePoints * multiplier;
      setScore(s => s + pointsEarned);

      // Manage streaks & multipliers
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak >= 15) {
        setMultiplier(4);
      } else if (nextStreak >= 10) {
        setMultiplier(3);
      } else if (nextStreak >= 5) {
        setMultiplier(2);
      }

      setWordsCompleted(w => w + 1);
      setInputValue('');
      
      // Load next word
      setTargetWord(getNextWord());
    } else if (normalizedVal.length > 0 && !targetWord.startsWith(normalizedVal)) {
      // Typo made! Reset streak and multiplier
      setStreak(0);
      setMultiplier(1);
    }
  };

  // Render letters with type status matching
  const renderTargetWord = () => {
    const trimmedInput = inputValue.trim();
    return targetWord.split('').map((char, index) => {
      let colorClass = 'text-zinc-400 dark:text-zinc-600';
      let shadowClass = '';

      if (index < trimmedInput.length) {
        if (trimmedInput[index] === char) {
          colorClass = 'text-cyan-400 dark:text-cyan-400';
          shadowClass = 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]';
        } else {
          colorClass = 'text-rose-500 dark:text-rose-500';
        }
      }

      return (
        <span 
          key={index} 
          className={`font-mono text-4xl md:text-6xl font-black uppercase tracking-wider transition-all duration-150 ${colorClass} ${shadowClass}`}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 select-none">
      {/* Game Header Panel */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider text-cyan-500 uppercase px-2.5 py-1 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15">
            Game Cusub: Time Attack
          </span>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mt-2">
            Time Attack
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Qor ereyada si degdeg ah si aad ugu darto wakhti dheeraad ah!
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onBackToSelector}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Casharrada</span>
          </button>
        </div>
      </div>

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="w-full flex flex-col items-center justify-center p-12 py-16 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 shadow-xl text-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/25">
            <Timer className="w-12 h-12 animate-pulse" />
          </div>
          <h3 className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100">Ku soo dhowow Time Attack!</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed">
            Waxaad bilaabaysaa 30 ilbiriqsi. Qor ereyada ka soo dhex muuqda badhtanka goobta baarista. Erey kasta oo sax ah wuxuu kuu kordhinayaa <strong>+2 ilbiriqsi</strong>. Ilaali streag-gaaga si aad u hesho dhibco iyo multiplier ka badan!
          </p>

          {/* Difficulty selector (Only when not forced by a level filter) */}
          {!levelFilter && user && (
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Xulo Xarfaha aad ku ciyaarayso:</span>
              <div className="flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setDifficultyMode('all')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    difficultyMode === 'all'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Dhamaan Ereyada Soomaaliga
                </button>
                <button
                  onClick={() => setDifficultyMode('current')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    difficultyMode === 'current'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Kaliyah Xarfaha Heerka {user.currentLevel}
                </button>
              </div>
            </div>
          )}

          {levelFilter && (
            <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-semibold">
              Wuxuu adeegsan doonaa xarfaha Heerka {levelFilter.id}: {getCheckpointAllowedKeys(levelFilter.id).size} xaraf.
            </div>
          )}

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-2xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/35 transition-all active:scale-[0.98] mt-2 text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Bilaaw Game-ka</span>
          </button>
        </div>
      )}

      {/* Active gameplay display */}
      {gameState === 'playing' && (
        <div className="w-full flex flex-col gap-4">
          {/* Game Stats HUD */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Dhibcaha (Score)</span>
              <span className="text-2xl font-extrabold text-cyan-500 mt-0.5 font-mono">{score}</span>
            </div>
            
            {/* Timer HUD block */}
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex justify-between items-center px-4">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Wakhtiga</span>
                <span className={`text-2xl font-extrabold mt-0.5 font-mono ${
                  timeLeft > 15 ? 'text-cyan-400' : timeLeft > 7 ? 'text-amber-500' : 'text-rose-500 animate-pulse'
                }`}>{timeLeft}s</span>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    className="stroke-zinc-200 dark:stroke-zinc-850"
                    strokeWidth="3.5"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    className={`transition-all duration-300 ${
                      timeLeft > 15 ? 'stroke-cyan-500' : timeLeft > 7 ? 'stroke-amber-500' : 'stroke-rose-500'
                    }`}
                    strokeWidth="3.5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 * (1 - timeLeft / 60)}
                    strokeLinecap="round"
                  />
                </svg>
                <Timer className="absolute w-4 h-4 text-zinc-400" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Streak / Multiplier</span>
              <div className="flex justify-center items-center gap-1.5 mt-0.5">
                <span className="text-xl font-extrabold text-amber-500 font-mono">x{multiplier}</span>
                {streak > 0 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono bg-zinc-100 dark:bg-zinc-850 px-1.5 py-0.5 rounded">
                    {streak}🔥
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Qoran (Words)</span>
              <span className="text-2xl font-extrabold text-emerald-500 mt-0.5 font-mono">{wordsCompleted}</span>
            </div>
          </div>

          {/* Holographic Play Board Area */}
          <div className="relative w-full h-[320px] rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-[#070b13] overflow-hidden shadow-inner flex flex-col items-center justify-center">
            {/* Grid background effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(to_right,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
            
            {/* Holographic target crosshair circles */}
            <div className="absolute w-64 h-64 border border-cyan-500/10 rounded-full animate-[spin_40s_linear_infinite]" />
            <div className="absolute w-48 h-48 border border-dashed border-cyan-500/15 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
            <div className="absolute w-32 h-32 border border-cyan-500/5 rounded-full" />
            
            {/* Targeting laser scanning sweep line */}
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent animate-[pulse_1.5s_infinite] pointer-events-none" />

            {/* Target Reticle visual corners */}
            <div className="absolute w-8 h-8 border-t-2 border-l-2 border-cyan-500/45 top-12 left-12 rounded-tl-lg" />
            <div className="absolute w-8 h-8 border-t-2 border-r-2 border-cyan-500/45 top-12 right-12 rounded-tr-lg" />
            <div className="absolute w-8 h-8 border-b-2 border-l-2 border-cyan-500/45 bottom-12 left-12 rounded-bl-lg" />
            <div className="absolute w-8 h-8 border-b-2 border-r-2 border-cyan-500/45 bottom-12 right-12 rounded-br-lg" />

            {/* Simulated laser flash animation */}
            {laserActive && (
              <div className="absolute inset-0 bg-cyan-400/5 flex items-center justify-center animate-fade-in pointer-events-none">
                <div className="w-full h-0.5 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-pulse" />
                <div className="absolute w-0.5 h-full bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-pulse" />
              </div>
            )}

            {/* Target text display */}
            <div className="z-10 flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-2 mb-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/40 shadow-inner">
                <Target className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">Target Lock</span>
              </div>
              <div className="flex justify-center items-center gap-0.5 h-16">
                {renderTargetWord()}
              </div>
            </div>

            {/* Floating numbers/time bonuses */}
            {floatingBonuses.map(b => (
              <div
                key={b.id}
                className="absolute text-cyan-400 font-black text-xl animate-[bounce_1s_infinite] select-none pointer-events-none drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
              >
                {b.text}
              </div>
            ))}
          </div>

          {/* Typing entry input */}
          <div className="w-full flex justify-center items-center mt-2">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                autoFocus
                placeholder="Qor ereyga kore..."
                value={inputValue}
                onChange={handleInputChange}
                className="w-full py-3.5 px-6 rounded-2xl text-center text-lg font-mono font-bold tracking-wide border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder-zinc-400 dark:placeholder-zinc-650"
              />
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen overlay */}
      {gameState === 'gameover' && (
        <div className="w-full flex flex-col items-center justify-center p-12 py-16 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16171d] shadow-2xl text-center gap-6 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/25">
            <Award className="w-12 h-12" />
          </div>

          <div>
            <h3 className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 font-sans tracking-tight">
              Muddadii Waa Dhamaatay! (Time Up)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
              Game-ku wuu dhammaaday. Waxaad heshay XP iyo dhibco cusub!
            </p>
          </div>

          {/* Metric details cards */}
          <div className="w-full max-w-md grid grid-cols-3 gap-3 border-t border-b border-zinc-100 dark:border-zinc-800 py-6 font-mono text-zinc-500 dark:text-zinc-400 my-2">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Dhibcaha</span>
              <span className="text-xl font-extrabold text-cyan-500">{score}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Ereyo la saaray</span>
              <span className="text-xl font-extrabold text-amber-500">{wordsCompleted}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">XP la Kasbaday</span>
              <span className="text-xl font-extrabold text-emerald-500">+{xpEarned} XP</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Dib u Bilow</span>
            </button>
            <button
              onClick={onBackToSelector}
              className="px-6 py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all active:scale-[0.98]"
            >
              <span>Ku noqo Casharada</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeAttackGame;
