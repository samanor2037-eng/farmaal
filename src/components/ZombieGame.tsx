import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import sounds from '../utils/soundEffects';
import { Play, RotateCcw, Home, Award, Heart, ShieldAlert, Volume2, VolumeX, Gamepad2 } from 'lucide-react';
import { GAME_WORDS_SHORT, GAME_WORDS_MEDIUM, GAME_WORDS_LONG } from '../data/gameWords';

interface Zombie {
  id: string;
  type: 'A' | 'B' | 'C' | 'D' | 'E'; // A = Punk, B = Screamer, C = Brute, D = Crawler, E = Ghost
  text: string;
  originalText: string;
  x: number; // percentage from left, 100 down to 0
  y: number; // vertical position percentage
  speed: number;
  health: number; // 1 for Type A, 2 for Type B
  maxHealth: number;
  isAttacking: boolean;
  isDying: boolean;
  deathTimer: number; // animation frame tracker
  walkCycle: number;
  direction: 'left-to-right' | 'right-to-left';
}

interface Bullet {
  id: string;
  x: number; // percentage
  y: number; // percentage
  targetX: number;
  targetY: number;
  targetZombieId: string;
  speed: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number; // percentage remaining
}

interface ZombieGameProps {
  onBackToSelector: () => void;
  levelFilter?: { id: number; text: string; title: string } | null;
}

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

// Selection of spooky wisdom phrases for UI elements (Middle-Right)
const QUOTE_PHRASES = [
  "Silence is a source of great strength.",
  "Type fast to survive the apocalypse.",
  "Keep your fingers on the home row.",
  "Type. Shoot. Survive. Repeat.",
  "Aim for the head with clear typing."
];

export const ZombieGame: React.FC<ZombieGameProps> = ({ onBackToSelector, levelFilter }) => {
  const { addGameXP, isMuted, toggleMute, user } = useAuth();

  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'gameover'>('start');
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5); // 5 hearts per GDD
  const [wave, setWave] = useState(1);
  const [killsInWave, setKillsInWave] = useState(0);
  const [neededKills, setNeededKills] = useState(10);
  const [inputValue, setInputValue] = useState('');
  const [activePhrase, setActivePhrase] = useState(QUOTE_PHRASES[0]);

  // Wave transition state
  const [waveTransition, setWaveTransition] = useState(false);
  const [showWaveSplash, setShowWaveSplash] = useState(false);

  // Player animations state
  const [playerAction, setPlayerAction] = useState<'idle' | 'shooting' | 'hurt'>('idle');
  const [gunAngle, setGunAngle] = useState(0); // angle to point towards the closest zombie

  // Difficulty/Filter modes
  const [difficultyMode, setDifficultyMode] = useState<'current' | 'all'>('all');

  const gameLoopRef = useRef<number | null>(null);
  const spawnIntervalRef = useRef<number | null>(null);
  const phraseIntervalRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSavedXPRef = useRef(false);

  // Computed allowed keys based on active lesson / current user progress
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

  const getNextWord = (isShort: boolean) => {
    let wordText = '';

    if (allowedSet && allowedLettersArray.length > 0) {
      const filterList = (list: string[]) => 
        list.filter(w => w.toLowerCase().split('').every(c => allowedSet.has(c)));

      const filteredShort = filterList(GAME_WORDS_SHORT);
      const filteredMedium = filterList(GAME_WORDS_MEDIUM);
      const filteredLong = filterList(GAME_WORDS_LONG);

      const combined = isShort ? [...filteredShort] : [...filteredMedium, ...filteredLong];
      const finalWordsList = combined.length >= 3 ? combined : (filteredShort.length >= 3 ? filteredShort : []);

      if (finalWordsList.length >= 3) {
        wordText = finalWordsList[Math.floor(Math.random() * finalWordsList.length)];
      } else {
        // Fallback procedural word generation
        const len = isShort ? 3 : 5 + Math.floor(Math.random() * 3);
        let generated = '';
        for (let i = 0; i < len; i++) {
          generated += allowedLettersArray[Math.floor(Math.random() * allowedLettersArray.length)];
        }
        wordText = generated;
      }
    } else {
      const wordList = isShort ? GAME_WORDS_SHORT : [...GAME_WORDS_MEDIUM, ...GAME_WORDS_LONG];
      wordText = wordList[Math.floor(Math.random() * wordList.length)];
    }

    return wordText;
  };

  // Spawns a zombie
  const spawnZombie = () => {
    if (gameState !== 'playing' || waveTransition) return;

    // Pick zombie type. A = Punk, B = Screamer, C = Brute, D = Crawler, E = Ghost.
    // Wave 1: A, B
    // Wave 2: A, B, C, D
    // Wave 3+: A, B, C, D, E
    let typePool: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B'];
    if (wave >= 2) {
      typePool.push('C', 'D');
    }
    if (wave >= 3) {
      typePool.push('E');
    }

    const type = typePool[Math.floor(Math.random() * typePool.length)];

    let health = 1;
    let isShortWord = true;
    let speedBase = 0.08;

    if (type === 'A') {
      health = 1;
      isShortWord = true;
      speedBase = 0.16;
    } else if (type === 'B') {
      health = 2;
      isShortWord = false;
      speedBase = 0.08;
    } else if (type === 'C') {
      health = 4; // High health brute
      isShortWord = false;
      speedBase = 0.04;
    } else if (type === 'D') {
      health = 1; // Crawler
      isShortWord = true;
      speedBase = 0.22;
    } else if (type === 'E') {
      health = 2; // Ghost
      isShortWord = false;
      speedBase = 0.10;
    }

    const wordText = getNextWord(isShortWord);
    const speed = speedBase + (wave * 0.012) + Math.random() * 0.02;
    const direction = Math.random() < 0.5 ? 'left-to-right' : 'right-to-left';
    const initialX = direction === 'left-to-right' ? -10 : 110;
    const initialY = type === 'D' ? 82 : 75; // Crawler is low to ground

    const newZombie: Zombie = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      text: wordText,
      originalText: wordText,
      x: initialX,
      y: initialY,
      speed,
      health,
      maxHealth: health,
      isAttacking: false,
      isDying: false,
      deathTimer: 0,
      walkCycle: Math.random() * 100,
      direction
    };

    setZombies(prev => {
      // Avoid duplication of typing text if possible
      const hasDupe = prev.some(z => z.text.toLowerCase() === wordText.toLowerCase() && !z.isDying);
      if (hasDupe) return prev;
      return [...prev, newZombie];
    });
  };

  // Start the game
  const startGame = () => {
    setGameState('playing');
    setZombies([]);
    setBullets([]);
    setParticles([]);
    setScore(0);
    setLives(5);
    setWave(1);
    setKillsInWave(0);
    setNeededKills(10);
    setInputValue('');
    setPlayerAction('idle');
    setWaveTransition(false);
    setShowWaveSplash(true);
    hasSavedXPRef.current = false;
    setTimeout(() => setShowWaveSplash(false), 2000);
  };

  // Handle XP saving on Game Over
  useEffect(() => {
    if (gameState === 'gameover' && !hasSavedXPRef.current) {
      hasSavedXPRef.current = true;
      addGameXP(0);
    }
  }, [gameState, score, addGameXP]);

  // Input autofocus helper
  useEffect(() => {
    if (gameState === 'playing') {
      inputRef.current?.focus();
    }
  }, [gameState]);

  // Periodic visual quotes interval
  useEffect(() => {
    phraseIntervalRef.current = window.setInterval(() => {
      setActivePhrase(QUOTE_PHRASES[Math.floor(Math.random() * QUOTE_PHRASES.length)]);
    }, 8000);
    return () => {
      if (phraseIntervalRef.current) clearInterval(phraseIntervalRef.current);
    };
  }, []);

  // Set spawning interval based on wave difficulty
  useEffect(() => {
    if (gameState !== 'playing' || waveTransition) {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      return;
    }

    const spawnDelay = Math.max(1600, 4200 - wave * 400);
    spawnIntervalRef.current = window.setInterval(spawnZombie, spawnDelay);

    // Initial spawn
    spawnZombie();

    return () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    };
  }, [gameState, wave, waveTransition]);

  // Start/stop background scary music based on play/mute state
  useEffect(() => {
    if (gameState === 'playing' && !isMuted) {
      sounds.startScaryMusic();
    } else {
      sounds.stopScaryMusic();
    }
    return () => {
      sounds.stopScaryMusic();
    };
  }, [gameState, isMuted]);

  // Main game logic loop (runs at ~40 FPS = 25ms interval)
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }

    gameLoopRef.current = window.setInterval(() => {
      // 1. Update particles
      setParticles(prev => 
        prev.map(p => {
          const nextLife = p.life - 0.05;
          return {
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // gravity
            life: nextLife,
            alpha: Math.max(0, nextLife)
          };
        }).filter(p => p.life > 0)
      );

      // 2. Update bullets
      setBullets(prev => {
        let hitEvents: { targetZombieId: string; bulletId: string; x: number; y: number }[] = [];

        const updated = prev.map(b => {
          // Calculate movement step towards target
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= b.speed) {
            // Hit!
            hitEvents.push({ targetZombieId: b.targetZombieId, bulletId: b.id, x: b.targetX, y: b.targetY });
            return null;
          }

          const ratio = b.speed / distance;
          return {
            ...b,
            x: b.x + dx * ratio,
            y: b.y + dy * ratio
          };
        }).filter(b => b !== null) as Bullet[];

        if (hitEvents.length > 0) {
          // Trigger hits on the zombies
          hitEvents.forEach(evt => {
            handleBulletHit(evt.targetZombieId, evt.x, evt.y);
          });
        }

        return updated;
      });

      // 3. Update Zombies (walk cycles, movement, damage)
      setZombies(prev => {
        let reachedPlayerCount = 0;

        const updated = prev.map(z => {
          if (z.isDying) {
            const nextTimer = z.deathTimer + 0.15;
            if (nextTimer >= 1.0) {
              return null; // Remove fully dead zombie from board
            }
            return { ...z, deathTimer: nextTimer };
          }

          // Player position is horizontally centered at x = 50%.
          // Left-to-right zombies (approaching from left) attack when x >= 47
          // Right-to-left zombies (approaching from right) attack when x <= 53
          let isAtPlayer = false;
          if (z.direction === 'left-to-right') {
            if (z.x >= 47) {
              isAtPlayer = true;
            }
          } else {
            if (z.x <= 53) {
              isAtPlayer = true;
            }
          }

          if (isAtPlayer) {
            if (!z.isAttacking) {
              reachedPlayerCount++;
              return { ...z, isAttacking: true, x: z.direction === 'left-to-right' ? 47 : 53 };
            }
            return z; // stay at player position attacking
          }

          // Normal walking logic
          return {
            ...z,
            x: z.direction === 'left-to-right' ? z.x + z.speed : z.x - z.speed,
            walkCycle: z.walkCycle + 0.2
          };
        }).filter(z => z !== null) as Zombie[];

        if (reachedPlayerCount > 0) {
          sounds.playError();
          setLives(l => {
            const nextL = l - reachedPlayerCount;
            if (nextL <= 0) {
              setGameState('gameover');
              return 0;
            }
            return nextL;
          });
          setPlayerAction('hurt');
          setTimeout(() => setPlayerAction('idle'), 600);
        }

        return updated;
      });

      // 4. Update player aiming angle to point towards the closest zombie
      setZombies(curr => {
        const walkingZombies = curr.filter(z => !z.isDying);
        if (walkingZombies.length > 0) {
          // Find closest zombie by horizontal distance from player (50%)
          const closest = walkingZombies.reduce((prev, current) => 
            Math.abs(prev.x - 50) < Math.abs(current.x - 50) ? prev : current
          );
          // Calculate local angle towards the closest zombie
          const targetDx = Math.abs(closest.x - 50);
          const targetDy = 2.0; // slight downward slope
          const angleRad = Math.atan2(targetDy, targetDx);
          const angleDeg = (angleRad * 180) / Math.PI;
          setGunAngle(angleDeg);
        } else {
          setGunAngle(0);
        }
        return curr;
      });

    }, 25);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, waveTransition]);

  // Handle a bullet hitting a zombie
  const handleBulletHit = (zombieId: string, hitX: number, hitY: number) => {
    // Spawn red blood/hit particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: Math.random().toString(36).substring(2, 9),
        x: hitX,
        y: hitY,
        vx: (Math.random() - 0.5) * 3 + 2, // spray back rightwards
        vy: (Math.random() - 0.75) * 4 - 2, // upwards
        color: '#ef4444', // Red blood
        size: 3 + Math.random() * 4,
        alpha: 1,
        life: 1.0
      });
    }
    setParticles(prev => [...prev, ...newParticles]);

    setZombies(prev => 
      prev.map(z => {
        if (z.id === zombieId && !z.isDying) {
          const nextHealth = z.health - 1;
          if (nextHealth <= 0) {
            // Killed! Increment counters
            setKillsInWave(k => {
              const nextK = k + 1;
              // Check if wave is cleared
              if (nextK >= neededKills) {
                clearWave();
              }
              return nextK;
            });
            const scoreReward = z.type === 'C' ? 300 : z.type === 'E' ? 200 : z.type === 'B' ? 150 : z.type === 'D' ? 100 : 80;
            setScore(s => s + scoreReward);
            return { ...z, health: 0, isDying: true };
          } else {
            // Damaged but still alive: change word to a new short word for second hit
            const nextWord = getNextWord(true);
            return { 
              ...z, 
              health: nextHealth, 
              text: nextWord, 
              originalText: nextWord 
            };
          }
        }
        return z;
      })
    );
  };

  // Clear current wave and trigger transition to next wave
  const clearWave = () => {
    sounds.playSuccess();
    setWaveTransition(true);
    setShowWaveSplash(true);
    setZombies([]);
    setInputValue('');

    // Advance to next wave after 3s
    setTimeout(() => {
      setWave(w => {
        const nextWave = w + 1;
        setNeededKills(10 + nextWave * 2);
        setKillsInWave(0);
        setWaveTransition(false);
        setShowWaveSplash(false);
        return nextWave;
      });
    }, 3000);
  };

  // Input checking
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (waveTransition) return;
    const value = e.target.value;
    setInputValue(value);

    // Filter out dying zombies
    const activeZombies = zombies.filter(z => !z.isDying);
    if (activeZombies.length === 0) return;

    // Normalize value
    const normalizedVal = value.trim();

    // Check if typed text matches any active zombie's word exactly
    const target = activeZombies.find(z => z.text.toLowerCase() === normalizedVal.toLowerCase());

    if (target) {
      // Fire gun!
      sounds.playShoot();
      setInputValue('');
      setPlayerAction('shooting');
      setTimeout(() => setPlayerAction('idle'), 250);

      // Spawn bullet from player gun location
      const playerFacing = getPlayerFacing();
      const newBullet: Bullet = {
        id: Math.random().toString(36).substring(2, 9),
        x: playerFacing === 'right' ? 56 : 44,
        y: 66,
        targetX: target.x,
        targetY: target.y - 5, // chest height
        targetZombieId: target.id,
        speed: 4.5
      };

      setBullets(prev => [...prev, newBullet]);
    }
  };

  // Letter visualizer inside zombie words
  const renderWordText = (zombie: Zombie) => {
    const isCurrentTarget = inputValue.trim().length > 0 && zombie.text.toLowerCase().startsWith(inputValue.trim().toLowerCase());
    
    if (isCurrentTarget) {
      const matchLen = inputValue.trim().length;
      const matchedPart = zombie.text.slice(0, matchLen);
      const remainingPart = zombie.text.slice(matchLen);
      return (
        <span className="font-mono text-xs md:text-sm font-black tracking-wider">
          <span className="text-lime-400 drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]">{matchedPart}</span>
          <span className="text-zinc-100">{remainingPart}</span>
        </span>
      );
    }
    return <span className="font-mono text-xs md:text-sm font-black text-zinc-100 tracking-wider">{zombie.text}</span>;
  };

  const getPlayerFacing = () => {
    const walkingZombies = zombies.filter(z => !z.isDying);
    if (walkingZombies.length > 0) {
      const closest = walkingZombies.reduce((prev, current) => 
        Math.abs(prev.x - 50) < Math.abs(current.x - 50) ? prev : current
      );
      return closest.x < 50 ? 'left' : 'right';
    }
    return 'right';
  };
  const playerFacing = getPlayerFacing();

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 select-none relative">
      
      {/* Game Header Panel */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider text-emerald-500 uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15">
            {levelFilter ? `Latihan: Casharka ${levelFilter.id}` : 'Game Cusub: Z-Gunner'}
          </span>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mt-2 flex items-center gap-2">
            PROJECT: Z-GUNNER
            <span className="text-xs bg-zinc-900 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-400 font-mono tracking-tighter">v1.1</span>
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Qor ereyada ku yaal zombies si aad u toogato oo aad u badbaadiso noloshaada!
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

      {/* Lobby Start Screen */}
      {gameState === 'start' && (
        <div className="w-full flex flex-col items-center justify-center p-12 py-16 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 shadow-2xl text-center gap-6 overflow-hidden relative">
          {/* Neon Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_75%,rgba(16,185,129,0.05)_100%)] opacity-40 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-gradient from-emerald-950/15 to-transparent pointer-events-none filter blur-2xl" />

          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-450 border border-emerald-500/25 z-10 animate-pulse">
            <Gamepad2 className="w-12 h-12" />
          </div>
          
          <div className="z-10">
            <h3 className="text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]">
              PROJECT: Z-GUNNER
            </h3>
            <p className="text-sm text-zinc-400 max-w-lg leading-relaxed mt-2.5">
              U badbaadso mowjadaha zombies, kasbo dhibco, oo tijaabi xawaarahaaga! Erey kasta oo aad qorto wuxuu cowgirl ku tooganayaa bistoolad zombie-ga dhow.
            </p>
          </div>

          {/* Practice/Level Difficulty options */}
          {!levelFilter && user && (
            <div className="flex flex-col gap-1 items-center w-64 bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 z-10">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ereyada Casharka:</span>
              <div className="flex p-0.5 rounded-lg bg-zinc-950 border border-zinc-800 w-full mt-1.5">
                <button
                  onClick={() => setDifficultyMode('all')}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
                    difficultyMode === 'all'
                      ? 'bg-emerald-650 text-white shadow-sm font-black'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Dhamaan Ereyada
                </button>
                <button
                  onClick={() => setDifficultyMode('current')}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition-all ${
                    difficultyMode === 'current'
                      ? 'bg-emerald-650 text-white shadow-sm font-black'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Casharka {user.currentLevel}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-2xl font-bold bg-emerald-650 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 transition-all active:scale-[0.98] mt-2 text-base z-10 border-b-4 border-emerald-800 active:border-b-0 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>BILOW Z-GUNNER</span>
          </button>
        </div>
      )}

      {/* Playing Board Display */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="w-full flex flex-col gap-4">
          
          {/* Game Stats HUD */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Scores (Dhibcaha)</span>
              <span className="text-2xl font-extrabold text-emerald-500 mt-0.5 font-mono">{score}</span>
            </div>
            
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Wave Progress</span>
              <span className="text-2xl font-extrabold text-amber-500 mt-0.5 font-mono">Mowjada {wave}</span>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Zombies la Dilay</span>
              <span className="text-2xl font-extrabold text-lime-500 mt-0.5 font-mono">
                {killsInWave} / {neededKills}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center flex flex-col justify-center items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Nafaha (Hearts)</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(h => (
                  <Heart
                    key={h}
                    className={`w-5 h-5 ${h <= lives ? 'text-rose-500 fill-rose-500' : 'text-zinc-350 dark:text-zinc-800'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Map Playfield Area */}
          <div 
            className={`relative w-full h-[600px] rounded-3xl border border-zinc-250 dark:border-zinc-850 overflow-hidden shadow-inner flex flex-col justify-between ${
              playerAction === 'hurt' ? 'ring-4 ring-rose-500/50 animate-shake' : ''
            }`}
            style={{
              backgroundImage: 'url("/images/zombie_game_bg.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Ambient Gritty Grey filter Overlay (Cinematic war-torn ruins theme) */}
            <div className="absolute inset-0 bg-zinc-950/20 mix-blend-multiply pointer-events-none" />

            {/* Glowing Fire/Light Gradients (Fires burning in the left ruins background) */}
            <div className="absolute bottom-12 left-0 w-48 h-48 rounded-full bg-orange-600/10 filter blur-3xl pointer-events-none" />
            <div className="absolute bottom-24 left-1/4 w-32 h-32 rounded-full bg-red-650/10 filter blur-3xl pointer-events-none" />

            {/* Ambient gray desaturated lighting */}
            <div className="absolute inset-0 bg-[#0f172a]/10 pointer-events-none" />

            {/* SVG Render Layer */}
            <svg 
              viewBox="0 0 800 380" 
              className="absolute inset-0 w-full h-full pointer-events-none select-none z-10" 
              preserveAspectRatio="none"
            >
              
              {/* Billowing black smoke clouds in the background */}
              <ellipse cx="140" cy="200" rx="80" ry="18" fill="#18181b" opacity="0.2" className="animate-pulse" />
              <ellipse cx="480" cy="230" rx="100" ry="22" fill="#18181b" opacity="0.15" className="animate-pulse" />

              {/* Dripping blood paths on the wall overlay */}
              <g transform="translate(500, 100)" opacity="0.85">
                <path d="M 120,40 L 122,80 L 124,40 M 80,50 Q 82,95 81,102" stroke="#7f1d1d" strokeWidth="2.5" fill="none" />
                <path d="M 40,80 Q 43,125 41,130" stroke="#7f1d1d" strokeWidth="2" fill="none" />
              </g>

              {/* Weathered black painted FARMAAL text graffiti on the wall */}
              <text 
                x="590" 
                y="190" 
                fill="#1c1917" 
                fontFamily="'Georgia', 'Times New Roman', serif" 
                fontSize="38" 
                fontWeight="900" 
                letterSpacing="4"
                textAnchor="middle"
                opacity="0.85"
                style={{ transform: 'rotate(-4deg)', textShadow: '1px 1px 3px rgba(255,255,255,0.15)' }}
              >
                FARMAAL
              </text>

              {/* Ground level Platform tiles (Cracked War-torn Concrete) */}
              <rect x="0" y="300" width="800" height="80" fill="#2d2d30" stroke="#1c1917" strokeWidth="2" />
              {/* Debris, concrete cracks, and blood puddles */}
              <path d="M 50 300 Q 55 320 62 315 L 75 330 M 420 305 L 435 325" stroke="#18181b" strokeWidth="2" fill="none" opacity="0.75" />
              <path d="M 280 305 Q 295 325 290 335 L 305 350" stroke="#18181b" strokeWidth="2" fill="none" opacity="0.6" />
              {/* Fresh red blood pools on road */}
              <ellipse cx="220" cy="315" rx="30" ry="5" fill="#7f1d1d" opacity="0.85" />
              <ellipse cx="580" cy="325" rx="45" ry="6" fill="#7f1d1d" opacity="0.85" />
              <path d="M 0 300 L 800 300" stroke="#7f1d1d" strokeWidth="4.5" strokeDasharray="16 12" />
              
              {/* Bullet tracers */}
              {bullets.map(b => (
                <g key={b.id}>
                  {/* Glowing core trail */}
                  <line 
                    x1={(b.x / 100) * 800} 
                    y1={(b.y / 100) * 380} 
                    x2={(b.targetX / 100) * 800} 
                    y2={(b.targetY / 100) * 380} 
                    stroke="#fbbf24" 
                    strokeWidth="3.5" 
                    className="drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]"
                  />
                  <line 
                    x1={(b.x / 100) * 800} 
                    y1={(b.y / 100) * 380} 
                    x2={(b.targetX / 100) * 800} 
                    y2={(b.targetY / 100) * 380} 
                    stroke="#ffffff" 
                    strokeWidth="1.5" 
                  />
                </g>
              ))}

              {/* Render dynamic blood splatter particles */}
              {particles.map(p => (
                <circle 
                  key={p.id}
                  cx={(p.x / 100) * 800} 
                  cy={(p.y / 100) * 380} 
                  r={p.size} 
                  fill={p.color} 
                  opacity={p.alpha} 
                />
              ))}

              {/* 1. RENDER PLAYER (Somali Commando / Ranger) in the middle of the road */}
              <g transform={`translate(400, 230) scale(${playerFacing === 'left' ? -1 : 1}, 1)`}>
                {/* Visual state change when hurt */}
                <g className={playerAction === 'hurt' ? 'animate-bounce' : ''}>
                  
                  {/* Legs and Combat Boots */}
                  {/* Left leg (Olive green pants) */}
                  <rect x="-8" y="45" width="6" height="23" rx="2" fill="#3f6212" stroke="#14532d" strokeWidth="1" transform="rotate(-5)" />
                  <rect x="-10" y="65" width="9" height="7" rx="1.5" fill="#18181b" />
                  {/* Right leg (Olive green pants) */}
                  <rect x="2" y="45" width="6" height="23" rx="2" fill="#3f6212" stroke="#14532d" strokeWidth="1" transform="rotate(5)" />
                  <rect x="1" y="65" width="9" height="7" rx="1.5" fill="#18181b" />
                  
                  {/* Blue/Navy Shirt base */}
                  <ellipse cx="0" cy="25" rx="14" ry="20" fill="#1e293b" />
                  
                  {/* Olive Green Tactical Chest Plate Armor Carrier */}
                  <rect x="-11" y="14" width="22" height="26" rx="4" fill="#166534" stroke="#14532d" strokeWidth="1.5" />
                  {/* Armor vest details */}
                  <rect x="-9" y="18" width="18" height="3" fill="#1e293b" />
                  <rect x="-9" y="24" width="18" height="3" fill="#1e293b" />
                  <rect x="-6" y="30" width="12" height="8" rx="1" fill="#374151" />

                  {/* Somali Flag Shoulder Sleeve Patch (blue background, white star) */}
                  <rect x="-14" y="16" width="6" height="4" fill="#3b82f6" rx="0.5" />
                  <circle cx="-11" cy="18" r="0.8" fill="#ffffff" />
                  
                  {/* Somali skin tone head/face */}
                  <circle cx="0" cy="-2" r="12" fill="#78350f" stroke="#451a03" strokeWidth="1" />
                  {/* Camo green stripe face paint */}
                  <line x1="-9" y1="2" x2="-5" y2="4" stroke="#14532d" strokeWidth="1.5" />
                  <line x1="9" y1="2" x2="5" y2="4" stroke="#14532d" strokeWidth="1.5" />
                  
                  {/* Glowing Tactical Cyan eyes */}
                  <circle cx="-4" cy="-3" r="2.5" fill="#000000" />
                  <circle cx="-4" cy="-3" r="0.8" fill="#06b6d4" className="animate-pulse" />
                  <circle cx="4" cy="-3" r="2.5" fill="#000000" />
                  <circle cx="4" cy="-3" r="0.8" fill="#06b6d4" className="animate-pulse" />
                  
                  {/* Blue Bandana wrap around head */}
                  <rect x="-13" y="-12" width="26" height="5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="0.5" />
                  <circle cx="0" cy="-9.5" r="1.2" fill="#ffffff" />
                  {/* Bandana tie tails hanging */}
                  <path d="M -12,-10 Q -18,-8 -17,-1" stroke="#3b82f6" strokeWidth="2.5" fill="none" />
                  
                  {/* Communication Headset */}
                  <circle cx="-12" cy="-2" r="3.5" fill="#1e293b" />
                  <path d="M -12,-6 A 12,12 0 0,1 12,-6" fill="none" stroke="#1e293b" strokeWidth="2" />
                  <line x1="-12" y1="-2" x2="-6" y2="3" stroke="#1e293b" strokeWidth="1.2" />

                  {/* Rifle / Assault Gun arm pointing to nearest zombie */}
                  <g transform={`translate(8, 22) rotate(${gunAngle})`}>
                    {/* Commando arm with black glove */}
                    <rect x="0" y="-4" width="18" height="8" rx="4" fill="#78350f" stroke="#451a03" strokeWidth="0.5" />
                    <rect x="14" y="-4" width="5" height="8" fill="#18181b" />
                    
                    {/* Tactical Assault Rifle / AK-47 shape */}
                    {/* Buttstock (wood brown) */}
                    <polygon points="6,-7 -2,-10 -2,2 6,-2" fill="#78350f" />
                    {/* Receiver (black metal) */}
                    <rect x="6" y="-7" width="16" height="6" fill="#18181b" />
                    {/* Curved banana magazine */}
                    <path d="M 18,-1 Q 20,11 14,14 L 10,12 Q 15,7 13,-1 Z" fill="#18181b" />
                    {/* Handguard & Barrel */}
                    <rect x="22" y="-6" width="22" height="3.5" fill="#374151" />
                    {/* Scope mount with red lens */}
                    <rect x="11" y="-11" width="8" height="4" fill="#18181b" />
                    <circle cx="19" cy="-9" r="0.8" fill="#ef4444" />

                    {/* Muzzle Flash: Cool Cyan Plasma Burst */}
                    {playerAction === 'shooting' && (
                      <g transform="translate(44, -4.5)">
                        <circle cx="0" cy="0" r="14" fill="#06b6d4" className="animate-ping" opacity="0.75" />
                        <polygon points="0,-5 20,-2 26,-4 12,2 24,5 0,5" fill="#e0f7fa" />
                      </g>
                    )}
                  </g>
                  
                  {/* Flash red overlay when hurt */}
                  {playerAction === 'hurt' && (
                    <ellipse cx="0" cy="22" rx="22" ry="48" fill="#ef4444" opacity="0.45" />
                  )}

                </g>
              </g>

              {/* 2. RENDER ENEMIES (Zombies walking in from left and right) */}
              {zombies.map(z => {
                const zombieLeft = (z.x / 100) * 800;
                let zombieTop = (z.y / 100) * 380;
                
                // Add floating effect to Ghost (Type E)
                if (z.type === 'E' && !z.isDying) {
                  zombieTop += Math.sin(z.walkCycle * 0.1) * 12;
                }

                // Swing arms/legs according to walk Cycle
                const legSwing = Math.sin(z.walkCycle) * 12;
                const armSwing = z.isAttacking ? (Math.sin(z.walkCycle * 2) * 15 - 45) : (Math.cos(z.walkCycle) * 10 - 25);
                
                // If zombie direction is left-to-right (X < 50), it walks right, so it should face right.
                // Since our zombie drawings face left by default, we mirror them horizontally (scaleX = -1) if facing right.
                const isFacingRight = z.direction === 'left-to-right';

                // Determine dynamic scaling/translating for bulkier zombies (like Brute Type C)
                const zombieScale = z.type === 'C' ? 1.25 : 1.0;

                return (
                  <g 
                    key={z.id} 
                    transform={`translate(${zombieLeft}, ${zombieTop}) scale(${(isFacingRight ? -1 : 1) * zombieScale}, ${zombieScale})`}
                    className="transition-all duration-75"
                  >
                    
                    {/* Render Zombie elements (Rotated 90 deg if dead) */}
                    <g transform={z.isDying ? `rotate(-90) translate(-30, 20)` : ''} opacity={z.isDying ? 1 - z.deathTimer : 1}>
                      
                      {/* --- LEG RENDERING --- */}
                      {/* Ghosts (Type E) have no legs, they have a wispy tail instead */}
                      {z.type !== 'E' && z.type !== 'D' && (
                        <>
                          {/* Left Leg (distressed/ripped) */}
                          <line x1="-5" y1="20" x2={-5 + legSwing} y2="45" stroke="#1c1917" strokeWidth="5.5" strokeLinecap="round" />
                          <line x1="-5" y1="20" x2={-5 + legSwing} y2="45" stroke={z.type === 'A' ? '#581c87' : z.type === 'C' ? '#1f2937' : '#042f2e'} strokeWidth="4" strokeLinecap="round" />
                          {/* Ripped cloth cuffs */}
                          <circle cx={-5 + legSwing} cy="42" r="3.5" fill="#ef4444" opacity="0.6" />
                          
                          {/* Right Leg (distressed/ripped) */}
                          <line x1="5" y1="20" x2={5 - legSwing} y2="45" stroke="#1c1917" strokeWidth="5.5" strokeLinecap="round" />
                          <line x1="5" y1="20" x2={5 - legSwing} y2="45" stroke={z.type === 'A' ? '#581c87' : z.type === 'C' ? '#1f2937' : '#042f2e'} strokeWidth="4" strokeLinecap="round" />
                          <circle cx={5 - legSwing} cy="42" r="3.5" fill="#ef4444" opacity="0.6" />
                        </>
                      )}

                      {/* Ghost Wispy Tail (Type E) - wavy flame tail */}
                      {z.type === 'E' && (
                        <g>
                          <path d="M -8,15 Q -15,25 0,38 Q 15,25 8,15 Q 4,24 0,30 Q -4,24 -8,15" fill="#0ea5e9" opacity="0.55" />
                          <path d="M -5,15 Q -9,22 0,32 Q 9,22 5,15" fill="#38bdf8" opacity="0.7" />
                        </g>
                      )}

                      {/* Crawler Legs (Type D) - dragging legs */}
                      {z.type === 'D' && (
                        <g opacity="0.85">
                          <line x1="-12" y1="8" x2={-26 + Math.sin(z.walkCycle) * 4} y2={16 + Math.cos(z.walkCycle) * 2} stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                          <line x1="-12" y1="8" x2={-26 + Math.sin(z.walkCycle) * 4} y2={16 + Math.cos(z.walkCycle) * 2} stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                          
                          <line x1="-4" y1="8" x2={-22 - Math.sin(z.walkCycle) * 4} y2={20 - Math.cos(z.walkCycle) * 2} stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                          <line x1="-4" y1="8" x2={-22 - Math.sin(z.walkCycle) * 4} y2={20 - Math.cos(z.walkCycle) * 2} stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      )}

                      {/* --- TORSO & BODY RENDERING --- */}
                      {/* Crawler Body (Type D) is horizontal and slimed */}
                      {z.type === 'D' ? (
                        <g>
                          <ellipse cx="-4" cy="5" rx="16" ry="8" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
                          <ellipse cx="-4" cy="5" rx="12" ry="5" fill="#64748b" />
                          {/* Exposed backbone ribs on crawler */}
                          <line x1="-10" y1="2" x2="-10" y2="8" stroke="#f1f5f9" strokeWidth="1.5" />
                          <line x1="-6" y1="2" x2="-6" y2="8" stroke="#f1f5f9" strokeWidth="1.5" />
                          <line x1="-2" y1="2" x2="-2" y2="8" stroke="#f1f5f9" strokeWidth="1.5" />
                          <line x1="2" y1="2" x2="2" y2="8" stroke="#f1f5f9" strokeWidth="1.5" />
                        </g>
                      ) : z.type === 'E' ? (
                        // Ghost ribcage (no shirt, translucent bones)
                        <g>
                          <ellipse cx="0" cy="0" rx="11" ry="17" fill="none" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.6" />
                          <ellipse cx="0" cy="0" rx="13" ry="19" fill="none" stroke="#00f0ff" strokeWidth="0.5" opacity="0.3" className="animate-pulse" />
                        </g>
                      ) : z.type === 'C' ? (
                        // Brute bulky torso with massive shoulders and metal plates
                        <g>
                          <ellipse cx="0" cy="0" rx="16" ry="21" fill="#450a0a" stroke="#1e293b" strokeWidth="2" />
                          {/* Rusty steel chest guard plates */}
                          <rect x="-10" y="-12" width="20" height="8" rx="2" fill="#4b5563" stroke="#374151" strokeWidth="1" />
                          <circle cx="-7" cy="-8" r="0.8" fill="#e2e8f0" />
                          <circle cx="7" cy="-8" r="0.8" fill="#e2e8f0" />
                          
                          <rect x="-12" y="0" width="24" height="6" rx="1" fill="#374151" />
                          
                          {/* Radioactive green glowing slots inside muscle cracks */}
                          <line x1="-6" y1="10" x2="6" y2="10" stroke="#bef264" strokeWidth="2.5" className="animate-pulse" />
                        </g>
                      ) : (
                        // Standard (Type B) / Punk (Type A) vertical bodies
                        <ellipse 
                          cx="0" 
                          cy="0" 
                          rx="12" 
                          ry="18" 
                          fill={z.type === 'A' ? '#1e1b4b' : '#115e59'} 
                          stroke="#1e293b" 
                          strokeWidth="1.5" 
                        />
                      )}

                      {/* Blood splatters and exposed chest ribs for humanoids */}
                      {z.type !== 'E' && z.type !== 'D' && z.type !== 'C' && (
                        <>
                          {/* Torn shirt design showing ribcage underneath */}
                          <polygon points="-6,-6 6,-6 0,8" fill="#781a1a" />
                          {/* Exposed bones */}
                          <line x1="-4" y1="-2" x2="4" y2="-2" stroke="#f4f4f5" strokeWidth="1.8" opacity="0.9" />
                          <line x1="-5" y1="2" x2="5" y2="2" stroke="#f4f4f5" strokeWidth="1.8" opacity="0.9" />
                          <line x1="-3" y1="6" x2="3" y2="6" stroke="#f4f4f5" strokeWidth="1.8" opacity="0.9" />
                          <line x1="0" y1="-5" x2="0" y2="9" stroke="#f4f4f5" strokeWidth="1.5" opacity="0.8" />
                          
                          {/* Dripping blood */}
                          <path d="M -4,2 Q -6,8 -5,12" stroke="#991b1b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          <circle cx="3" cy="9" r="2" fill="#991b1b" />
                        </>
                      )}

                      {/* Ghost skeleton ribs (translucent glowing skull style) */}
                      {z.type === 'E' && (
                        <g opacity="0.9">
                          {/* Spine */}
                          <line x1="0" y1="-8" x2="0" y2="14" stroke="#f8fafc" strokeWidth="2.5" />
                          {/* Rib loops */}
                          <path d="M -9,-4 Q 0,-7 9,-4 M -9,-4 Q 0,-1 9,-4" stroke="#f8fafc" strokeWidth="1.8" fill="none" />
                          <path d="M -11,2 Q 0,-1 11,2 M -11,2 Q 0,5 11,2" stroke="#f8fafc" strokeWidth="1.8" fill="none" />
                          <path d="M -10,8 Q 0,5 10,8 M -10,8 Q 0,11 10,8" stroke="#f8fafc" strokeWidth="1.8" fill="none" />
                          {/* Pelvis bone */}
                          <path d="M -6,14 L 6,14 L 4,18 L -4,18 Z" fill="#f8fafc" />
                        </g>
                      )}

                      {/* Crawler spine bone tail (Type D) */}
                      {z.type === 'D' && (
                        <g opacity="0.9">
                          <line x1="-16" y1="5" x2="-2" y2="5" stroke="#f1f5f9" strokeWidth="3" />
                          {/* Vertebrae segments trailing behind */}
                          <circle cx="-16" cy="5" r="3.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.5" />
                          <circle cx="-21" cy="6" r="3" fill="#f8fafc" stroke="#64748b" strokeWidth="0.5" />
                          <circle cx="-26" cy="7" r="2.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.5" />
                        </g>
                      )}

                      {/* --- ARMS RENDERING --- */}
                      {z.type === 'D' ? (
                        // Crawler claw arms dragging forward in front of its head
                        <g>
                          <line x1="4" y1="5" x2={22 - armSwing * 0.4} y2={10 + Math.sin(z.walkCycle * 2) * 5} stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" />
                          <line x1="4" y1="5" x2={22 - armSwing * 0.4} y2={10 + Math.sin(z.walkCycle * 2) * 5} stroke="#64748b" strokeWidth="3.5" strokeLinecap="round" />
                          {/* Sharp long black claws */}
                          <path d={`M ${22 - armSwing * 0.4}, ${10 + Math.sin(z.walkCycle * 2) * 5} L ${28 - armSwing * 0.4}, ${14 + Math.sin(z.walkCycle * 2) * 5}`} stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                          <path d={`M ${22 - armSwing * 0.4}, ${10 + Math.sin(z.walkCycle * 2) * 5} L ${29 - armSwing * 0.4}, ${10 + Math.sin(z.walkCycle * 2) * 5}`} stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                        </g>
                      ) : z.type === 'E' ? (
                        // Ghost translucent bony arms
                        <g opacity="0.8">
                          {/* Back skeletal arm */}
                          <path d={`M -6,-8 Q -12,${-10 + armSwing} ${-22 + armSwing},-4`} fill="none" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
                          {/* Front skeletal arm */}
                          <path d={`M 6,-8 Q 12,${-10 - armSwing} ${-25 - armSwing},-1`} fill="none" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      ) : z.type === 'C' ? (
                        // Brute muscular claw arms
                        <g>
                          {/* Back big arm */}
                          <line x1="-12" y1="-8" x2={-28 + armSwing} y2="-2" stroke="#1c1917" strokeWidth="8" strokeLinecap="round" />
                          <line x1="-12" y1="-8" x2={-28 + armSwing} y2="-2" stroke="#7f1d1d" strokeWidth="5.5" strokeLinecap="round" />
                          
                          {/* Front big arm */}
                          <line x1="12" y1="-8" x2={-32 - armSwing} y2="2" stroke="#1c1917" strokeWidth="8" strokeLinecap="round" />
                          <line x1="12" y1="-8" x2={-32 - armSwing} y2="2" stroke="#7f1d1d" strokeWidth="5.5" strokeLinecap="round" />
                          <circle cx={-32 - armSwing} cy="2" r="4.5" fill="#18181b" />
                        </g>
                      ) : (
                        // Standard / Punk vertical walking zombie arms
                        <>
                          {/* Back arm */}
                          <line x1="-6" y1="-8" x2={-20 + armSwing} y2="-5" stroke="#1c1917" strokeWidth="5.5" strokeLinecap="round" />
                          <line x1="-6" y1="-8" x2={-20 + armSwing} y2="-5" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
                          
                          {/* Front arm */}
                          <line x1="6" y1="-8" x2={-25 - armSwing} y2="-2" stroke="#1c1917" strokeWidth="5.5" strokeLinecap="round" />
                          <line x1="6" y1="-8" x2={-25 - armSwing} y2="-2" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
                          <circle cx={-25 - armSwing} cy="-2" r="3" fill="#991b1b" />
                        </>
                      )}

                      {/* --- HEAD & FACE RENDERING --- */}
                      {z.type === 'D' ? (
                        // Crawler Head (lower, offset right)
                        <g transform="translate(11, -3)">
                          <circle cx="0" cy="0" r="9.5" fill="#64748b" stroke="#1e293b" strokeWidth="1.5" />
                          {/* Wide screaming mouth */}
                          <ellipse cx="4" cy="3.5" rx="3.5" ry="4.5" fill="#000000" />
                          <polygon points="2,0 4,2 6,0" fill="#ffffff" /> {/* fangs */}
                          {/* Bleeding eye socket */}
                          <circle cx="3" cy="-2.5" r="2.2" fill="#000000" />
                          <path d="M 3,-2.5 L 3,5.5" stroke="#991b1b" strokeWidth="1.8" />
                          {/* Single bulging sickly yellow pupil */}
                          <circle cx="-2.5" cy="-2.5" r="2.5" fill="#eab308" />
                          <circle cx="-2.5" cy="-2.5" r="0.8" fill="#000000" />
                        </g>
                      ) : z.type === 'E' ? (
                        // Ghost Skull Head
                        <g transform="translate(0, -23)">
                          <path d="M -7.5,-5 C -7.5,-12.5 7.5,-12.5 7.5,-5 C 7.5,-0.5 4.5,3.5 3,4.5 L -3,4.5 C -4.5,3.5 -7.5,-0.5 -7.5,-5 Z" fill="#f8fafc" stroke="#0ea5e9" strokeWidth="1.2" />
                          <rect x="-2.5" y="4.5" width="5" height="3" fill="#f8fafc" />
                          {/* Teeth vertical lines */}
                          <line x1="-1.5" y1="4.5" x2="-1.5" y2="7.5" stroke="#94a3b8" strokeWidth="0.8" />
                          <line x1="0" y1="4.5" x2="0" y2="7.5" stroke="#94a3b8" strokeWidth="0.8" />
                          <line x1="1.5" y1="4.5" x2="1.5" y2="7.5" stroke="#94a3b8" strokeWidth="0.8" />
                          
                          {/* Empty eye sockets with purple fire */}
                          <circle cx="-2.5" cy="-4.5" r="2.5" fill="#000000" />
                          <circle cx="-2.5" cy="-4.5" r="1" fill="#d8b4fe" />
                          <path d="M -3.5,-7 Q -2.5,-12 -1.5,-7" stroke="#c084fc" strokeWidth="2.2" fill="none" opacity="0.85" className="animate-pulse" />
                          
                          <circle cx="2.5" cy="-4.5" r="2.5" fill="#000000" />
                          <circle cx="2.5" cy="-4.5" r="1" fill="#d8b4fe" />
                          <path d="M 1.5,-7 Q 2.5,-12 3.5,-7" stroke="#c084fc" strokeWidth="2.2" fill="none" opacity="0.85" className="animate-pulse" />
                          
                          {/* Nose cavity */}
                          <polygon points="0,-2 -1.2,0 1.2,0" fill="#000000" />
                        </g>
                      ) : (
                        // Standard / Punk / Brute Head
                        <g>
                          {/* Base skull head */}
                          <circle cx="0" cy="-22" r="11" fill={z.type === 'A' ? '#14532d' : z.type === 'C' ? '#3b0712' : '#334155'} stroke="#18181b" strokeWidth="1.5" />
                          
                          {/* Punk face elements */}
                          {z.type === 'A' && (
                            <g>
                              {/* Spiky mohawk */}
                              <path d="M -8,-28 L -16,-38 L -6,-32 L 0,-44 L 6,-32 L 16,-38 L 8,-28 Z" fill="#22c55e" />
                              {/* Eyebrow silver safety ring */}
                              <circle cx="-7" cy="-25" r="1.5" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                              {/* Exposed brain on left side */}
                              <path d="M -8,-29 C -11,-32 -5,-35 -3,-30 C -2,-34 3,-33 1,-29" stroke="#ef4444" strokeWidth="2.5" fill="#fecdd3" />
                              {/* Glowing red slit eyes */}
                              <circle cx="-3.5" cy="-21" r="3" fill="#000000" />
                              <circle cx="-3.5" cy="-21" r="1.2" fill="#f43f5e" className="animate-pulse" />
                              <circle cx="3.5" cy="-21" r="3" fill="#000000" />
                              <circle cx="3.5" cy="-21" r="1.2" fill="#f43f5e" className="animate-pulse" />
                              
                              <line x1="-7" y1="-25" x2="-2" y2="-23" stroke="#000" strokeWidth="2" />
                              <line x1="7" y1="-25" x2="2" y2="-23" stroke="#000" strokeWidth="2" />
                              
                              {/* Creepy mouth stitches with green drool */}
                              <line x1="-5" y1="-14" x2="5" y2="-14" stroke="#000" strokeWidth="1.5" />
                              <line x1="-3" y1="-16" x2="-3" y2="-12" stroke="#000" strokeWidth="1" />
                              <line x1="0" y1="-16" x2="0" y2="-12" stroke="#000" strokeWidth="1" />
                              <line x1="3" y1="-16" x2="3" y2="-12" stroke="#000" strokeWidth="1" />
                              <path d="M 0,-14 L -2,-8 L 2,-11" stroke="#a3e635" strokeWidth="2.2" fill="none" />
                            </g>
                          )}
                          
                          {/* Screamer face elements */}
                          {z.type === 'B' && (
                            <g>
                              {/* Wild messy black hair */}
                              <path d="M -11,-24 Q -22,-10 -15,10 Q -10,-10 0,-25 Q 10,-10 15,10 Q 22,-10 11,-24 Z" fill="#18181b" />
                              {/* Hollow black eyes with yellow glowing pupils */}
                              <circle cx="-4" cy="-22" r="3.5" fill="#000000" />
                              <circle cx="-4" cy="-22" r="1.2" fill="#fbbf24" className="animate-pulse" />
                              <circle cx="4" cy="-22" r="3.5" fill="#000000" />
                              <circle cx="4" cy="-22" r="1.2" fill="#fbbf24" className="animate-pulse" />
                              
                              <line x1="-7" y1="-26" x2="-2" y2="-24" stroke="#000" strokeWidth="2" />
                              <line x1="7" y1="-26" x2="2" y2="-24" stroke="#000" strokeWidth="2" />
                              
                              {/* Wide screaming mouth with sharp yellow fangs */}
                              <ellipse cx="0" cy="-12.5" rx="5.5" ry="4.5" fill="#000000" />
                              <polygon points="-3.5,-15.5 -2.2,-10.5 -1,-15.5" fill="#ffffff" />
                              <polygon points="1,-15.5 2.2,-10.5 3.5,-15.5" fill="#ffffff" />
                              
                              {/* Slime drool */}
                              <path d="M -1.5,-9 L -3.5,-2 L -0.5,-6" stroke="#84cc16" strokeWidth="2.5" fill="none" />
                              <path d="M 1.5,-9 L 3,-3 L 1,-6" stroke="#ef4444" strokeWidth="2" fill="none" /> {/* blood */}
                              
                              {/* Stitches across neck */}
                              <line x1="-8" y1="-10" x2="8" y2="-9" stroke="#000000" strokeWidth="1.5" />
                              <line x1="-4" y1="-12" x2="-4" y2="-7" stroke="#000000" strokeWidth="1" />
                              <line x1="3" y1="-12" x2="3" y2="-7" stroke="#000000" strokeWidth="1" />
                            </g>
                          )}

                          {/* Brute/Tank face elements */}
                          {z.type === 'C' && (
                            <g>
                              {/* Forehead bolted metal plates */}
                              <path d="M -9,-26 C -9,-31 9,-31 9,-26 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
                              <circle cx="-5" cy="-28.5" r="1.2" fill="#000" />
                              <circle cx="5" cy="-28.5" r="1.2" fill="#000" />
                              
                              {/* Glowing red scanner cybernetic eye */}
                              <circle cx="-4" cy="-21" r="4.5" fill="#000000" />
                              <circle cx="-4" cy="-21" r="2.2" fill="#f43f5e" className="animate-ping" />
                              <circle cx="-4" cy="-21" r="1.2" fill="#ef4444" />
                              
                              {/* Blind white eye */}
                              <circle cx="4" cy="-21" r="4.5" fill="#1e293b" />
                              <circle cx="4" cy="-21" r="2" fill="#cbd5e1" opacity="0.75" />
                              
                              {/* Neck bolts */}
                              <rect x="-14.5" y="-19" width="4" height="6" fill="#4b5563" stroke="#1f2937" strokeWidth="1" />
                              <rect x="10.5" y="-19" width="4" height="6" fill="#4b5563" stroke="#1f2937" strokeWidth="1" />
                              
                              {/* Ripped blood-stained jaw */}
                              <path d="M -7,-15 L 7,-15 L 5,-9 L -5,-9 Z" fill="#7f1d1d" />
                              <line x1="-5" y1="-12" x2="5" y2="-12" stroke="#ffffff" strokeWidth="1.8" strokeDasharray="1.5 1.5" />
                            </g>
                          )}
                        </g>
                      )
                    }

                      {/* --- HEALTH BAR INDICATOR --- */}
                      {z.maxHealth > 1 && (
                        <g transform="translate(-12, -44)">
                          <rect x="0" y="0" width="24" height="3.5" rx="1.5" fill="#18181b" />
                          <rect 
                            x="0" 
                            y="0" 
                            width={(z.health / z.maxHealth) * 24} 
                            height="3.5" 
                            rx="1.5" 
                            fill={z.health >= 3 ? '#ef4444' : z.health === 2 ? '#f59e0b' : '#eab308'} 
                          />
                        </g>
                      )}

                    </g>
                  </g>
                );
              })}

            </svg>

            {/* DOM Overlay for labels above walking zombies */}
            {zombies.map(z => {
              if (z.isDying) return null;
              
              const walkingZombies = zombies.filter(item => !item.isDying);
              const closestZombie = walkingZombies.length > 0 
                ? walkingZombies.reduce((prev, current) => (prev.x < current.x) ? prev : current)
                : null;
              const isClosest = closestZombie?.id === z.id;

              return (
                <div
                  key={z.id}
                  className="absolute pointer-events-none select-none flex flex-col items-center gap-0.5"
                  style={{
                    left: `${z.x}%`,
                    top: `${z.y - 20}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 30
                  }}
                >
                  {/* Badge displaying type details on hover */}
                  <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase rounded-full ${
                    z.type === 'A' 
                      ? 'bg-rose-500/80 text-white' 
                      : z.type === 'B'
                      ? 'bg-indigo-500/80 text-zinc-150'
                      : z.type === 'C'
                      ? 'bg-amber-600/80 text-white'
                      : z.type === 'D'
                      ? 'bg-emerald-600/80 text-white'
                      : 'bg-cyan-500/80 text-white'
                  }`}>
                    {z.type === 'A' && 'Punk (Fast)'}
                    {z.type === 'B' && 'Screamer (Medium)'}
                    {z.type === 'C' && 'Brute (Tank)'}
                    {z.type === 'D' && 'Crawler (Fast)'}
                    {z.type === 'E' && 'Ghost (Spooky)'}
                  </span>

                  {/* Word box layout */}
                  <div className={`px-3 py-1 rounded-xl border bg-black/90 shadow-lg ${
                    isClosest ? 'border-lime-500 ring-2 ring-lime-500/30' : 'border-zinc-700'
                  }`}>
                    {renderWordText(z)}
                  </div>
                </div>
              );
            })}

            {/* Middle-Right text GDD specification phrase overlay */}
            <div className="absolute right-6 top-1/4 max-w-[200px] p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-[10px] text-zinc-400 italic leading-relaxed backdrop-blur-sm shadow-md flex flex-col gap-1">
              <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400 font-sans">WISDOM LOG:</span>
              <span>"{activePhrase}"</span>
            </div>

            {/* Pause HUD item inside playing grid */}
            <button 
              onClick={() => setGameState('paused')}
              className="absolute top-4 left-4 z-30 px-3.5 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Pause
            </button>

            {/* Wave cleared announcement splash banner */}
            {showWaveSplash && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center gap-2 animate-fade-in">
                <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Alert Transmission:</span>
                <h3 className="text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_2px_10px_rgba(16,185,129,0.5)]">
                  {waveTransition ? `WAVE ${wave} COMPLETED` : `WAVE ${wave} STARTING`}
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1 max-w-xs text-center font-mono">
                  {waveTransition 
                    ? "Upgrading defenses... Preparing next encounter wave." 
                    : `Eliminate ${neededKills} targets to unlock next tier.`}
                </p>
              </div>
            )}

          </div>

          {/* Typing Action Input box */}
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
            
            {/* Design overlay GDD instruction label */}
            <span className="text-[10px] font-black tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mt-1">
              TYPE - SHOOT - KILL ZOMBIES
            </span>
          </div>

          {/* Pause overlay */}
          {gameState === 'paused' && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 rounded-3xl">
              <h3 className="text-3xl font-black italic text-emerald-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                WAA LA HAKIYEY
              </h3>
              <p className="text-xs text-zinc-300 max-w-xs text-center -mt-1 leading-relaxed">
                U diyaargarow inaad sii waddo. Guji badhanka si aad dib ugu bilaawdo toogashada.
              </p>
              

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setGameState('playing')}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Sii Bilow (Resume)
                </button>
                <button
                  onClick={onBackToSelector}
                  className="px-6 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold text-sm transition-all cursor-pointer"
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
          {score > 300 ? (
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
              {score > 300 ? "Guul Ka badbaaday! (Victory)" : "Waa Lagaa Adkaaday!"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
              {score > 300 
                ? `Mowjadaha zombie-ga waa laga guuleystay. Waxaad heshay dhibco dhan ${score}!`
                : "Aad baad u dadaashay. Tababaro xawaarahaaga qorista si aad u disho dhamaan mowjadaha xiga!"}
            </p>
          </div>

          {/* Metric details cards */}
          <div className="w-full max-w-md grid grid-cols-2 gap-3 border-t border-b border-zinc-100 dark:border-zinc-800 py-6 font-mono text-zinc-550 dark:text-zinc-400 my-2">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Dhibcaha</span>
              <span className="text-xl font-extrabold text-emerald-500">{score}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Mowjada Ugu Dambeysay</span>
              <span className="text-xl font-extrabold text-amber-500">{wave}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl font-bold bg-emerald-650 hover:bg-emerald-600 text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Dib u Bilow</span>
            </button>
            <button
              onClick={onBackToSelector}
              className="px-6 py-3 rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Ku noqo Game-yada</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZombieGame;
