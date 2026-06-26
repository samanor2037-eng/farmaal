import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import sounds from '../utils/soundEffects';
import { Play, RotateCcw, Home, Award, Heart, ShieldAlert, Sparkles, Volume2, VolumeX, Gamepad2, Timer, Car, ArrowUp, Lock, Target } from 'lucide-react';
import TimeAttackGame from './TimeAttackGame';
import CarRacingGame from './CarRacingGame';
import JumpGame from './JumpGame';
import ZombieGame from './ZombieGame.tsx';
import CombatGame from './CombatGame';

interface GameWord {
  id: string;
  text: string;
  x: number; // percentage from left, e.g. 5 to 85
  y: number; // percentage from top, e.g. 0 to 100
  speed: number;
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

interface WordRainGameProps {
  onBackToSelector: () => void;
  levelFilter?: { id: number; text: string; title: string } | null;
  nextLevelId?: number | null;
  onStartNextLevel?: (nextLevelId: number) => void;
}

const WordRainGame: React.FC<WordRainGameProps> = ({ onBackToSelector, levelFilter, nextLevelId, onStartNextLevel }) => {
  const { addGameXP, isMuted, toggleMute } = useAuth();
  
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [words, setWords] = useState<GameWord[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameLevel, setGameLevel] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [totalWordsDestroyed, setTotalWordsDestroyed] = useState(0);
  const [showLevelUpMessage, setShowLevelUpMessage] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const levelUpTimerRef = useRef<number | null>(null);
  const hasSavedXPRef = useRef(false);

  // Extract unique letters from levelFilter based on strict key group boundary definitions
  const allowedSet = React.useMemo(() => {
    if (!levelFilter) return null;
    return getCheckpointAllowedKeys(levelFilter.id);
  }, [levelFilter]);

  const allowedLettersArray = React.useMemo(() => {
    if (!allowedSet) return [];
    return Array.from(allowedSet);
  }, [allowedSet]);

  // Spawns a new random word depending on level
  const spawnWord = () => {
    let wordText = '';

    if (allowedSet && allowedLettersArray.length > 0) {
      // Filter words based on characters in the level text
      const filterList = (list: string[]) => 
        list.filter(w => w.toLowerCase().split('').every(c => allowedSet.has(c)));

      const filteredShort = filterList(GAME_WORDS_SHORT);
      const filteredMedium = filterList(GAME_WORDS_MEDIUM);
      const filteredLong = filterList(GAME_WORDS_LONG);

      let combined = [...filteredShort];
      if (gameLevel >= 3) combined = [...combined, ...filteredMedium];
      if (gameLevel >= 6) combined = [...combined, ...filteredLong];

      // If we have enough pre-defined words, pick one. Otherwise generate a custom practice word.
      if (combined.length >= 5) {
        wordText = combined[Math.floor(Math.random() * combined.length)];
      } else {
        const len = 3 + Math.floor(Math.random() * 4); // word length 3-6
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

    const xPos = 5 + Math.random() * 80; // keep within 5% to 85% range
    // Base speed increases with game level
    const baseSpeed = 0.8 + gameLevel * 0.2;
    const speed = baseSpeed + Math.random() * 0.4; // slight random variation

    const newWord: GameWord = {
      id: Math.random().toString(36).substring(2, 9),
      text: wordText,
      x: xPos,
      y: 0,
      speed
    };

    setWords(prev => [...prev, newWord]);
  };

  // Start the game
  const startGame = () => {
    setGameState('playing');
    setWords([]);
    setScore(0);
    setLives(3);
    setGameLevel(1);
    setInputValue('');
    setTotalWordsDestroyed(0);
    setShowLevelUpMessage(false);
    hasSavedXPRef.current = false;
  };

  // Main gameplay loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      return;
    }

    // Spawning timer
    const spawnInterval = Math.max(1200, 3000 - gameLevel * 200);
    spawnTimerRef.current = window.setInterval(spawnWord, spawnInterval);

    // Physics / movement timer
    gameLoopRef.current = window.setInterval(() => {
      setWords(prev => {
        let hitBottomCount = 0;
        const updated = prev.map(w => {
          const nextY = w.y + w.speed;
          if (nextY >= 100) {
            hitBottomCount++;
          }
          return { ...w, y: nextY };
        }).filter(w => w.y < 100);

        if (hitBottomCount > 0) {
          sounds.playError();
          setLives(l => {
            const nextL = l - hitBottomCount;
            if (nextL <= 0) {
              setGameState('gameover');
              return 0;
            }
            return nextL;
          });
        }
        return updated;
      });
    }, 50);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameState, gameLevel]);

  // Handle XP saving on Game Over
  useEffect(() => {
    if (gameState === 'gameover' && !hasSavedXPRef.current) {
      hasSavedXPRef.current = true;
      addGameXP(0);
    }
  }, [gameState, lives, addGameXP]);

  // Input checking
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check if the typed word matches any active falling word exactly (case sensitive)
    const normalizedVal = value.trim();
    const matchedWord = words.find(w => w.text === normalizedVal);

    if (matchedWord) {
      // Destroy the word!
      sounds.playClick();
      setWords(prev => prev.filter(w => w.id !== matchedWord.id));
      setInputValue('');
      setScore(prev => prev + matchedWord.text.length * 10);
      setTotalWordsDestroyed(prev => {
        const nextDestroyed = prev + 1;
        // Level up every 10 words
        if (nextDestroyed % 10 === 0) {
          setGameLevel(gl => {
            const nextLevel = gl + 1;
            setShowLevelUpMessage(true);
            sounds.playSuccess();
            // Hide level up message after 2 seconds
            if (levelUpTimerRef.current) clearTimeout(levelUpTimerRef.current);
            levelUpTimerRef.current = window.setTimeout(() => {
              setShowLevelUpMessage(false);
            }, 2000);
            return nextLevel;
          });
        }
        return nextDestroyed;
      });
    }
  };

  // Helper to determine letter styles inside falling words
  const renderWordText = (word: GameWord) => {
    const isTypingMatch = inputValue.trim().length > 0 && word.text.startsWith(inputValue.trim());
    if (isTypingMatch) {
      const matchLen = inputValue.trim().length;
      const matchedPart = word.text.slice(0, matchLen);
      const remainingPart = word.text.slice(matchLen);
      return (
        <span className="font-mono text-sm md:text-base font-bold tracking-wide">
          <span className="text-emerald-400 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">{matchedPart}</span>
          <span className="text-zinc-100">{remainingPart}</span>
        </span>
      );
    }
    return <span className="font-mono text-sm md:text-base font-bold text-zinc-100 tracking-wide">{word.text}</span>;
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 select-none">
      {/* Game Header Panel */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider text-indigo-500 uppercase px-2.5 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15">
            {levelFilter ? `Ku Celis: Casharka ${levelFilter.id}` : 'Game Tababar (Typing Game)'}
          </span>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mt-2">
            Word Rain {levelFilter && ` - ${levelFilter.title}`}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {levelFilter 
              ? `Ereyada waxay ka kooban yihiin xarfaha casharka oo kaliya: ${allowedLettersArray.join(', ').toUpperCase()}`
              : 'Qor ereyada si aad uga ilaaliso inay hoos u dhacaan!'}
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
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/25">
            <Sparkles className="w-12 h-12 animate-pulse" />
          </div>
          <h3 className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100">Ku soo dhowow Word Rain!</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed">
            Ereyo Soomaali ah ayaa ka soo dhici doona sare ee muraayada. Qor erey walba ka dibna taabo badhanka <strong>Space</strong> ama <strong>Enter</strong> si aad u baabi'iso kahor intaanay dhulka taaban. Waxaad kasban doontaa dhibco!
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/35 transition-all active:scale-[0.98] mt-2 text-base"
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
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Dhibcaha (Score)</span>
              <span className="text-2xl font-extrabold text-indigo-500 mt-0.5 font-mono">{score}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Guusha (Level)</span>
              <span className="text-2xl font-extrabold text-amber-500 mt-0.5 font-mono">Casharka {gameLevel}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Nafaha (Lives)</span>
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
              <span>Digniin: Xawaaruhu wuu kordhay! Waxaad gaadhay Casharka {gameLevel}!</span>
            </div>
          )}

          {/* Play Board Area */}
          <div className="relative w-full h-[400px] rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-slate-950 overflow-hidden shadow-inner">
            {/* Twinkling background stars */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Falling Words pills */}
            {words.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
                U diyaargarow ereyo soo socda...
              </div>
            ) : (
              words.map(w => (
                <div
                  key={w.id}
                  className="absolute px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-950/45 text-white shadow-lg transition-all duration-75 flex items-center justify-center select-none"
                  style={{
                    left: `${w.x}%`,
                    top: `${w.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {renderWordText(w)}
                </div>
              ))
            )}

            {/* Red alert baseline zone warning */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-t from-red-600/35 to-transparent border-t border-red-500/20" />
          </div>

          {/* Input text box control */}
          <div className="w-full flex justify-center items-center mt-2">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                autoFocus
                placeholder="Halkan ku qor ereyada..."
                value={inputValue}
                onChange={handleInputChange}
                className="w-full py-3.5 px-6 rounded-2xl text-center text-lg font-mono font-bold tracking-wide border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-zinc-400 dark:placeholder-zinc-650"
              />
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen overlay */}
      {gameState === 'gameover' && (
        <div className="w-full flex flex-col items-center justify-center p-12 py-16 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16171d] shadow-2xl text-center gap-6 animate-fade-in">
          {lives === 3 ? (
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/25">
              <Award className="w-12 h-12" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/25">
              <ShieldAlert className="w-12 h-12" />
            </div>
          )}

          <div>
            <h3 className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 font-sans tracking-tight">
              {lives === 3 ? "Guul Baad Gaadhay! (Perfect Pass)" : "Waa Lagaa Adkaaday!"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
              {lives === 3 
                ? "Hambalyo! Waxaad ku gudubtay 3-Naf oo dhamaystiran."
                : "Waa inaad game-ka ku dhamaysataa 3-Naf (lives) si aad u gudubto casharka xiga."}
            </p>
          </div>

          {/* Metric details cards */}
          <div className="w-full max-w-md grid grid-cols-2 gap-3 border-t border-b border-zinc-100 dark:border-zinc-800 py-6 font-mono text-zinc-550 dark:text-zinc-400 my-2">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Dhibcaha</span>
              <span className="text-xl font-extrabold text-indigo-500">{score}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Ereyo la saaray</span>
              <span className="text-xl font-extrabold text-amber-500">{totalWordsDestroyed}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Dib u Bilow</span>
            </button>
            {nextLevelId && lives === 3 ? (
              <button
                onClick={() => onStartNextLevel && onStartNextLevel(nextLevelId)}
                className="px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
              >
                <span>Bilow Casharka {nextLevelId}</span>
              </button>
            ) : (
              <button
                onClick={onBackToSelector}
                className="px-6 py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all active:scale-[0.98]"
              >
                <span>Ku noqo Casharada</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface GameDashboardProps {
  onSelectGame: (game: 'wordrain' | 'timeattack' | 'carracing' | 'jump' | 'zombie' | 'combat') => void;
  onBack: () => void;
}

const GameDashboard: React.FC<GameDashboardProps> = ({ onSelectGame, onBack }) => {
  const { user } = useAuth();
  const currentLevel = user ? user.currentLevel : 1;

  const games = [
    {
      id: 'wordrain' as const,
      title: 'Word Rain',
      description: "Ereyo Soomaali ah ayaa ka soo dhici doona sare ee muraayada. Qor ereyada si aad u baabi'iso kahor intaanay dhulka taaban.",
      unlockLevel: 16,
      badgeText: 'Classic',
      icon: <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />,
      themeColor: 'indigo',
      bgImage: '/images/word_rain_bg.png',
      badges: [
        '🎯 Saxnaan (Accuracy)',
        '❤️ 3 Naf (3 Lives)',
        '🌧️ Classic Game'
      ],
      buttonText: 'Bilaaw Word Rain'
    },
    {
      id: 'jump' as const, // Flappy Type
      title: 'Flappy Type',
      description: 'U caawi Flappy Type-ka inuu dhex maro dhuumaha cagaaran! Qor ereyada ku yaal dhuumaha si aad ugu duusho meelaha banaan.',
      unlockLevel: 31,
      badgeText: 'New',
      icon: <ArrowUp className="w-6 h-6 group-hover:scale-110 transition-transform" />,
      themeColor: 'emerald',
      bgImage: '/images/flappy_type_bg.png',
      badges: [
        '🐦 Flappy',
        '⚡ Xawaare (Speed)',
        '🔥 Fikir Degdeg ah'
      ],
      buttonText: 'Bilaaw Flappy Type'
    },
    {
      id: 'timeattack' as const,
      title: 'Time Attack',
      description: 'Ku bilaaw 30 ilbiriqsi. Qor ereyada bartamaha goobta baarista si aad u hesho waqti dheeri ah (+2s). Kobci multiplier-ka adoo ilaalinaya streak-ga!',
      unlockLevel: 46,
      badgeText: 'Speed',
      icon: <Timer className="w-6 h-6 group-hover:scale-110 transition-transform" />,
      themeColor: 'cyan',
      bgImage: '/images/time_attack_bg.png',
      badges: [
        '⚡ Xawaare (Speed)',
        '⏳ 30s + 2s Bonus',
        '🔥 Multipliers'
      ],
      buttonText: 'Bilaaw Time Attack'
    },
    {
      id: 'carracing' as const,
      title: 'Car Racing',
      description: 'Waa tartan 500 oo mitir ah oo aad la galayso cid kula tartamaysa. Erey kasta oo sax ah wuxuu kordhinayaa xawaaraha baabuurkaaga. Hel Nitro Boost si aad u dhaafto!',
      unlockLevel: 61,
      badgeText: 'Racing',
      icon: <Car className="w-6 h-6 group-hover:scale-110 transition-transform" />,
      themeColor: 'rose',
      bgImage: '/images/car_racing_bg.png',
      badges: [
        '🏁 Tartan (Racing)',
        '⚡ Xawaare (WPM)',
        '🔥 Nitro Boost'
      ],
      buttonText: 'Bilaaw Car Racing'
    },
    {
      id: 'zombie' as const,
      title: 'Z-Gunner',
      description: 'Mowjadaha zombie-ga ka badbaad! Qor ereyada ka sarreeya zombie-yada si aad u toogato bistoolad oo aad u disho kahor intaanay ku soo gaadhin.',
      unlockLevel: 76,
      badgeText: 'Action',
      icon: <Gamepad2 className="w-6 h-6 group-hover:scale-110 transition-transform" />,
      themeColor: 'emerald',
      bgImage: '/images/zombie_game_bg.png',
      badges: [
        '🧟 Toogasho (Shooter)',
        '❤️ 5 Naf (5 Hearts)',
        '🔫 Toos u Qorista'
      ],
      buttonText: 'Bilaaw Z-Gunner'
    },
    {
      id: 'combat' as const,
      title: 'Farmaal Combat',
      description: 'Difaac magaalada adoo isticmaalaya madfaca lidka diyaaradaha! Qor ereyada ku yaal diyaaradaha dagaalka si aad u qufulayso gantaalaha kuleylka-raaca.',
      unlockLevel: 91,
      badgeText: 'FPP Combat',
      icon: <Target className="w-6 h-6 group-hover:scale-110 transition-transform" />,
      themeColor: 'red',
      bgImage: '/images/combat_game_bg.png',
      badges: [
        '🚀 Homing Missiles',
        '🔥 Kulaylka Autocannon-ka',
        '💥 Qaraxyo Canvas ah'
      ],
      buttonText: 'Bilaaw Combat'
    }
  ];

  const colorSchemes = {
    indigo: {
      border: 'border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/30',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]',
      glow: 'from-indigo-600/10 to-transparent',
      badge: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
      tag: 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-300 border border-indigo-500/10 dark:border-indigo-500/15',
      button: 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/20 hover:shadow-indigo-500/40 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]',
      topLine: 'bg-gradient-to-r from-transparent via-indigo-500 to-transparent'
    },
    emerald: {
      border: 'border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      glow: 'from-emerald-600/10 to-transparent',
      badge: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      tag: 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-300 border border-emerald-500/10 dark:border-emerald-500/15',
      button: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/20 hover:shadow-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]',
      topLine: 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent'
    },
    cyan: {
      border: 'border-zinc-200 dark:border-zinc-800/80 hover:border-cyan-500/40 dark:hover:border-cyan-500/30',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
      glow: 'from-cyan-600/10 to-transparent',
      badge: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
      tag: 'bg-cyan-500/5 text-cyan-600 dark:text-cyan-300 border border-cyan-500/10 dark:border-cyan-500/15',
      button: 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-cyan-600/20 hover:shadow-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]',
      topLine: 'bg-gradient-to-r from-transparent via-cyan-500 to-transparent'
    },
    rose: {
      border: 'border-zinc-200 dark:border-zinc-800/80 hover:border-rose-500/40 dark:hover:border-rose-500/30',
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
      glow: 'from-rose-600/10 to-transparent',
      badge: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      tag: 'bg-rose-500/5 text-rose-600 dark:text-rose-300 border border-rose-500/10 dark:border-rose-500/15',
      button: 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-600/20 hover:shadow-rose-500/40 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]',
      topLine: 'bg-gradient-to-r from-transparent via-rose-500 to-transparent'
    },
    red: {
      border: 'border-zinc-200 dark:border-zinc-800/80 hover:border-red-500/40 dark:hover:border-red-500/30',
      iconBg: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
      glow: 'from-red-600/10 to-transparent',
      badge: 'bg-red-500/10 text-red-500 border border-red-500/20',
      tag: 'bg-red-500/5 text-red-600 dark:text-red-300 border border-red-500/10 dark:border-red-500/15',
      button: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-600/20 hover:shadow-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]',
      topLine: 'bg-gradient-to-r from-transparent via-red-500 to-transparent'
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 py-4 select-none">
      {/* Title section with Premium Design */}
      <div className="relative text-center flex flex-col items-center gap-2 py-6 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-550/5 dark:bg-indigo-550/10 rounded-full blur-3xl pointer-events-none" />

        {/* Beautiful Badge */}
        <span className="text-[10px] bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-1 shadow-sm border border-indigo-500/10">
          Madadaalo & Tababar (Fun & Practice)
        </span>

        {/* Beautiful Icon Container */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/5 flex items-center justify-center text-indigo-500 border border-indigo-500/20 mb-2 shadow-lg shadow-indigo-500/5 hover:scale-105 transition-transform duration-300">
          <Gamepad2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
        </div>

        {/* Gradient Title */}
        <h2 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          FARMAAL Games
        </h2>

        {/* Subtitle / Description */}
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed mt-1">
          Dooro Game-yada hoose si aad u tijaabiso ama u kordhiso xawaarahaaga iyo saxnaantaada qorista Af-Soomaaliga.
        </p>
      </div>

      {/* Cards container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
        {games.map(game => {
          const isLocked = currentLevel < game.unlockLevel;
          const colors = colorSchemes[game.themeColor as keyof typeof colorSchemes];

          return (
            <div 
              key={game.id}
              onClick={isLocked ? undefined : () => onSelectGame(game.id)}
              className={`group flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden ${
                isLocked 
                  ? 'border-zinc-200/80 dark:border-zinc-800/80 shadow-sm opacity-90 dark:opacity-85' 
                  : 'hover:shadow-2xl cursor-pointer hover:-translate-y-1.5 ' + colors.border
              } bg-white dark:bg-zinc-950`}
            >
              {/* Card Header (Image section) */}
              <div className="relative h-44 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                <img 
                  src={game.bgImage} 
                  alt={game.title} 
                  className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                    isLocked ? 'grayscale opacity-60' : 'opacity-95 group-hover:opacity-100'
                  }`}
                />

                {/* Glowing Top Line overlay */}
                {!isLocked && (
                  <div className={`absolute top-0 inset-x-0 h-[3px] opacity-70 z-10 ` + colors.topLine} />
                )}

                {/* Locked overlay badge over image */}
                {isLocked && (
                  <div className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/95 dark:bg-zinc-900/90 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-md">
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Body (Content section) */}
              <div className="p-6 flex-1 flex flex-col justify-between relative">
                {/* Decorative dynamic neon glow inside card on hover */}
                {!isLocked && (
                  <div className={`absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-gradient-to-br filter blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ` + colors.glow} />
                )}

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 flex-shrink-0 ` + colors.iconBg}>
                      {game.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                        {game.title}
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded-full uppercase tracking-wider ` + colors.badge}>
                          {game.badgeText}
                        </span>
                      </h3>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium line-clamp-3">
                      {game.description}
                    </p>
                  </div>

                  {/* Badges/Tags */}
                  <div className="flex gap-1.5 flex-wrap">
                    {game.badges.map((b, idx) => (
                      <span key={idx} className={`px-2 py-0.5 text-[9px] font-bold rounded-lg ` + colors.tag}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {isLocked ? (
                  <div className="w-full mt-6 py-3 rounded-2xl text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-0.5 select-none">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-zinc-700 dark:text-zinc-200">
                      <Lock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      Game-ku waa xidhan yahay
                    </span>
                    <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium">
                      Waa inaad gaadhaa Casharka {game.unlockLevel}
                    </span>
                  </div>
                ) : (
                  <button className={`w-full mt-6 py-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all duration-300 group-hover:scale-[1.01] ` + colors.button}>
                    {game.buttonText}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Exits */}
      <div className="flex justify-center mt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sm font-semibold rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all active:scale-[0.98]"
        >
          Ku noqo Casharada
        </button>
      </div>
    </div>
  );
};

interface TypingGameProps {
  onBackToSelector: () => void;
  levelFilter?: { id: number; text: string; title: string } | null;
  nextLevelId?: number | null;
  onStartNextLevel?: (nextLevelId: number) => void;
}

export const TypingGame: React.FC<TypingGameProps> = ({ 
  onBackToSelector, 
  levelFilter, 
  nextLevelId, 
  onStartNextLevel 
}) => {
  const [activeGame, setActiveGame] = useState<'wordrain' | 'timeattack' | 'carracing' | 'jump' | 'zombie' | 'combat' | null>(
    levelFilter ? 'wordrain' : null
  );

  // If levelFilter becomes active, immediately direct to wordrain game
  useEffect(() => {
    if (levelFilter) {
      setActiveGame('wordrain');
    }
  }, [levelFilter]);

  if (activeGame === 'wordrain') {
    return (
      <WordRainGame
        onBackToSelector={() => {
          if (levelFilter) {
            onBackToSelector();
          } else {
            setActiveGame(null);
          }
        }}
        levelFilter={levelFilter}
        nextLevelId={nextLevelId}
        onStartNextLevel={onStartNextLevel}
      />
    );
  }

  if (activeGame === 'timeattack') {
    return (
      <TimeAttackGame
        onBackToSelector={() => {
          setActiveGame(null);
        }}
        levelFilter={levelFilter}
      />
    );
  }

  if (activeGame === 'carracing') {
    return (
      <CarRacingGame
        onBackToSelector={() => {
          setActiveGame(null);
        }}
        levelFilter={levelFilter}
      />
    );
  }

  if (activeGame === 'jump') {
    return (
      <JumpGame
        onBackToSelector={() => {
          setActiveGame(null);
        }}
        levelFilter={levelFilter}
      />
    );
  }

  if (activeGame === 'zombie') {
    return (
      <ZombieGame
        onBackToSelector={() => {
          setActiveGame(null);
        }}
        levelFilter={levelFilter}
      />
    );
  }

  if (activeGame === 'combat') {
    return (
      <CombatGame
        onBackToSelector={() => {
          setActiveGame(null);
        }}
        levelFilter={levelFilter}
      />
    );
  }

  return (
    <GameDashboard
      onSelectGame={(game) => setActiveGame(game)}
      onBack={onBackToSelector}
    />
  );
};

export default TypingGame;
