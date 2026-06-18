import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import sounds from '../utils/soundEffects';
import { Play, RotateCcw, Home, Award, Heart, ShieldAlert, Sparkles, Volume2, VolumeX, Zap, ArrowUp } from 'lucide-react';

interface FlappyPipe {
  id: string;
  text: string;
  x: number; // percentage from left (100 to 0)
  gapY: number; // center Y of the gap (80 to 220)
  gapSize: number; // height of the gap (e.g. 100)
  speed: number;
  isCleared: boolean;
  isTyped: boolean;
}

interface JumpGameProps {
  onBackToSelector: () => void;
  levelFilter?: { id: number; text: string; title: string } | null;
}

const GAME_WORDS_SHORT = [
  'aabe', 'hooyo', 'beer', 'bari', 'baro', 'buug', 'bad', 'caan', 'cag', 'dal', 
  'dad', 'dan', 'far', 'fure', 'geed', 'guul', 'guri', 'hadal', 'hir', 'iyo', 
  'il', 'irid', 'jid', 'kow', 'labo', 'lugo', 'nin', 'nool', 'roob', 'run', 
  'rux', 'sax', 'tag', 'uu', 'ubax', 'waa', 'wax', 'xeeb', 'ayay', 'yool'
];

const GAME_WORDS_MEDIUM = [
  'cunto', 'calan', 'cusub', 'dugsi', 'fanka', 'fadhi', 'gabay', 'dawo', 'ehel', 
  'keen', 'meel', 'haddii', 'aqoon', 'iftiin', 'iimayl', 'jidka', 'koob', 'luuqad', 
  'nabad', 'nambar', 'nafta', 'dayax', 'orod', 'qoraal', 'qaran', 'qeyb', 'reer', 
  'suuq', 'suuban', 'tiro', 'urur', 'usha', 'xeebta', 'xikmad'
];

const GAME_WORDS_LONG = [
  'maahmaah', 'magaalo', 'muhiim', 'taariikh', 'tababar', 'tusaale', 'waddani', 
  'wadajir', 'xorriyad', 'xarun', 'yaqaan', 'horumar', 'kalluun', 'jeclahay', 
  'gacanta', 'fiican', 'kastaa'
];

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

export const JumpGame: React.FC<JumpGameProps> = ({ onBackToSelector, levelFilter }) => {
  const { addGameXP, isMuted, toggleMute, user } = useAuth();

  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [pipes, setPipes] = useState<FlappyPipe[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameLevel, setGameLevel] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [xpEarned, setXpEarned] = useState(0);
  const [totalWordsTyped, setTotalWordsTyped] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showLevelUpMessage, setShowLevelUpMessage] = useState(false);
  const [difficultyMode, setDifficultyMode] = useState<'current' | 'all'>('all');

  // Flappy Bird Physics State
  const [birdY, setBirdY] = useState(160);
  const [birdTargetY, setBirdTargetY] = useState(160);
  const [isFlapping, setIsFlapping] = useState(false);
  const [flapCycle, setFlapCycle] = useState(0); // 0 to 4 for wing angles
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const levelUpTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSavedXPRef = useRef(false);

  // Allowed keys based on selection or level
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

  const getNextWord = () => {
    let wordText = '';

    if (allowedSet && allowedLettersArray.length > 0) {
      const filterList = (list: string[]) => 
        list.filter(w => w.toLowerCase().split('').every(c => allowedSet.has(c)));

      const filteredShort = filterList(GAME_WORDS_SHORT);
      const filteredMedium = filterList(GAME_WORDS_MEDIUM);
      const filteredLong = filterList(GAME_WORDS_LONG);

      let combined = [...filteredShort];
      if (gameLevel >= 3) combined = [...combined, ...filteredMedium];
      if (gameLevel >= 6) combined = [...combined, ...filteredLong];

      if (combined.length >= 5) {
        wordText = combined[Math.floor(Math.random() * combined.length)];
      } else {
        const len = 3 + Math.floor(Math.random() * 4);
        let generated = '';
        for (let i = 0; i < len; i++) {
          generated += allowedLettersArray[Math.floor(Math.random() * allowedLettersArray.length)];
        }
        wordText = generated;
      }
    } else {
      let wordList = GAME_WORDS_SHORT;
      if (gameLevel >= 3 && gameLevel < 6) {
        wordList = Math.random() > 0.4 ? GAME_WORDS_MEDIUM : GAME_WORDS_SHORT;
      } else if (gameLevel >= 6) {
        const rand = Math.random();
        wordList = rand > 0.6 ? GAME_WORDS_LONG : rand > 0.2 ? GAME_WORDS_MEDIUM : GAME_WORDS_SHORT;
      }
      wordText = wordList[Math.floor(Math.random() * wordList.length)];
    }

    return wordText;
  };

  const spawnPipe = () => {
    setPipes(prev => {
      // Check if last spawned pipe is far enough
      if (prev.length > 0 && prev[prev.length - 1].x > 62) {
        return prev;
      }
      const text = getNextWord();
      
      // Speed starts slow (0.4) and increases slightly per level
      const speed = 0.38 + gameLevel * 0.04 + Math.random() * 0.04;
      
      // Random gap Y position (middle center) between 90px and 210px in 300px height
      const gapY = 90 + Math.floor(Math.random() * 120);
      
      // Gap size gets slightly smaller as level increases (from 105 down to 80)
      const gapSize = Math.max(80, 105 - gameLevel * 3);

      const newPipe: FlappyPipe = {
        id: Math.random().toString(36).substring(2, 9),
        text,
        x: 100,
        gapY,
        gapSize,
        speed,
        isCleared: false,
        isTyped: false
      };
      return [...prev, newPipe];
    });
  };

  const startGame = () => {
    setGameState('playing');
    setPipes([]);
    setScore(0);
    setLives(3);
    setGameLevel(1);
    setInputValue('');
    setXpEarned(0);
    setTotalWordsTyped(0);
    setIsPaused(false);
    setBirdY(160);
    setBirdTargetY(160);
    setIsFlapping(false);
    setFlapCycle(0);
    setIsScreenShaking(false);
    hasSavedXPRef.current = false;
    
    // Spawn initial pipe after 1s
    setTimeout(spawnPipe, 1000);
  };

  // Focus input field automatically
  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      inputRef.current?.focus();
    }
  }, [gameState, isPaused]);

  // Game loop (physics & pipes position updates)
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      return;
    }

    // Spawn pipes timer (every 2.8s)
    spawnTimerRef.current = window.setInterval(spawnPipe, 2800);

    // Frame update loop (30ms = 33 FPS)
    gameLoopRef.current = window.setInterval(() => {
      // 1. Bird float/sine wave bobbing or swoop transition
      setBirdY(currY => {
        // Smooth exponential interpolation to target Y
        const nextY = currY * 0.82 + birdTargetY * 0.18;
        return nextY;
      });

      // Wing flapping animation cycle
      setFlapCycle(fc => {
        if (isFlapping) {
          const next = (fc + 1) % 5;
          if (next === 0) setIsFlapping(false);
          return next;
        }
        // If just floating, flap slowly
        return (fc + 0.15) % 5;
      });

      // 2. Process pipes movement and collision detection
      setPipes(prev => {
        let hit = false;

        const updated = prev.map(p => {
          const nextX = p.x - p.speed;

          // Collision Check
          // Player is at X = 15%. Pipe collides between X = 12% and X = 18%
          if (nextX <= 18 && nextX >= 12 && !p.isCleared) {
            // Check if pipe was successfully typed before passing
            if (!p.isTyped) {
              hit = true;
            }
            p.isCleared = true; // Mark as cleared so we don't hit again or check collision anymore
          }
          return { ...p, x: nextX };
        }).filter(p => p.x > 0);

        if (hit) {
          sounds.playError();
          setIsScreenShaking(true);
          setTimeout(() => setIsScreenShaking(false), 200);
          setLives(l => {
            const nextL = l - 1;
            if (nextL <= 0) {
              setGameState('gameover');
              return 0;
            }
            return nextL;
          });
        }

        return updated;
      });
    }, 30);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameState, isPaused, birdTargetY, birdY, isFlapping]);

  // Handle XP saving on Game Over
  useEffect(() => {
    if (gameState === 'gameover' && !hasSavedXPRef.current) {
      hasSavedXPRef.current = true;
      const finalXP = xpEarned + (score > 150 ? 20 : 5);
      addGameXP(finalXP);
    }
  }, [gameState, xpEarned, score, addGameXP]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPaused) return;
    const value = e.target.value;
    setInputValue(value);

    // Find the closest active uncleared and untyped pipe
    const activePipe = pipes.find(p => !p.isCleared && !p.isTyped && p.x > 18);
    if (!activePipe) return;

    const normalizedVal = value.trim();
    if (normalizedVal === activePipe.text) {
      // Word typed correctly! Swoop bird to the pipe gap height!
      sounds.playClick();
      setInputValue('');
      setBirdTargetY(activePipe.gapY);
      setIsFlapping(true);

      // Immediately hide the word from screen by marking it typed
      setPipes(prev => prev.map(p => p.id === activePipe.id ? { ...p, isTyped: true } : p));

      setScore(s => s + activePipe.text.length * 10);
      setTotalWordsTyped(t => {
        const next = t + 1;
        // Level up every 10 words
        if (next % 10 === 0) {
          setGameLevel(gl => {
            const nextLevel = gl + 1;
            setShowLevelUpMessage(true);
            sounds.playSuccess();
            if (levelUpTimerRef.current) clearTimeout(levelUpTimerRef.current);
            levelUpTimerRef.current = window.setTimeout(() => {
              setShowLevelUpMessage(false);
            }, 2000);
            return nextLevel;
          });
        }
        return next;
      });

      // Earn XP based on word length
      const gainedXP = Math.round(activePipe.text.length * 1.5);
      setXpEarned(prev => prev + gainedXP);
    }
  };

  // Helper to render colored characters for matching inputs
  const renderTargetWordText = (pipe: FlappyPipe) => {
    const isClosest = pipes.find(p => !p.isCleared && !p.isTyped && p.x > 18)?.id === pipe.id;
    const trimmedInput = inputValue.trim();

    if (isClosest && trimmedInput.length > 0 && pipe.text.startsWith(trimmedInput)) {
      const matchLen = trimmedInput.length;
      const matchedPart = pipe.text.slice(0, matchLen);
      const remainingPart = pipe.text.slice(matchLen);
      return (
        <span className="font-mono text-xs md:text-sm font-extrabold uppercase tracking-widest">
          <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">{matchedPart}</span>
          <span className="text-zinc-200">{remainingPart}</span>
        </span>
      );
    }

    return (
      <span className="font-mono text-xs md:text-sm font-extrabold uppercase tracking-widest text-zinc-100">
        {pipe.text}
      </span>
    );
  };

  // SVG wing rotation angle based on flap cycle
  const getWingTransform = () => {
    const cycle = Math.floor(flapCycle);
    const angles = [0, -25, -45, -20, 15]; // wing stroke angles
    return `rotate(${angles[cycle] || 0} -6 -4)`;
  };

  return (
    <div className={`w-full max-w-4xl mx-auto flex flex-col gap-6 select-none relative transition-all duration-75 ${
      isScreenShaking ? 'translate-x-1 translate-y-0.5' : ''
    }`}>
      {/* Custom styles for background scrolling */}
      <style>{`
        @keyframes scrollSkyline {
          0% { background-position-x: 0px; }
          100% { background-position-x: -300px; }
        }
        .animate-skyline {
          animation: scrollSkyline 15s linear infinite;
        }
      `}</style>

      {/* Game Header Panel */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider text-emerald-500 uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center gap-1 w-fit">
            <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
            <span>Ciyaar: Flappy Type</span>
          </span>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mt-2">
            Flappy Type (Ciyaarta Bimbilaha)
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Qor ereyada saaran dhuumaha si aad bimbilaha ugu hagto meelaha banaan!
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

      {/* Start screen (Lobby) */}
      {gameState === 'start' && (
        <div className="w-full flex flex-col items-center justify-center p-12 py-16 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 shadow-xl text-center gap-6 overflow-hidden relative">
          {/* Synthwave visual background grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_70%,#1e1b4b_100%)] opacity-30 pointer-events-none" />
          
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/25 z-10 animate-bounce">
            <ArrowUp className="w-12 h-12" />
          </div>
          <h3 className="text-3xl font-extrabold text-white z-10 font-sans tracking-tight">Ku soo dhowow Flappy Type!</h3>
          <p className="text-sm text-zinc-400 max-w-lg leading-relaxed z-10">
            Dhuumo cagaar ah oo ka yimaada kor iyo hoos ayaa ku soo socda. Bimbilaha bulshada ee Soomaaliya waa inuu dhex maro meelaha banaan. Qor ereyada saaran dhuumaha si uu bimbiluhu ugu duulo meelaha banaan!
          </p>

          {/* Key Selection for Lobby */}
          {!levelFilter && user && (
            <div className="flex flex-col gap-1 items-center w-64 bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800 z-10">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ereyada Casharka:</span>
              <div className="flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 w-full mt-1">
                <button
                  onClick={() => setDifficultyMode('all')}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
                    difficultyMode === 'all'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  Dhamaan Ereyada
                </button>
                <button
                  onClick={() => setDifficultyMode('current')}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
                    difficultyMode === 'current'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  Heerka {user.currentLevel}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/35 transition-all active:scale-[0.98] mt-2 text-base z-10 border-b-4 border-emerald-800 active:border-b-0"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Bilaaw Ciyaarta</span>
          </button>
        </div>
      )}

      {/* Active gameplay display */}
      {gameState === 'playing' && (
        <div className="w-full flex flex-col gap-4 relative" onClick={() => inputRef.current?.focus()}>
          {/* Game Stats HUD */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Score</span>
              <span className="text-2xl font-extrabold text-emerald-500 mt-0.5 font-mono">{score}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Level (Heerka)</span>
              <span className="text-2xl font-extrabold text-amber-500 mt-0.5 font-mono">{gameLevel}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">XP la Kasbaday</span>
              <span className="text-2xl font-extrabold text-cyan-500 mt-0.5 font-mono">+{xpEarned} XP</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Lives (Nafaha)</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(h => (
                  <Heart
                    key={h}
                    className={`w-5 h-5 ${h <= lives ? 'text-rose-500 fill-rose-500' : 'text-zinc-300 dark:text-zinc-700'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Level Up Flash Message */}
          {showLevelUpMessage && (
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-center text-sm font-bold flex items-center justify-center gap-2 animate-bounce">
              <Sparkles className="w-4 h-4" />
              <span>DHUUMAHA WAA LA SOO GABAGABEEYEY! Waxaad gaadhay Heerka {gameLevel}!</span>
            </div>
          )}

          {/* Scrolling Flappy Bird play board */}
          <div className="relative w-full h-[350px] rounded-3xl border border-zinc-350 dark:border-zinc-800 bg-zinc-950 overflow-hidden shadow-inner flex flex-col justify-end">
            
            {/* Parallax Skyline Backdrop scrolling */}
            <div 
              className="absolute inset-0 opacity-15 animate-skyline pointer-events-none" 
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 180px, #3b82f6 180px, #3b82f6 240px, transparent 240px)',
                backgroundSize: '300px 100%'
              }}
            />
            <div 
              className="absolute inset-x-0 top-1/2 bottom-0 opacity-10 animate-skyline pointer-events-none" 
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 80px, #10b981 80px, #10b981 120px, transparent 120px)',
                backgroundSize: '200px 100%',
                animationDirection: 'reverse',
                animationDuration: '25s'
              }}
            />

            {/* Stars background */}
            <div className="absolute inset-0 bg-[radial-gradient(#18181b_1.5px,transparent_1.5px)] bg-[size:30px_30px] opacity-40" />

            {/* SVG Render Layer for pipes and bird */}
            <svg viewBox="0 0 1000 320" className="absolute inset-0 w-full h-full pointer-events-none select-none" preserveAspectRatio="none">
              
              {/* Render oncoming vertical pipes */}
              {pipes.map(p => {
                const pipeWidth = 70;
                const halfGap = p.gapSize / 2;
                const topPipeHeight = p.gapY - halfGap;
                const bottomPipeY = p.gapY + halfGap;
                const bottomPipeHeight = 320 - bottomPipeY;
                const pipeLeft = (p.x / 100) * 1000 - pipeWidth / 2;

                return (
                  <g key={p.id}>
                    {/* Top Pipe */}
                    <rect x={pipeLeft} y={0} width={pipeWidth} height={topPipeHeight} fill="#22c55e" stroke="#15803d" strokeWidth="3" />
                    {/* Top Pipe Lip */}
                    <rect x={pipeLeft - 4} y={topPipeHeight - 20} width={pipeWidth + 8} height={20} fill="#4ade80" stroke="#15803d" strokeWidth="3" />
                    
                    {/* Bottom Pipe */}
                    <rect x={pipeLeft} y={bottomPipeY} width={pipeWidth} height={bottomPipeHeight} fill="#22c55e" stroke="#15803d" strokeWidth="3" />
                    {/* Bottom Pipe Lip */}
                    <rect x={pipeLeft - 4} y={bottomPipeY} width={pipeWidth + 8} height={20} fill="#4ade80" stroke="#15803d" strokeWidth="3" />

                    {/* Word Box background in the middle gap */}
                    {!p.isCleared && !p.isTyped && (
                      <g transform={`translate(${pipeLeft + pipeWidth / 2}, ${p.gapY})`}>
                        <rect x="-65" y="-16" width="130" height="32" rx="10" fill="#09090b" stroke="#3b82f6" strokeWidth="2" opacity="0.95" className="drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Player Somali Bird at X = 150 (15%) */}
              <g transform={`translate(150, ${birdY})`}>
                {/* Glowing Bird Body (Somali Blue) */}
                <circle cx="0" cy="0" r="18" fill="#3b82f6" stroke="#93c5fd" strokeWidth="2" className="drop-shadow-[0_0_12px_rgba(59,130,246,0.85)]" />
                {/* Five-pointed White Star in center */}
                <polygon 
                  points="0,-8 2.5,-3 8,-3 3.5,-1 5,4 0,1 -5,4 -3.5,-1 -8,-3 -2.5,-3" 
                  fill="#ffffff" 
                  transform="scale(0.8)"
                />

                {/* Beak */}
                <polygon points="16,-6 24,-1 16,4" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                
                {/* Big cute cartoon eye */}
                <circle cx="8" cy="-5" r="4.5" fill="#ffffff" />
                <circle cx="9" cy="-5" r="2" fill="#000000" />
                <circle cx="10" cy="-6.5" r="0.8" fill="#ffffff" />

                {/* Back tail feather */}
                <path d="M -18 -3 L -26 -10 L -22 -1 L -26 6 Z" fill="#2563eb" />

                {/* Animated Flapping Wing */}
                <path d="M -8 -4 Q -16 -24 -2 -12 Q -4 6 -8 -4" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1" transform={getWingTransform()} />
              </g>
            </svg>

            {/* Word Texts Overlay Layer (to support DOM-based HTML typography for clarity) */}
            {pipes.map(p => {
              if (p.isCleared || p.isTyped) return null;

              return (
                <div 
                  key={p.id}
                  className="absolute pointer-events-none select-none flex items-center justify-center"
                  style={{
                    left: `${p.x}%`,
                    top: `${(p.gapY / 320) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 25
                  }}
                >
                  {renderTargetWordText(p)}
                </div>
              );
            })}

            {/* HUD overlays inside box */}
            {/* Pause button top-left */}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPaused(true); }}
              className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded bg-white hover:bg-zinc-100 border border-zinc-350 text-xs font-bold text-zinc-800 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Pause
            </button>
          </div>

          {/* Typing Input Box Control */}
          <div className="w-full flex flex-col items-center gap-2 mt-2">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                autoFocus
                ref={inputRef}
                placeholder="Halkan ku qor..."
                value={inputValue}
                onChange={handleInputChange}
                className="w-full py-3.5 px-6 rounded-2xl text-center text-lg font-mono font-bold tracking-wide border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-zinc-400 dark:placeholder-zinc-650"
              />
            </div>
          </div>

          {/* Pause overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-zinc-955/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 rounded-3xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-3xl font-black italic text-emerald-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                CIYAARTA WAA LA HAKIYEY
              </h3>
              <p className="text-xs text-zinc-300 max-w-xs text-center -mt-1 leading-relaxed">
                Bimbilihii waa istaagay. Si aad u sii waddo ciyaarta, guji "Sii Bilow" ama riix ESC.
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
          {lives > 0 || score > 150 ? (
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/25 animate-bounce">
              <Award className="w-12 h-12" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/25">
              <ShieldAlert className="w-12 h-12" />
            </div>
          )}

          <div>
            <h3 className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 font-sans tracking-tight">
              {score > 150 ? "Guul Baad Gaadhay! (You Passed!)" : "Waa Lagaa Adkaaday!"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
              {score > 150 
                ? `Hambalyo! Waxaad heshay dhibco dhan ${score}. Waxaad heshay +20 XP!`
                : "Waa lagaa adkaaday. Qor ereyada ka hor intaanay caqabaduhu kugu dhicin si aad u booddo!"}
            </p>
          </div>

          {/* Metric details cards */}
          <div className="w-full max-w-md grid grid-cols-3 gap-3 border-t border-b border-zinc-100 dark:border-zinc-800 py-6 font-mono text-zinc-550 dark:text-zinc-400 my-2">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Dhibcaha</span>
              <span className="text-xl font-extrabold text-emerald-500">{score}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Ereyo la saxay</span>
              <span className="text-xl font-extrabold text-amber-500">{totalWordsTyped}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">XP la Kasbaday</span>
              <span className="text-xl font-extrabold text-cyan-500">+{xpEarned + (score > 150 ? 20 : 5)} XP</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Dib u Bilow</span>
            </button>
            <button
              onClick={onBackToSelector}
              className="px-6 py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Ku noqo Ciyaaraha</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JumpGame;
