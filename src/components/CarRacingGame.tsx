import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import sounds from '../utils/soundEffects';
import { RotateCcw, Home, Volume2, VolumeX, Flame, Trophy, ShieldAlert, Zap, Eye } from 'lucide-react';

interface CarRacingGameProps {
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

type RivalDifficulty = 'rookie' | 'pro' | 'legend';
type CameraView = 'topdown' | 'cockpit';

export const CarRacingGame: React.FC<CarRacingGameProps> = ({ onBackToSelector, levelFilter }) => {
  const { user, addGameXP, isMuted, toggleMute } = useAuth();

  const [gameState, setGameState] = useState<'start' | 'countdown' | 'playing' | 'gameover'>('start');
  const [difficulty, setDifficulty] = useState<RivalDifficulty>('pro');
  const [cameraView, setCameraView] = useState<CameraView>('cockpit');
  const [totalDistance, setTotalDistance] = useState(500); // Chosen on start screen
  const [countdown, setCountdown] = useState(3);
  
  const [targetWord, setTargetWord] = useState('');
  const [nextWords, setNextWords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // Track parameters
  const [playerDistance, setPlayerDistance] = useState(0);
  const [rivalDistance, setRivalDistance] = useState(0); 
  const [playerSpeedWPM, setPlayerSpeedWPM] = useState(0);
  
  // Scrolling perspective road offset
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Stats
  const [wordsTyped, setWordsTyped] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isNitroActive, setIsNitroActive] = useState(false);
  const [nitroTimeLeft, setNitroTimeLeft] = useState(0);
  const [winner, setWinner] = useState<'player' | 'rival' | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [difficultyMode, setDifficultyMode] = useState<'current' | 'all'>('all');

  // Pause and zoom state
  const [isPaused, setIsPaused] = useState(false);
  const [textZoom, setTextZoom] = useState(1.0);

  // Time tracking
  const [raceTimeElapsed, setRaceTimeElapsed] = useState(0);

  const loopRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSavedXPRef = useRef(false);

  // Allowed keys computed property
  const allowedSet = React.useMemo(() => {
    if (levelFilter) {
      return getCheckpointAllowedKeys(levelFilter.id);
    }
    if (difficultyMode === 'current' && user) {
      return getCheckpointAllowedKeys(user.currentLevel);
    }
    return null;
  }, [levelFilter, difficultyMode, user]);

  const allowedLettersArray = React.useMemo(() => {
    if (!allowedSet) return [];
    return Array.from(allowedSet);
  }, [allowedSet]);

  // Synchronize values into refs to prevent stale closures and infinite loop resets
  const wordsTypedRef = useRef(0);
  wordsTypedRef.current = wordsTyped;
  
  const isNitroActiveRef = useRef(false);
  isNitroActiveRef.current = isNitroActive;

  const playerSpeedWPMRef = useRef(0);
  playerSpeedWPMRef.current = playerSpeedWPM;

  const getNextWord = () => {
    let wordText = '';

    if (allowedSet && allowedLettersArray.length > 0) {
      const filterList = (list: string[]) => 
        list.filter(w => w.toLowerCase().split('').every(c => allowedSet.has(c)));

      const filteredShort = filterList(GAME_WORDS_SHORT);
      const filteredMedium = filterList(GAME_WORDS_MEDIUM);
      const filteredLong = filterList(GAME_WORDS_LONG);

      let combined = [...filteredShort];
      if (wordsTyped >= 6) combined = [...combined, ...filteredMedium];
      if (wordsTyped >= 15) combined = [...combined, ...filteredLong];

      if (combined.length >= 5) {
        wordText = combined[Math.floor(Math.random() * combined.length)];
      } else {
        const len = 3 + Math.floor(Math.random() * 3);
        let generated = '';
        for (let i = 0; i < len; i++) {
          generated += allowedLettersArray[Math.floor(Math.random() * allowedLettersArray.length)];
        }
        wordText = generated;
      }
    } else {
      let wordList = GAME_WORDS_SHORT;
      if (wordsTyped >= 6 && wordsTyped < 15) {
        wordList = Math.random() > 0.4 ? GAME_WORDS_MEDIUM : GAME_WORDS_SHORT;
      } else if (wordsTyped >= 15) {
        const rand = Math.random();
        wordList = rand > 0.6 ? GAME_WORDS_LONG : rand > 0.2 ? GAME_WORDS_MEDIUM : GAME_WORDS_SHORT;
      }
      wordText = wordList[Math.floor(Math.random() * wordList.length)];
    }

    return wordText;
  };

  const startCountdown = () => {
    setGameState('countdown');
    setCountdown(3);
    hasSavedXPRef.current = false;
    
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          startRace();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const startRace = () => {
    setGameState('playing');
    setPlayerDistance(0);
    setRivalDistance(0);
    setWordsTyped(0);
    setStreak(0);
    setIsNitroActive(false);
    setNitroTimeLeft(0);
    setWinner(null);
    setXpEarned(0);
    setInputValue('');
    setScrollOffset(0);
    setIsPaused(false);
    
    setRaceTimeElapsed(0);
    
    const w1 = getNextWord();
    const w2 = getNextWord();
    const w3 = getNextWord();
    setTargetWord(w1);
    setNextWords([w2, w3]);
  };

  // Focus typing box automatically in cockpit view
  useEffect(() => {
    if (gameState === 'playing' && cameraView === 'cockpit' && !isPaused) {
      inputRef.current?.focus();
    }
  }, [gameState, cameraView, isPaused]);

  // Escape key handler for pausing the game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        setIsPaused(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Dedicated Nitro countdown effect to handle precise state updates
  useEffect(() => {
    if (!isNitroActive || gameState !== 'playing' || isPaused) return;

    const interval = setInterval(() => {
      setNitroTimeLeft(n => {
        if (n <= 0.1) {
          setIsNitroActive(false);
          return 0;
        }
        return n - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isNitroActive, gameState, isPaused]);

  // Main game loop (rival updates, scroll animations & WPM speed calculation)
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) {
      if (loopRef.current) clearInterval(loopRef.current);
      return;
    }

    // Determine speeds based on WPM difficulty
    const rivalWPM = difficulty === 'rookie' ? 22 : difficulty === 'pro' ? 36 : 50;
    const rivalSpeedMetersPerSec = (rivalWPM / 60) * 15;

    loopRef.current = window.setInterval(() => {
      // Increment time
      setRaceTimeElapsed(prev => {
        const nextTime = prev + 0.1;
        const currentWords = wordsTypedRef.current;
        if (nextTime > 1 && currentWords > 0) {
          const charCount = currentWords * 5; 
          const minutes = nextTime / 60;
          setPlayerSpeedWPM(Math.round((charCount / 5) / minutes));
        }
        return nextTime;
      });

      // Move Rival Car
      setRivalDistance(prev => {
        const nextDist = prev + (rivalSpeedMetersPerSec * 0.1);
        return Math.min(totalDistance, nextDist);
      });

      // Update 3D perspective road scrolling offset
      setScrollOffset(prev => {
        // Base scrolling speed + scale with player speed WPM
        const baseSpeed = 0.02;
        const speedMultiplier = 0.0008;
        const currentSpeed = baseSpeed + (playerSpeedWPMRef.current * speedMultiplier);
        const finalSpeed = isNitroActiveRef.current ? currentSpeed * 2.5 : currentSpeed;
        return (prev + finalSpeed) % 1;
      });
    }, 100);

    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [gameState, isPaused, difficulty, totalDistance]);

  // Trigger endRace outside state updates to prevent React warnings
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (playerDistance >= totalDistance) {
      endRace('player');
    } else if (rivalDistance >= totalDistance) {
      endRace('rival');
    }
  }, [playerDistance, rivalDistance, gameState, totalDistance]);

  const endRace = (raceWinner: 'player' | 'rival') => {
    if (hasSavedXPRef.current) return;
    hasSavedXPRef.current = true;

    setWinner(raceWinner);
    setGameState('gameover');
    if (loopRef.current) clearInterval(loopRef.current);

    // Calculate XP
    let rewardXP = 5; // participation XP
    if (raceWinner === 'player') {
      rewardXP = 20; // 1st place
      sounds.playSuccess();
    } else {
      sounds.playError();
    }
    setXpEarned(rewardXP);
    addGameXP(rewardXP);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPaused) return;
    const val = e.target.value;
    setInputValue(val);

    const normalizedVal = val.trim();
    if (normalizedVal === targetWord) {
      // Word typed correctly!
      sounds.playClick();
      setInputValue('');
      setWordsTyped(w => w + 1);

      // Distance parameters
      const baseDistance = targetWord.length * 2.8; 
      const finalDistance = isNitroActive ? baseDistance * 2 : baseDistance;

      setPlayerDistance(prev => Math.min(totalDistance, prev + finalDistance));

      // Streak & Nitro boost trigger
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > 0 && nextStreak % 3 === 0) {
        setIsNitroActive(true);
        setNitroTimeLeft(3); // 3 seconds nitro boost
      }

      // Update target word and upcoming nextWords queue
      const next = nextWords[0] || getNextWord();
      const future = getNextWord();
      setTargetWord(next);
      setNextWords([nextWords[1] || getNextWord(), future]);
    } else if (normalizedVal.length > 0 && !targetWord.startsWith(normalizedVal)) {
      // Made a typo!
      setStreak(0);
      setIsNitroActive(false);
      setNitroTimeLeft(0);
    }
  };

  const renderTargetWord = () => {
    const trimmedInput = inputValue.trim();
    return targetWord.split('').map((char, index) => {
      let colorClass = 'text-zinc-400 dark:text-zinc-650';
      if (index < trimmedInput.length) {
        if (trimmedInput[index] === char) {
          colorClass = 'text-amber-400 dark:text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]';
        } else {
          colorClass = 'text-rose-500 dark:text-rose-500 font-bold';
        }
      }
      return (
        <span key={index} className={`font-mono text-2xl md:text-4xl uppercase tracking-wider transition-all duration-150 ${colorClass}`}>
          {char}
        </span>
      );
    });
  };

  // Determine player placement
  const getPlayerPlacementText = () => {
    return playerDistance >= rivalDistance ? '1st (Booska 1-aad)' : '2nd (Booska 2-aad)';
  };

  // Helper to draw 3D perspective dashes in Cockpit View
  const renderPerspectiveRoadDashes = () => {
    const dashes = [];
    const totalDashes = 6;
    for (let i = 0; i < totalDashes; i++) {
      const p = (i / totalDashes + scrollOffset) % 1;
      const y1 = 200 + 200 * p * p;
      const pNext = p + 0.07 * (p + 0.15); // make dashes longer as they scroll closer
      const y2 = 200 + 200 * pNext * pNext;
      const w = 1 + 6 * p;

      // Project center X (vanishing point is at X=500, horizon Y=200)
      if (y1 < 400) {
        dashes.push(
          <line
            key={i}
            x1={500}
            y1={y1}
            x2={500}
            y2={Math.min(400, y2)}
            stroke="#fbbf24"
            strokeWidth={w}
          />
        );
      }
    }
    return dashes;
  };

  // Helper to render rival car in Cockpit View
  const renderRivalCarInCockpit = () => {
    const diff = rivalDistance - playerDistance;
    if (diff <= -15) return null; // rival is too far behind to see

    // Map difference (e.g. -15m to 200m) to a perspective scale
    const scale = Math.max(0, Math.min(1.2, 1 - (diff / 150)));
    
    // Position coordinates
    const carY = 200 + 170 * scale * scale; // Horizon y=200, bottom road y=370
    const carSize = 10 + 90 * scale * scale; // Width scales up as it gets closer

    // Rival is in Lane 2 (right lane). Horizon center is X=500. Right lane center ends at X=650.
    const carX = 500 + 150 * scale * scale;

    return (
      <div 
        className="absolute transition-all duration-75 select-none pointer-events-none"
        style={{
          left: `${(carX / 1000) * 100}%`,
          top: `${(carY / 400) * 100}%`,
          width: `${carSize}px`,
          height: `${carSize * 0.75}px`, // Taller SUV aspect ratio
          transform: 'translate(-50%, -100%)'
        }}
      >
        <svg viewBox="0 0 120 90" className="w-full h-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]">
          {/* Tires */}
          <rect x="15" y="65" width="16" height="20" rx="3" fill="#18181b" />
          <rect x="89" y="65" width="16" height="20" rx="3" fill="#18181b" />
          
          {/* Underbody/Suspension shadow */}
          <rect x="25" y="70" width="70" height="10" rx="2" fill="#09090b" />
          {/* Exhaust pipes */}
          <rect x="28" y="76" width="6" height="6" rx="1" fill="#71717a" />
          <rect x="86" y="76" width="6" height="6" rx="1" fill="#71717a" />
          
          {/* Main SUV Body (Boxy) */}
          <path d="M 10 65 L 12 45 L 20 12 L 100 12 L 108 45 L 110 65 Z" fill="#eab308" />
          <path d="M 12 45 L 20 12 L 100 12 L 108 45 Z" fill="#facc15" />
          
          {/* Roof Rack rails */}
          <rect x="25" y="7" width="4" height="6" rx="1" fill="#18181b" />
          <rect x="91" y="7" width="4" height="6" rx="1" fill="#18181b" />
          <line x1="25" y1="8" x2="95" y2="8" stroke="#18181b" strokeWidth="3" />
          
          {/* Rear Windshield Glass */}
          <path d="M 24 16 L 96 16 L 90 40 L 30 40 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          <path d="M 28 20 L 92 20 L 88 32 L 32 32 Z" fill="#0f172a" opacity="0.4" />
          
          {/* Rear Lights */}
          <rect x="10" y="44" width="8" height="15" rx="1" fill="#991b1b" />
          <rect x="10" y="44" width="8" height="7" rx="1" fill="#dc2626" />
          <rect x="102" y="44" width="8" height="15" rx="1" fill="#991b1b" />
          <rect x="102" y="44" width="8" height="7" rx="1" fill="#dc2626" />

          {/* Black bumper */}
          <path d="M 8 58 L 112 58 L 108 68 L 12 68 Z" fill="#27272a" />
          <rect x="16" y="60" width="88" height="6" rx="2" fill="#18181b" />

          {/* License plate (FAST1) */}
          <rect x="46" y="52" width="28" height="11" rx="1.5" fill="#f8fafc" stroke="#475569" strokeWidth="1" />
          <text x="60" y="60" fill="#1d4ed8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">FAST1</text>
          
          {/* Reflectors */}
          <rect x="20" y="50" width="6" height="2" fill="#ef4444" />
          <rect x="94" y="50" width="6" height="2" fill="#ef4444" />
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 select-none relative">
      {/* Custom Scrolling Background & Racetrack styles */}
      <style>{`
        @keyframes scrollRoad {
          0% { background-position-y: 0px; }
          100% { background-position-y: 120px; }
        }
        @keyframes scrollShore {
          0% { background-position-y: 0px; }
          100% { background-position-y: 60px; }
        }
        .road-moving {
          animation: scrollRoad 0.4s linear infinite;
        }
        .road-moving-nitro {
          animation: scrollRoad 0.15s linear infinite;
        }
        .shore-moving {
          animation: scrollShore 1.2s linear infinite;
        }
        .wavy-shore-left {
          background-image: radial-gradient(circle at 100% 50%, transparent 12px, #ffffff 12px, #ffffff 16px, transparent 16px);
          background-size: 20px 40px;
        }
        .wavy-shore-right {
          background-image: radial-gradient(circle at 0% 50%, transparent 12px, #ffffff 12px, #ffffff 16px, transparent 16px);
          background-size: 20px 40px;
        }
        .lane-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 4px;
          background-image: repeating-linear-gradient(to bottom, #fbbf24, #fbbf24 20px, transparent 20px, transparent 40px);
          background-size: 100% 40px;
          animation: scrollRoad 0.4s linear infinite;
        }
        .lane-line-fast {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 4px;
          background-image: repeating-linear-gradient(to bottom, #fbbf24, #fbbf24 20px, transparent 20px, transparent 40px);
          background-size: 100% 40px;
          animation: scrollRoad 0.15s linear infinite;
        }
        .bg-noise {
          background-image: radial-gradient(rgba(255,255,255,0.15) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.3) 1px, transparent 0);
          background-size: 4px 4px;
          background-position: 0 0, 2px 2px;
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .animate-sway {
          animation: sway 3s ease-in-out infinite;
        }
      `}</style>

      {/* Game Header Panel */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider text-rose-500 uppercase px-2.5 py-1 rounded-full bg-rose-500/10 dark:bg-rose-500/15">
            Game: Car Racing
          </span>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mt-2">
            Car Racing
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Qor ereyada si sax ah si aad u gaadho xariiqa dhamaadka kahor tartamaha kale!
          </p>
        </div>

        <div className="flex gap-2">
          {/* CAMERA VIEW TOGGLE BUTTON */}
          {gameState === 'playing' && (
            <button
              onClick={() => setCameraView(c => c === 'topdown' ? 'cockpit' : 'topdown')}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5"
              title="Beddel Muraayadda Kaamirada"
            >
              <Eye className="w-4 h-4" />
              <span>Beddel Kaamirada</span>
            </button>
          )}

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

      {/* Start screen (Lobby/Settings screen) */}
      {gameState === 'start' && (
        <div className="w-full relative h-[520px] rounded-3xl border border-zinc-350 dark:border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col justify-between items-center py-6">
          
          {/* Outer Landscape backgrounds */}
          <div className="absolute left-0 top-0 bottom-0 w-[15%] bg-emerald-500 border-r-4 border-white flex justify-end">
            <div className="w-1/2 h-full bg-sky-400 relative overflow-hidden">
              <div className="absolute inset-0 opacity-35 bg-[linear-gradient(to_bottom,transparent_45%,rgba(255,255,255,0.4)_50%,transparent_55%)] bg-[size:100%_40px]" />
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-[15%] bg-amber-250 border-l-4 border-white flex">
            <div className="absolute left-0 top-0 bottom-0 w-2 wavy-shore-right opacity-80" />
            <div className="w-1/2 h-full bg-yellow-250" />
            <div className="w-1/2 h-full bg-sky-400 relative overflow-hidden">
              <div className="absolute inset-0 opacity-35 bg-[linear-gradient(to_bottom,transparent_45%,rgba(255,255,255,0.4)_50%,transparent_55%)] bg-[size:100%_40px]" />
            </div>
          </div>

          {/* Center Road background grid */}
          <div className="absolute left-[15%] right-[15%] top-0 bottom-0 bg-zinc-800 flex justify-between px-4 border-l-4 border-r-4 border-zinc-700">
            <div className="lane-line" style={{ left: '50%', animationDuration: '0.8s' }} />

            {/* Starting Position Cars */}
            <div className="absolute left-[20%] bottom-8">
              <svg viewBox="0 0 40 80" className="w-12 h-24 drop-shadow-[0_5px_8px_rgba(0,0,0,0.5)]">
                <rect x="4" y="2" width="32" height="76" rx="14" fill="#f59e0b" />
                <rect x="6" y="22" width="28" height="2" fill="#ffffff" />
                <rect x="6" y="56" width="28" height="2" fill="#ffffff" />
                <rect x="17" y="2" width="2" height="76" fill="#ffffff" />
                <rect x="21" y="2" width="2" height="76" fill="#ffffff" />
                <path d="M 8 28 Q 20 18 32 28 L 30 46 Q 20 50 10 46 Z" fill="#0f172a" />
                <path d="M 11 58 Q 20 56 29 58 L 27 66 Q 20 68 13 66 Z" fill="#0f172a" />
                <circle cx="8" cy="18" r="4" fill="#1e293b" />
                <circle cx="32" cy="18" r="4" fill="#1e293b" />
                <circle cx="8" cy="62" r="4" fill="#1e293b" />
                <circle cx="32" cy="62" r="4" fill="#1e293b" />
                
                {/* Somali Flag on the hood */}
                <rect x="10" y="8" width="20" height="12" rx="1" fill="#3b82f6" />
                <polygon points="20,11 21,13 23,13 21.5,14.5 22.2,16.5 20,15.2 17.8,16.5 18.5,14.5 17,13 19,13" fill="#ffffff" />
              </svg>
            </div>

            <div className="absolute left-[60%] bottom-8">
              <svg viewBox="0 0 120 90" className="w-16 h-12 drop-shadow-[0_5px_8px_rgba(0,0,0,0.5)]">
                <rect x="15" y="65" width="16" height="20" rx="3" fill="#18181b" />
                <rect x="89" y="65" width="16" height="20" rx="3" fill="#18181b" />
                <rect x="25" y="70" width="70" height="10" rx="2" fill="#09090b" />
                <path d="M 10 65 L 12 45 L 20 12 L 100 12 L 108 45 L 110 65 Z" fill="#eab308" />
                <path d="M 12 45 L 20 12 L 100 12 L 108 45 Z" fill="#facc15" />
                <rect x="46" y="52" width="28" height="11" rx="1.5" fill="#f8fafc" stroke="#475569" strokeWidth="1" />
                <text x="60" y="60" fill="#1d4ed8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">FAST1</text>
              </svg>
            </div>
          </div>

          {/* Foreground Title Text */}
          <div className="z-10 text-center flex flex-col items-center gap-1 mt-4">
            <h1 className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] flex items-center gap-2">
              TYPING <span className="bg-zinc-950 px-2 py-0.5 rounded text-zinc-100 flex items-center"><Trophy className="w-8 h-8 text-amber-400" /></span>
            </h1>
            <h2 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-red-650 via-red-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] -mt-1">
              CAR RIDER
            </h2>
          </div>

          {/* Settings / Controls */}
          <div className="z-10 flex flex-col gap-3.5 bg-zinc-955/90 backdrop-blur px-6 py-4 rounded-2xl border border-zinc-800 max-w-md w-full mx-4 shadow-2xl">
            {/* Difficulty Selector */}
            <div className="flex flex-col gap-1 items-center w-full">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Adkaanta Tartanka (Difficulty):</span>
              <div className="flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 w-full">
                {(['rookie', 'pro', 'legend'] as RivalDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded transition-all capitalize ${
                      difficulty === d
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-450 hover:text-zinc-205'
                    }`}
                  >
                    {d === 'rookie' ? 'Rookie (22 WPM)' : d === 'pro' ? 'Pro (36 WPM)' : 'Legend (50 WPM)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera View Selector */}
            <div className="flex flex-col gap-1 items-center w-full">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Muraayadda Kaamirada (Camera View):</span>
              <div className="flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 w-full">
                {(['cockpit', 'topdown'] as CameraView[]).map((cam) => (
                  <button
                    key={cam}
                    onClick={() => setCameraView(cam)}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded transition-all capitalize ${
                      cameraView === cam
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-450 hover:text-zinc-205'
                    }`}
                  >
                    {cam === 'cockpit' ? 'Cockpit (Windshield)' : 'Top-Down (Bird\'s Eye)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Race Distance Selector */}
            <div className="flex flex-col gap-1 items-center w-full">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fogaanta Tartanka (Distance):</span>
              <div className="flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 w-full">
                {([500, 1000, 1500] as number[]).map((dist) => (
                  <button
                    key={dist}
                    onClick={() => setTotalDistance(dist)}
                    className={`flex-1 py-1.5 text-[10px] font-extrabold rounded transition-all ${
                      totalDistance === dist
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-450 hover:text-zinc-205'
                    }`}
                  >
                    {dist === 500 ? 'Gaaban (500m)' : dist === 1000 ? 'Dhexe (1000m)' : 'Dheer (1500m)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Keys filter (Only manually) */}
            {!levelFilter && user && (
              <div className="flex flex-col gap-1 items-center w-full">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ereyada Casharka:</span>
                <div className="flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 w-full">
                  <button
                    onClick={() => setDifficultyMode('all')}
                    className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
                      difficultyMode === 'all'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-450 hover:text-zinc-205'
                    }`}
                  >
                    Dhamaan
                  </button>
                  <button
                    onClick={() => setDifficultyMode('current')}
                    className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
                      difficultyMode === 'current'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-450 hover:text-zinc-205'
                    }`}
                  >
                    Casharka {user.currentLevel}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LARGE START BUTTON */}
          <button
            onClick={startCountdown}
            className="z-10 group relative w-72 h-14 rounded-2xl bg-gradient-to-r from-red-655 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-extrabold text-2xl italic tracking-widest shadow-xl shadow-red-655/40 hover:shadow-red-655/55 transition-all border-b-4 border-red-800 active:scale-[0.98] active:border-b-0 flex items-center justify-center gap-2 overflow-hidden mb-4"
          >
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-zinc-900 opacity-15 flex flex-col justify-around py-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-2 h-2 bg-white self-center rotate-45" />
              ))}
            </div>
            <span>START</span>
          </button>
        </div>
      )}

      {/* Countdown Screen */}
      {gameState === 'countdown' && (
        <div className="w-full flex flex-col items-center justify-center p-24 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#070b13] text-center gap-6 shadow-xl">
          <div className="text-8xl font-black font-mono text-rose-500 animate-ping">
            {countdown}
          </div>
          <span className="text-sm font-semibold tracking-widest text-zinc-400 uppercase mt-4">TIRADA MA BILOWDAY...</span>
        </div>
      )}

      {/* Active gameplay display */}
      {gameState === 'playing' && (
        <div className="w-full flex flex-col gap-4 relative" onClick={() => { if (cameraView === 'cockpit') inputRef.current?.focus(); }}>
          
          {/* CAMERA VIEW 1: TOP-DOWN VIEW */}
          {cameraView === 'topdown' && (
            <>
              {/* Game Stats HUD */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Position</span>
                  <span className="text-2xl font-extrabold mt-0.5 text-amber-500">
                    {getPlayerPlacementText()}
                  </span>
                </div>
                
                <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Speed (WPM)</span>
                  <span className="text-2xl font-extrabold text-indigo-500 mt-0.5 font-mono">{playerSpeedWPM} WPM</span>
                </div>

                <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Wakhtiga Race-ka</span>
                  <span className="text-2xl font-extrabold text-amber-500 mt-0.5 font-mono">{raceTimeElapsed.toFixed(1)}s</span>
                </div>

                <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Fogaanta</span>
                  <span className="text-2xl font-extrabold text-rose-500 mt-0.5 font-mono">
                    {Math.round(playerDistance)}m / {totalDistance}m
                  </span>
                </div>
              </div>

              {/* Nitro Activation message */}
              {isNitroActive && (
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-center text-sm font-bold flex items-center justify-center gap-2 animate-bounce">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
                  <span>NITRO BOOST SHIDAN! (Double speed for {nitroTimeLeft.toFixed(1)}s)</span>
                </div>
              )}

              {/* Vertical Racetrack Visual Box */}
              <div className="relative w-full h-[450px] rounded-3xl border border-zinc-355 dark:border-zinc-800 bg-zinc-900 overflow-hidden flex shadow-2xl">
                {/* Landscape backgrounds */}
                <div className="relative w-[15%] h-full bg-emerald-500 border-r-4 border-white flex justify-end">
                  <div className="w-1/2 h-full bg-sky-400 relative overflow-hidden">
                    <div className={`absolute inset-0 opacity-35 bg-[linear-gradient(to_bottom,transparent_45%,rgba(255,255,255,0.4)_50%,transparent_55%)] bg-[size:100%_40px] ${
                      isNitroActive ? 'road-moving-nitro' : 'road-moving'
                    }`} />
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-2 wavy-shore-left opacity-80" />
                </div>

                <div className="relative w-[15%] h-full bg-amber-250 border-l-4 border-white flex">
                  <div className="absolute left-0 top-0 bottom-0 w-2 wavy-shore-right opacity-80" />
                  <div className="w-1/2 h-full bg-yellow-250" />
                  <div className="w-1/2 h-full bg-sky-400 relative overflow-hidden">
                    <div className={`absolute inset-0 opacity-35 bg-[linear-gradient(to_bottom,transparent_45%,rgba(255,255,255,0.4)_50%,transparent_55%)] bg-[size:100%_40px] ${
                      isNitroActive ? 'road-moving-nitro' : 'road-moving'
                    }`} />
                  </div>
                </div>

                {/* Center Racetrack: 2 Lanes */}
                <div className="relative w-[70%] h-full bg-zinc-800 border-l-4 border-r-4 border-zinc-700 overflow-hidden">
                  <div className={isNitroActive ? 'lane-line-fast' : 'lane-line'} style={{ left: '50%' }} />

                  {/* Side Road Markings */}
                  <div className="absolute left-1 top-0 bottom-0 w-1 bg-white opacity-40" />
                  <div className="absolute right-1 top-0 bottom-0 w-1 bg-white opacity-40" />

                  {/* Checkerboard Finish Line */}
                  <div 
                    className="absolute left-0 right-0 h-8 flex flex-col border-b-2 border-white" 
                    style={{ 
                      top: '10%',
                      backgroundImage: 'repeating-linear-gradient(90deg, #ffffff, #ffffff 16px, #000000 16px, #000000 32px)',
                      backgroundSize: '32px 100%'
                    }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-zinc-950 px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-widest border border-zinc-800">
                      FINISH ({totalDistance}m)
                    </div>
                  </div>

                  {/* Player Car */}
                  <div 
                    className="absolute transition-all duration-300 flex flex-col items-center"
                    style={{
                      left: '25%',
                      bottom: `${(playerDistance / totalDistance) * 75 + 5}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {isNitroActive && (
                      <div className="absolute -bottom-8 flex flex-col gap-0.5 items-center">
                        <div className="w-3 h-8 bg-gradient-to-t from-yellow-300 via-orange-500 to-red-650 rounded-full blur-[1px] animate-pulse" />
                        <div className="w-1.5 h-4 bg-yellow-300 rounded-full blur-[1px] animate-ping" />
                      </div>
                    )}
                    <svg viewBox="0 0 40 80" className="w-10 h-20 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                      <rect x="4" y="2" width="32" height="76" rx="14" fill="#f59e0b" />
                      <rect x="6" y="22" width="28" height="2" fill="#ffffff" />
                      <rect x="6" y="56" width="28" height="2" fill="#ffffff" />
                      <rect x="17" y="2" width="2" height="76" fill="#ffffff" />
                      <rect x="21" y="2" width="2" height="76" fill="#ffffff" />
                      <path d="M 8 28 Q 20 18 32 28 L 30 46 Q 20 50 10 46 Z" fill="#0f172a" />
                      <path d="M 11 58 Q 20 56 29 58 L 27 66 Q 20 68 13 66 Z" fill="#0f172a" />
                      <circle cx="8" cy="18" r="4" fill="#1e293b" />
                      <circle cx="32" cy="18" r="4" fill="#1e293b" />
                      <circle cx="8" cy="62" r="4" fill="#1e293b" />
                      <circle cx="32" cy="62" r="4" fill="#1e293b" />
                      
                      {/* Somali Flag on the hood */}
                      <rect x="10" y="8" width="20" height="12" rx="1" fill="#3b82f6" />
                      <polygon points="20,11 21,13 23,13 21.5,14.5 22.2,16.5 20,15.2 17.8,16.5 18.5,14.5 17,13 19,13" fill="#ffffff" />
                    </svg>
                  </div>

                  {/* Red Rival Car */}
                  <div 
                    className="absolute transition-all duration-300 flex flex-col items-center"
                    style={{
                      left: '75%',
                      bottom: `${(rivalDistance / totalDistance) * 75 + 5}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <svg viewBox="0 0 40 80" className="w-10 h-20 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                      <rect x="4" y="2" width="32" height="76" rx="14" fill="#dc2626" />
                      <rect x="17" y="2" width="2" height="76" fill="#3b82f6" />
                      <rect x="21" y="2" width="2" height="76" fill="#3b82f6" />
                      <path d="M 8 28 Q 20 18 32 28 L 30 46 Q 20 50 10 46 Z" fill="#0f172a" />
                      <path d="M 11 58 Q 20 56 29 58 L 27 66 Q 20 68 13 66 Z" fill="#0f172a" />
                      <circle cx="8" cy="18" r="4" fill="#1e293b" />
                      <circle cx="32" cy="18" r="4" fill="#1e293b" />
                      <circle cx="8" cy="62" r="4" fill="#1e293b" />
                      <circle cx="32" cy="62" r="4" fill="#1e293b" />
                      <text x="18" y="16" fill="#fecaca" fontSize="9" fontWeight="bold">10</text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Typing Console below */}
              <div className="w-full flex flex-col items-center gap-4 py-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#070b13]/40 shadow-lg text-center mt-2">
                <div className="flex items-center gap-2 mb-2 px-3 py-1 rounded-full border border-amber-500/25 bg-amber-500/5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase">Qor Ereyga (Type Word)</span>
                </div>
                
                <div className="h-14 flex items-center justify-center gap-0.5">
                  {renderTargetWord()}
                </div>

                <div className="relative w-full max-w-md mt-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Halkan ku qor..."
                    value={inputValue}
                    onChange={handleInputChange}
                    className="w-full py-3.5 px-6 rounded-2xl text-center text-lg font-mono font-bold tracking-wide border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder-zinc-400 dark:placeholder-zinc-650"
                  />
                </div>
              </div>
            </>
          )}

          {/* CAMERA VIEW 2: FIRST-PERSON COCKPIT VIEW */}
          {cameraView === 'cockpit' && (
            <div className="w-full relative aspect-[4/3] rounded-3xl border-4 border-zinc-700 bg-sky-300 overflow-hidden shadow-2xl flex flex-col justify-end">
              
              {/* 1. WINDSHIELD VIEW (Upper ~58% of the screen) */}
              <div className="absolute top-0 left-0 right-0 bottom-[42%] overflow-hidden bg-sky-300">
                {/* 3D Windshield SVG */}
                <svg viewBox="0 0 1000 400" className="w-full h-full" preserveAspectRatio="none">
                  {/* Sky gradient */}
                  <defs>
                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#e0f2fe" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="1000" height="200" fill="url(#skyGrad)" />
                  
                  {/* Clouds */}
                  <ellipse cx="250" cy="80" rx="90" ry="16" fill="#ffffff" opacity="0.85" />
                  <ellipse cx="750" cy="100" rx="110" ry="20" fill="#ffffff" opacity="0.8" />

                  {/* Horizon green hills */}
                  <path d="M 0 200 Q 150 170 300 200 T 600 200 T 900 200 T 1000 200 L 1000 250 L 0 250 Z" fill="#166534" />
                  <path d="M 0 200 Q 350 180 700 200 T 1000 200 L 1000 250 L 0 250 Z" fill="#15803d" />

                  {/* Grass background below horizon */}
                  <rect x="0" y="200" width="1000" height="200" fill="#16a34a" />
                  {/* Right sand bank shoulder */}
                  <path d="M 540 200 L 1000 200 L 1000 400 L 820 400 Z" fill="#fef08a" />

                  {/* Racetrack (Trapezoid from Y=200 to Y=400) */}
                  <path d="M 460 200 L 540 200 L 820 400 L 180 400 Z" fill="#27272a" />

                  {/* Road shoulder white line dividers */}
                  <line x1={460} y1={200} x2={180} y2={400} stroke="#ffffff" strokeWidth="8" />
                  <line x1={540} y1={200} x2={820} y2={400} stroke="#ffffff" strokeWidth="8" />

                  {/* Yellow dashed center line */}
                  {renderPerspectiveRoadDashes()}

                  {/* Checkerboard Finish Line in 3D distance */}
                  {playerDistance >= totalDistance - 40 && (
                    <path 
                      d="M 470 210 L 460 200 L 540 200 L 530 210 Z" 
                      fill="#ffffff" 
                      stroke="#000000" 
                      strokeWidth="1.5"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(90deg, #ffffff, #ffffff 4px, #000000 4px, #000000 8px)',
                      }}
                    />
                  )}
                </svg>

                {/* Rival Car (Yellow SUV) on the road */}
                {renderRivalCarInCockpit()}

                {/* Red sports car hood at the bottom of the windshield */}
                <div className="absolute bottom-0 left-0 right-0 h-[15%] select-none pointer-events-none z-10">
                  <svg viewBox="0 0 1000 100" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M -10 100 Q 500 -10 1010 100 Z" fill="#dc2626" />
                    <path d="M 150 100 Q 500 20 850 100" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.8" />
                    <path d="M 300 100 Q 500 40 700 100" fill="none" stroke="#f87171" strokeWidth="2" opacity="0.6" />
                  </svg>
                </div>

                {/* Beige Windshield Frame (Left and Right A-Pillars) */}
                <div className="absolute inset-0 select-none pointer-events-none z-10">
                  <svg viewBox="0 0 1000 400" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M 0 0 L 80 0 L 140 400 L 0 400 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="2" />
                    <path d="M 80 0 L 95 0 L 155 400 L 140 400 Z" fill="#e5e7eb" opacity="0.6" />
                    <path d="M 1000 0 L 920 0 L 860 400 L 1000 400 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="2" />
                    <path d="M 920 0 L 905 0 L 845 400 L 860 400 Z" fill="#e5e7eb" opacity="0.6" />
                  </svg>
                </div>

                {/* Hanging Somali Flag from Rearview Mirror */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center select-none pointer-events-none">
                  <div className="animate-sway flex flex-col items-center origin-top">
                    <div className="w-0.5 h-12 bg-zinc-800" />
                    <div className="w-12 h-8 bg-[#3b82f6] border border-white/20 shadow-md flex items-center justify-center relative">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Distance text overlays on Windshield */}
                <div className="absolute top-16 left-[16%] bg-zinc-950/75 backdrop-blur px-3 py-1.5 rounded-xl border border-zinc-800 text-[10px] font-bold text-zinc-300 flex flex-col">
                  <span className="text-zinc-550 uppercase tracking-wider text-[8px]">Distance Target</span>
                  <span className="font-mono text-zinc-100 text-xs mt-0.5">{Math.round(playerDistance)}m / {totalDistance}m</span>
                </div>

                <div className="absolute top-16 right-[16%] bg-zinc-950/75 backdrop-blur px-3 py-1.5 rounded-xl border border-zinc-800 text-[10px] font-bold text-zinc-300 flex flex-col text-right">
                  <span className="text-zinc-550 uppercase tracking-wider text-[8px]">Rival Distance</span>
                  <span className="font-mono text-zinc-100 text-xs mt-0.5">{Math.round(rivalDistance)}m</span>
                </div>

                {/* HUD overlays inside windshield */}
                {/* Pause button top-left */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsPaused(true); }}
                  className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded bg-white hover:bg-zinc-100 border border-zinc-350 text-xs font-bold text-zinc-800 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Pause
                </button>

                {/* Zoom buttons top-right */}
                <div className="absolute top-4 right-4 z-30 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => setTextZoom(z => Math.min(1.5, z + 0.1))}
                    className="w-8 h-8 rounded bg-white hover:bg-zinc-100 border border-zinc-355 shadow-md flex items-center justify-center text-zinc-850 active:scale-95 cursor-pointer"
                    title="Zoom In Text"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setTextZoom(z => Math.max(0.7, z - 0.1))}
                    className="w-8 h-8 rounded bg-white hover:bg-zinc-100 border border-zinc-355 shadow-md flex items-center justify-center text-zinc-855 active:scale-95 cursor-pointer"
                    title="Zoom Out Text"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 2. DASHBOARD OVERLAY (Bottom ~42% of the screen) */}
              <div className="absolute bottom-0 left-0 right-0 h-[42%] bg-gradient-to-b from-[#2d2e35] via-[#1d1e22] to-[#121316] border-t-8 border-zinc-800 shadow-[2px_-4px_20px_rgba(0,0,0,0.8)] z-20 flex justify-between items-center px-6 relative">
                <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none mix-blend-overlay" />

                {/* Speedometer (WPM) on the left */}
                <div className="flex flex-col items-center justify-center w-[25%] select-none">
                  <div className="relative w-28 h-28 bg-zinc-100 rounded-full border-[6px] border-zinc-700 shadow-[inset_0_4px_10px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center overflow-hidden">
                    {/* Gauge face ticks & green zone */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-[225deg]" viewBox="0 0 100 100">
                      {/* Green high-WPM zone (from 90 to 120 WPM) */}
                      <path 
                        d="M 78.3 78.3 A 40 40 0 0 0 78.3 21.7" 
                        fill="none" 
                        stroke="#22c55e" 
                        strokeWidth="8" 
                        opacity="0.3"
                      />
                      {/* Ticks */}
                      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((val, idx) => {
                        const angle = (idx * 22.5); // 270 degrees total sweep / 12 intervals
                        return (
                          <line 
                            key={val}
                            x1="50"
                            y1="13"
                            x2="50"
                            y2="18"
                            stroke="#1f2937"
                            strokeWidth="2"
                            transform={`rotate(${angle} 50 50)`}
                          />
                        );
                      })}
                    </svg>
                    
                    {/* Speedometer Numbers */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-mono text-[8px] font-black text-zinc-800">
                      <span className="absolute left-[26px] bottom-[26px]">10</span>
                      <span className="absolute left-[16px] bottom-[46px]">20</span>
                      <span className="absolute left-[18px] top-[32px]">30</span>
                      <span className="absolute left-[30px] top-[16px]">40</span>
                      <span className="absolute left-[48px] top-[10px] -translate-x-1/2">50</span>
                      <span className="absolute right-[30px] top-[16px]">60</span>
                      <span className="absolute right-[18px] top-[32px]">70</span>
                      <span className="absolute right-[16px] bottom-[46px]">80</span>
                      <span className="absolute right-[26px] bottom-[26px]">90</span>
                      <span className="absolute right-[30px] bottom-[12px]">100</span>
                      <span className="absolute left-[48px] bottom-[12px] -translate-x-1/2 text-[8px]">WPM</span>
                    </div>

                    <span className="z-10 text-xs font-black text-zinc-900 mt-6 font-mono tracking-tight bg-zinc-200/80 px-2 py-0.5 rounded border border-zinc-300">
                      {playerSpeedWPM}
                    </span>

                    {/* Needle */}
                    <div 
                      className="absolute w-1 h-14 bg-gradient-to-t from-orange-600 to-orange-500 origin-bottom rounded-full shadow-lg transition-transform duration-300"
                      style={{
                        bottom: '50%',
                        transform: `rotate(${Math.min(135, Math.max(-135, (playerSpeedWPM / 120) * 270 - 135))}deg)`
                      }}
                    >
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-zinc-850 border-2 border-zinc-650 rounded-full" />
                    </div>
                  </div>

                  {/* Warning Lights */}
                  <div className="flex gap-4 mt-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-3.5 h-3.5 rounded-full border border-zinc-955 flex items-center justify-center ${playerSpeedWPM > 10 ? 'bg-red-500/20 text-red-600/40' : 'bg-red-600 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}>
                        <span className="text-[5px] font-black leading-none">OIL</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3.5 h-3.5 rounded-full border border-zinc-955 flex items-center justify-center ${isNitroActive ? 'bg-red-600 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-red-500/20 text-red-650/40'}`}>
                        <span className="text-[5px] font-black leading-none">BAT</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steering Wheel with central target display screen */}
                <div className="relative flex justify-center items-center h-full w-[45%]">
                  
                  {/* Steering Wheel SVG (Rim + Spokes) */}
                  <svg viewBox="0 0 320 320" className="absolute w-[290px] h-[290px] pointer-events-none z-30 opacity-95">
                    <defs>
                      <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#d1d5db" />
                        <stop offset="50%" stopColor="#f3f4f6" />
                        <stop offset="100%" stopColor="#9ca3af" />
                      </linearGradient>
                    </defs>

                    {/* Spokes */}
                    <g transform="rotate(-70 160 160)">
                      <polygon points="144,160 176,160 168,285 152,285" fill="url(#metalGradient)" stroke="#71717a" strokeWidth="1" />
                      <circle cx="160" cy="190" r="6" fill="#09090b" />
                      <circle cx="160" cy="225" r="6" fill="#09090b" />
                      <circle cx="160" cy="260" r="6" fill="#09090b" />
                    </g>
                    <g transform="rotate(70 160 160)">
                      <polygon points="144,160 176,160 168,285 152,285" fill="url(#metalGradient)" stroke="#71717a" strokeWidth="1" />
                      <circle cx="160" cy="190" r="6" fill="#09090b" />
                      <circle cx="160" cy="225" r="6" fill="#09090b" />
                      <circle cx="160" cy="260" r="6" fill="#09090b" />
                    </g>
                    <g>
                      <polygon points="144,160 176,160 168,285 152,285" fill="url(#metalGradient)" stroke="#71717a" strokeWidth="1" />
                      <circle cx="160" cy="190" r="6" fill="#09090b" />
                      <circle cx="160" cy="225" r="6" fill="#09090b" />
                      <circle cx="160" cy="260" r="6" fill="#09090b" />
                    </g>

                    {/* Outer Wheel Rim */}
                    <circle cx="160" cy="160" r="145" fill="none" stroke="#18181b" strokeWidth="22" />
                    <circle cx="160" cy="160" r="133" fill="none" stroke="#27272a" strokeWidth="2" opacity="0.4" />
                    <circle cx="160" cy="160" r="72" fill="#27272a" stroke="#09090b" strokeWidth="3" />
                  </svg>

                  {/* Center LCD Typing Screen inside the Steering Wheel hub */}
                  <div className="z-45 w-[210px] h-[105px] bg-[#0c1514] rounded-2xl border-4 border-zinc-800 shadow-[0_10px_25px_rgba(0,0,0,0.8),inset_0_2px_8px_rgba(0,0,0,0.5)] flex flex-col justify-between p-3.5 py-4 text-left font-mono relative overflow-hidden select-none border-b-[6px]">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none" />
                    
                    {/* Target words display */}
                    <div className="flex flex-col gap-1.5 z-10 w-full">
                      {/* Top Line: Target Word & Next Words */}
                      <div 
                        className="text-xs text-zinc-400 font-bold uppercase tracking-wider overflow-hidden whitespace-nowrap text-ellipsis"
                        style={{ transform: `scale(${textZoom})`, transformOrigin: 'left center' }}
                      >
                        <span className="text-amber-400 border-b border-amber-500/30 pb-0.5 mr-2 font-black">{targetWord}</span>
                        <span className="opacity-40">{nextWords ? nextWords.join(' ') : ''}</span>
                      </div>

                      {/* Bottom Line: Active typing preview */}
                      <div className="text-xs font-black text-emerald-400 uppercase tracking-widest mt-2 flex items-center h-5 overflow-hidden">
                        <span className="text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]">
                          {inputValue || ''}
                        </span>
                        <span className="w-2.5 h-3.5 bg-emerald-400 ml-1 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                      </div>
                    </div>

                    {/* Hidden input overlay that spans full width and intercepts focus */}
                    <input
                      type="text"
                      autoFocus
                      ref={inputRef}
                      placeholder=""
                      value={inputValue}
                      onChange={handleInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
                    />

                    <div className="absolute bottom-1 right-2 text-[5px] text-zinc-655 font-sans tracking-wide uppercase select-none pointer-events-none">
                      MONITOR HUB v1.0
                    </div>
                  </div>
                </div>

                {/* ACC Gauge and Radio Panel on the right */}
                <div className="flex items-center gap-4 w-[30%] select-none justify-end z-20">
                  {/* ACC Gauge */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-24 h-24 bg-zinc-100 rounded-full border-[6px] border-zinc-700 shadow-[inset_0_4px_10px_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center overflow-hidden">
                      {/* Gauge face ticks */}
                      <svg className="absolute inset-0 w-full h-full transform -rotate-[225deg]" viewBox="0 0 100 100">
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val, idx) => {
                          const angle = (idx * 27); // 270 degrees total sweep / 10 intervals
                          return (
                            <line 
                              key={val}
                              x1="50"
                              y1="13"
                              x2="50"
                              y2="18"
                              stroke="#1f2937"
                              transform={`rotate(${angle} 50 50)`}
                              strokeWidth="2"
                            />
                          );
                        })}
                      </svg>
                      
                      {/* Speedometer Numbers */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-mono text-[8px] font-black text-zinc-800">
                        <span className="absolute left-[20px] bottom-[20px]">10</span>
                        <span className="absolute left-[13px] bottom-[40px]">25</span>
                        <span className="absolute left-[16px] top-[28px]">40</span>
                        <span className="absolute left-[28px] top-[12px]">50</span>
                        <span className="absolute left-[48px] top-[8px] -translate-x-1/2">60</span>
                        <span className="absolute right-[28px] top-[12px]">70</span>
                        <span className="absolute right-[16px] top-[28px]">80</span>
                        <span className="absolute right-[13px] bottom-[40px]">90</span>
                        <span className="absolute right-[20px] bottom-[20px]">100</span>
                        <span className="absolute left-[48px] bottom-[10px] -translate-x-1/2 text-[8px] tracking-wide">ACC</span>
                      </div>

                      <span className="z-10 text-xs font-black text-zinc-900 mt-5 font-mono">
                        {isNitroActive ? 100 : Math.min(100, Math.round((streak % 3) * 33.3))}
                      </span>

                      {/* Needle */}
                      <div 
                        className="absolute w-1 h-12 bg-gradient-to-t from-orange-600 to-orange-500 origin-bottom rounded-full shadow-lg transition-transform duration-300"
                        style={{
                          bottom: '50%',
                          transform: `rotate(${isNitroActive ? 135 : Math.min(135, Math.max(-135, ((streak % 3) / 3) * 270 - 135))}deg)`
                        }}
                      >
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-zinc-800 border-2 border-zinc-650 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Radio stereo console */}
                  <div className="w-20 h-20 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-955 rounded-xl shadow-md p-1.5 flex flex-col justify-between">
                    <div className="bg-[#0b1b17] border border-[#112a23] rounded p-1 text-emerald-500 font-mono text-[7px] leading-tight flex flex-col justify-center select-none">
                      <span className="font-bold text-[#14b8a6]/40 leading-none">CHANNEL</span>
                      <span className="font-black tracking-wider text-[#14b8a6] animate-pulse mt-0.5">FM 88.5 MHz</span>
                    </div>

                    <div className="grid grid-cols-3 gap-0.5 mt-1 font-bold text-[6px] text-zinc-400 select-none">
                      <button className="bg-zinc-800 border border-zinc-950 rounded text-center py-0.5 font-mono">1</button>
                      <button className="bg-zinc-800 border border-zinc-950 rounded text-center py-0.5 font-mono">2</button>
                      <button className="bg-zinc-800 border border-zinc-950 rounded text-center py-0.5 font-mono text-[5px]">COM</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* warning indicator lights bottom corners */}
              <div className="absolute bottom-1 left-2 z-35 flex gap-1 select-none pointer-events-none">
                <div className={`w-2 h-2 rounded-full border border-zinc-955 ${playerSpeedWPM > 10 ? 'bg-red-500/25' : 'bg-red-600 animate-ping'}`} />
                <div className={`w-2 h-2 rounded-full border border-zinc-955 ${isNitroActive ? 'bg-amber-500 animate-pulse' : 'bg-amber-500/25'}`} />
              </div>
            </div>
          )}

          {/* Pause overlay inside game screen */}
          {isPaused && (
            <div className="absolute inset-0 bg-zinc-955/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 rounded-3xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-3xl font-black italic text-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                GAME-KA WAA LA HAKIYEY
              </h3>
              <p className="text-xs text-zinc-300 max-w-xs text-center -mt-1 leading-relaxed">
                Tartanku waa joogsaday. Si aad u sii waddo qorista, guji "Sii Bilow" ama riix ESC.
              </p>
              
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setIsPaused(false)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Sii Bilow (Resume)
                </button>
                <button
                  onClick={onBackToSelector}
                  className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-bold text-sm transition-all cursor-pointer"
                >
                  Ka Bax (Quit)
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Game Over Screen overlay */}
      {gameState === 'gameover' && (
        <div className="w-full flex flex-col items-center justify-center p-12 py-16 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16171d] shadow-2xl text-center gap-6 animate-fade-in">
          {winner === 'player' ? (
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/25">
              <Trophy className="w-12 h-12" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/25">
              <ShieldAlert className="w-12 h-12" />
            </div>
          )}

          <div>
            <h3 className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 font-sans tracking-tight">
              {winner === 'player' ? "Booska 1-aad! (You Won!)" : "Rival-ka Cas Ayaa Guuleystay!"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
              {winner === 'player' 
                ? "Hambalyo! Waxaad gaadhay xariiqa dhamaadka kahor tartamahaaga. Waxaad heshay +20 XP!"
                : "Waa lagaa adkaaday. Ereyada si dhakhso ah u qor oo isticmaal Nitro Boost si aad u guuleysato!"}
            </p>
          </div>

          {/* Metric details cards */}
          <div className="w-full max-w-md grid grid-cols-4 gap-3 border-t border-b border-zinc-100 dark:border-zinc-800 py-6 font-mono text-zinc-550 dark:text-zinc-400 my-2">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Speed</span>
              <span className="text-xl font-extrabold text-indigo-500">{playerSpeedWPM} WPM</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Wakhtiga</span>
              <span className="text-xl font-extrabold text-amber-500">{raceTimeElapsed.toFixed(1)}s</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Ereyo sax ah</span>
              <span className="text-xl font-extrabold text-cyan-500">{wordsTyped}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">XP la Kasbaday</span>
              <span className="text-xl font-extrabold text-emerald-500">+{xpEarned} XP</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={startCountdown}
              className="px-6 py-3 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Dib u Bilow</span>
            </button>
            <button
              onClick={onBackToSelector}
              className="px-6 py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Ku noqo Casharada</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarRacingGame;
