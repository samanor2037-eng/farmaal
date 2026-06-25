import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import sounds from '../utils/soundEffects';
import { RotateCcw, Home, ShieldAlert, Target, Volume2, VolumeX } from 'lucide-react';
import { COMBAT_WORDS_EASY, COMBAT_WORDS_MEDIUM, COMBAT_WORDS_HARD } from '../data/combatWords';

// Interfaces for gameplay mechanics
interface Jet {
  id: string;
  word: string;
  originalWord: string;
  x: number;
  y: number;
  speed: number;
  width: number;
  height: number;
  vx: number;         // Horizontal swaying
  wobbleSpeed: number;
  wobblePhase: number;
  wobbleAmount: number;
  isDying: boolean;
  scoreValue: number;
  spawnX: number;
  targetX: number;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  speed: number;
  type: 'tracer' | 'missile';
  jetId: string;
  trail: { x: number; y: number; alpha: number }[];
  railSide?: 'left' | 'right';
}

interface Casing {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  bounces: number;
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
  life: number;
  maxLife: number;
}

interface SmokePlume {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
}

interface CombatGameProps {
  onBackToSelector: () => void;
  levelFilter?: { id: number; text: string; title: string } | null;
}

export const CombatGame: React.FC<CombatGameProps> = ({ onBackToSelector, levelFilter: _levelFilter }) => {
  const { addGameXP, isMuted, toggleMute } = useAuth();

  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'gameover'>('start');
  
  // Game states monitored in React
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [cityHealth, setCityHealth] = useState(100);
  const [activeWord, setActiveWord] = useState('');
  const [typedPart, setTypedPart] = useState('');
  const [isOverheated, setIsOverheated] = useState(false);
  const [heatLevel, setHeatLevel] = useState(0); // 0 to 100
  const [wordQueue, setWordQueue] = useState<string[]>([]);
  const [totalJetsDestroyed, setTotalJetsDestroyed] = useState(0);

  // References for the requestAnimationFrame game loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSavedXPRef = useRef(false);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [isBgLoaded, setIsBgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = 'images/combat_game_bg_real.jpg';
    img.onload = () => {
      bgImageRef.current = img;
      setIsBgLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load background image');
    };
  }, []);



  // Mutable game objects for smooth 60fps canvas performance
  const stateRef = useRef({
    jets: [] as Jet[],
    projectiles: [] as Projectile[],
    casings: [] as Casing[],
    particles: [] as Particle[],
    smokePlumes: [] as SmokePlume[],
    turretAngle: -Math.PI / 2, // starts pointing straight up
    currentLeftAngle: -Math.PI / 2,
    currentRightAngle: -Math.PI / 2,
    recoil: 0,
    lockedJetId: null as string | null,
    heat: 0,
    overheated: false,
    overheatTimer: 0,
    score: 0,
    cityHealth: 100,
    wave: 1,
    spawnTimer: 0,
    screenShake: 0,
    frameCount: 0,
    jetsDestroyed: 0,
    barrelToggle: false,
    leftMissileReload: 0,
    rightMissileReload: 0
  });



  // Fetch standard words depending on current wave difficulty
  const getNextWordForQueue = (currentWave: number) => {
    let list = COMBAT_WORDS_EASY;
    if (currentWave >= 3 && currentWave < 5) {
      list = Math.random() > 0.4 ? COMBAT_WORDS_MEDIUM : COMBAT_WORDS_EASY;
    } else if (currentWave >= 5) {
      const rand = Math.random();
      list = rand > 0.6 ? COMBAT_WORDS_HARD : rand > 0.25 ? COMBAT_WORDS_MEDIUM : COMBAT_WORDS_EASY;
    }
    
    let word = list[Math.floor(Math.random() * list.length)];
    // Ensure word doesn't have spaces and contains correct characters
    word = word.replace(/\s+/g, '').toLowerCase();
    return word || 'guul';
  };

  // Initialize Word Queue
  const initializeWordQueue = (currentWave: number) => {
    const queue: string[] = [];
    for (let i = 0; i < 4; i++) {
      queue.push(getNextWordForQueue(currentWave));
    }
    setWordQueue(queue);
    return queue;
  };

  // Start/Restart Game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setWave(1);
    setCityHealth(100);
    setActiveWord('');
    setTypedPart('');
    setIsOverheated(false);
    setHeatLevel(0);
    setTotalJetsDestroyed(0);
    hasSavedXPRef.current = false;

    // Reset loop references
    initializeWordQueue(1);
    stateRef.current = {
      jets: [],
      projectiles: [],
      casings: [],
      particles: [],
      smokePlumes: Array.from({ length: 5 }, () => ({
        x: 100 + Math.random() * 1080,
        y: 480 - Math.random() * 300,
        vy: -0.2 - Math.random() * 0.4,
        size: 20 + Math.random() * 30,
        alpha: 0.15 + Math.random() * 0.15
      })),
      turretAngle: -Math.PI / 2,
      currentLeftAngle: -Math.PI / 2,
      currentRightAngle: -Math.PI / 2,
      recoil: 0,
      lockedJetId: null,
      heat: 0,
      overheated: false,
      overheatTimer: 0,
      score: 0,
      cityHealth: 100,
      wave: 1,
      spawnTimer: 60, // spawn first jet after 1 second
      screenShake: 0,
      frameCount: 0,
      jetsDestroyed: 0,
      barrelToggle: false,
      leftMissileReload: 0,
      rightMissileReload: 0
    };

    // Auto-focus input helper
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Trigger scary ambient background music
  useEffect(() => {
    if (gameState === 'playing') {
      sounds.startScaryMusic();
    } else {
      sounds.stopScaryMusic();
    }
    return () => {
      sounds.stopScaryMusic();
    };
  }, [gameState]);

  // Keep background music synced with mute toggle
  useEffect(() => {
    if (isMuted) {
      sounds.stopScaryMusic();
    } else if (gameState === 'playing') {
      sounds.startScaryMusic();
    }
  }, [isMuted, gameState]);

  // Handle XP saving on Game Over
  useEffect(() => {
    if (gameState === 'gameover' && !hasSavedXPRef.current) {
      hasSavedXPRef.current = true;
      addGameXP(0);
    }
  }, [gameState, addGameXP]);

  // Handle typing key presses
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameState !== 'playing') return;

    const key = e.key.toLowerCase();

    // Check for standard letter inputs
    if (key.length === 1 && /^[a-z';]$/.test(key)) {
      const state = stateRef.current;

      // 1. Check if overheated
      if (state.overheated) {
        sounds.playMisfire();
        state.screenShake = Math.max(state.screenShake, 3);
        return;
      }

      // 2. Lock-on logic
      if (state.lockedJetId === null) {
        // Look for any active jet that starts with this key
        const match = state.jets.find(j => !j.isDying && j.word.startsWith(key));
        if (match) {
          state.lockedJetId = match.id;
          setActiveWord(match.originalWord);
          setTypedPart(key);
          
          // Fire a tracer shot immediately
          fireTracer(match.id, match.x, match.y);
        } else {
          // Play misfire sound and increase heat
          sounds.playMisfire();
          incrementHeat(6);
        }
      } else {
        // Locked target exists
        const targetJet = state.jets.find(j => j.id === state.lockedJetId && !j.isDying);
        if (!targetJet) {
          // Locked jet disappeared or died (e.g. crashed)
          state.lockedJetId = null;
          setActiveWord('');
          setTypedPart('');
          return;
        }

        const currentTyped = typedPart + key;
        if (targetJet.word.startsWith(currentTyped)) {
          setTypedPart(currentTyped);
          fireTracer(targetJet.id, targetJet.x, targetJet.y);

          // Check if word is completed
          if (currentTyped === targetJet.word) {
            launchMissile(targetJet.id);
            state.lockedJetId = null;
            setActiveWord('');
            setTypedPart('');
          }
        } else {
          // Play misfire sound
          sounds.playMisfire();
          incrementHeat(8);
        }
      }
    }
  };

  // Weapon heat generator
  const incrementHeat = (amount: number) => {
    const state = stateRef.current;
    state.heat = Math.min(100, state.heat + amount);
    setHeatLevel(Math.floor(state.heat));

    if (state.heat >= 100) {
      state.overheated = true;
      setIsOverheated(true);
      state.overheatTimer = 90; // Overheat lasts 1.5 seconds (90 frames at 60fps)
    }
  };

  // Fire Tracer Bullet (Micro-SAM Interceptor Rocket)
  const fireTracer = (jetId: string, tx: number, ty: number) => {
    const state = stateRef.current;
    sounds.playShoot();

    // Toggle launch rail of the central SAM turret (left/right rail separation of 90px)
    state.barrelToggle = !state.barrelToggle;
    const railSide = state.barrelToggle ? 'left' : 'right';

    const angle = state.currentLeftAngle;
    const tipLen = 140 - state.recoil; // rail length 140px
    const dy = state.barrelToggle ? -45 : 45; // parallel rails (Y = -45 and Y = 45)

    // Global launch coordinates at the tip of the launch rail
    const bx = 640 + Math.cos(angle) * tipLen - Math.sin(angle) * dy;
    const by = 515 + Math.sin(angle) * tipLen + Math.cos(angle) * dy;

    // Apply minor recoil/shake
    state.recoil = 15;

    // Calculate direct angle from muzzle to target so the tracer flies straight to the target jet being typed
    const directAngle = Math.atan2(ty - by, tx - bx);

    // Create micro-rocket projectile
    state.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      x: bx,
      y: by,
      targetX: tx,
      targetY: ty,
      vx: Math.cos(directAngle) * 22,
      vy: Math.sin(directAngle) * 22,
      speed: 22,
      type: 'tracer',
      jetId,
      trail: [],
      railSide // store which rail it was fired from
    });

    // Increment minor heat
    incrementHeat(4.0);
  };

  // Launch Heavy Homing SAM Missile
  const launchMissile = (jetId: string) => {
    const state = stateRef.current;
    sounds.playShoot();

    const angle = state.currentLeftAngle;
    
    // Choose which rail is loaded
    const isLeft = state.leftMissileReload === 0;
    const dy = isLeft ? -45 : 45;

    // Launch from the rail (X = 40 in rotated coordinates)
    const lx = 640 + Math.cos(angle) * 40 - Math.sin(angle) * dy;
    const ly = 515 + Math.sin(angle) * 40 + Math.cos(angle) * dy;

    // Trigger reload state for the fired rail (75 frames = 1.25 seconds)
    if (isLeft) {
      state.leftMissileReload = 75;
    } else {
      state.rightMissileReload = 75;
    }

    // Spawn the Heavy SAM Interceptor Missile
    state.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      x: lx,
      y: ly,
      targetX: lx + Math.cos(angle) * 80,
      targetY: ly + Math.sin(angle) * 80,
      vx: Math.cos(angle) * 8, // initial rocket push velocity
      vy: Math.sin(angle) * 8,
      speed: 14,
      type: 'missile',
      jetId,
      trail: []
    });

    // Spawn intense rocket backblast particles at the rear breech (X = -90 relative to turret base)
    const rx = 640 + Math.cos(angle) * -90 - Math.sin(angle) * dy;
    const ry = 515 + Math.sin(angle) * -90 + Math.cos(angle) * dy;

    // Backblast fire & smoke particles
    for (let i = 0; i < 15; i++) {
      const pAngle = angle + Math.PI + (Math.random() * 0.6 - 0.3); // blasts backwards
      const pSpeed = 2 + Math.random() * 6;
      state.particles.push({
        id: Math.random().toString(36).substring(2, 9),
        x: rx,
        y: ry,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        color: Math.random() < 0.5 ? '#ef4444' : '#f97316',
        size: 3 + Math.random() * 4,
        alpha: 1,
        life: 25 + Math.random() * 20,
        maxLife: 45
      });
    }

    // Billowing smoke from launch backblast
    for (let i = 0; i < 10; i++) {
      const pAngle = angle + Math.PI + (Math.random() * 1.0 - 0.5);
      const pSpeed = 1 + Math.random() * 3;
      state.particles.push({
        id: Math.random().toString(36).substring(2, 9),
        x: rx,
        y: ry,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed - 0.5,
        color: '#4b5563', // grey smoke
        size: 6 + Math.random() * 8,
        alpha: 0.8,
        life: 40 + Math.random() * 30,
        maxLife: 70
      });
    }

    state.screenShake = Math.max(state.screenShake, 8);
  };

  // Primary requestAnimationFrame Loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Main physics and rendering ticks
    const updateGame = () => {
      const state = stateRef.current;
      state.frameCount++;

      // 1. Screen Shake Decay
      if (state.screenShake > 0) {
        state.screenShake *= 0.9;
        if (state.screenShake < 0.1) state.screenShake = 0;
      }

      // 2. Weapon cooling logic
      if (state.overheated) {
        state.heat = Math.max(0, state.heat - 1.25); // Faster cooling on overheat
        if (state.heat <= 0) {
          state.overheated = false;
          setIsOverheated(false);
        }
      } else {
        state.heat = Math.max(0, state.heat - 0.18); // slow cooling over time
      }
      setHeatLevel(Math.floor(state.heat));

      // Recoil Decay
      if (state.recoil > 0) {
        state.recoil *= 0.85;
      }

      // Decrement missile reload timers
      if (state.leftMissileReload > 0) {
        state.leftMissileReload--;
      }
      if (state.rightMissileReload > 0) {
        state.rightMissileReload--;
      }

      // Spawn barrel cooling smoke if the central gun is hot
      if (state.heat > 0) {
        const angle = state.currentLeftAngle;
        const tipLen = 210 - state.recoil;
        
        // Left barrel muzzle in global coordinates (wide spacing Y = -45)
        const m1x = 640 + Math.cos(angle) * tipLen - Math.sin(angle) * -45;
        const m1y = 515 + Math.sin(angle) * tipLen + Math.cos(angle) * -45;
        
        // Right barrel muzzle in global coordinates (wide spacing Y = 45)
        const m2x = 640 + Math.cos(angle) * tipLen - Math.sin(angle) * 45;
        const m2y = 515 + Math.sin(angle) * tipLen + Math.cos(angle) * 45;

        // Spawn probability scales with heat
        const spawnChance = (state.heat / 100) * 0.35;

        if (Math.random() < spawnChance) {
          state.particles.push({
            id: Math.random().toString(36).substring(2, 9),
            x: m1x,
            y: m1y,
            vx: Math.cos(angle) * 0.8 + (Math.random() * 0.4 - 0.2),
            vy: Math.sin(angle) * 0.8 - 0.5 - Math.random() * 0.8, // drifts upwards
            color: Math.random() < 0.4 ? '#4b5563' : '#94a3b8', // dark / light grey smoke
            size: 2 + Math.random() * 4,
            alpha: 0.5 + Math.random() * 0.2,
            life: 35 + Math.random() * 25,
            maxLife: 60
          });
        }

        if (Math.random() < spawnChance) {
          state.particles.push({
            id: Math.random().toString(36).substring(2, 9),
            x: m2x,
            y: m2y,
            vx: Math.cos(angle) * 0.8 + (Math.random() * 0.4 - 0.2),
            vy: Math.sin(angle) * 0.8 - 0.5 - Math.random() * 0.8, // drifts upwards
            color: Math.random() < 0.4 ? '#4b5563' : '#94a3b8',
            size: 2 + Math.random() * 4,
            alpha: 0.5 + Math.random() * 0.2,
            life: 35 + Math.random() * 25,
            maxLife: 60
          });
        }
      }

      // 3. Spawning Jets
      state.spawnTimer--;
      if (state.spawnTimer <= 0) {
        // Spawn interval scales with Wave Level (from 180 frames down to 50 frames)
        const baseInterval = Math.max(50, 180 - state.wave * 12);
        state.spawnTimer = baseInterval + Math.random() * 40;

        // Generate properties
        const speed = 0.55 + state.wave * 0.08 + Math.random() * 0.25;

        // Fetch word from the queue and push a new one
        let word = 'guul';
        let queueCopy = [...wordQueue];
        if (queueCopy.length > 0) {
          word = queueCopy.shift()!;
        }
        const nextWord = getNextWordForQueue(state.wave);
        queueCopy.push(nextWord);
        setWordQueue(queueCopy);

        const spawnX = 640 + Math.random() * 120 - 60;
        const targetX = 80 + Math.random() * 1120;

        state.jets.push({
          id: Math.random().toString(36).substring(2, 9),
          word,
          originalWord: word,
          x: spawnX,
          y: -40,
          speed,
          width: 75,
          height: 38,
          vx: Math.random() * 0.4 - 0.2,
          wobbleSpeed: 0.02 + Math.random() * 0.03,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleAmount: 1.5 + Math.random() * 2,
          isDying: false,
          scoreValue: word.length * 15 + state.wave * 5,
          spawnX,
          targetX
        });
      }

      // 4. Update Jets Physics
      state.jets = state.jets.map(jet => {
        if (jet.isDying) return jet;

        // Oscillate path slightly for realistic aerodynamic wobble
        jet.wobblePhase += jet.wobbleSpeed;
        const wobbleX = Math.sin(jet.wobblePhase) * jet.wobbleAmount;
        
        const nextY = jet.y + jet.speed;
        const t = Math.max(0, Math.min(1, nextY / 475));
        const nextX = jet.spawnX + (jet.targetX - jet.spawnX) * t + wobbleX * 0.15;

        // Check if jet crashes into defensive city line (Y = 475)
        if (nextY >= 475) {
          // Play explosion sound, shake screen, deal damage, remove jet
          sounds.playExplosion();
          state.screenShake = 16;
          
          state.cityHealth = Math.max(0, state.cityHealth - 15);
          setCityHealth(state.cityHealth);

          // Trigger screen sparks
          for (let i = 0; i < 20; i++) {
            state.particles.push({
              id: Math.random().toString(36).substring(2, 9),
              x: jet.x,
              y: 475,
              vx: (Math.random() * 8 - 4),
              vy: (-Math.random() * 6 - 2),
              color: `hsl(${15 + Math.random() * 20}, 100%, ${50 + Math.random() * 30}%)`, // sparks
              size: 2 + Math.random() * 3,
              alpha: 1,
              life: 40 + Math.random() * 25,
              maxLife: 65
            });
          }

          // If locked to this jet, clear lock
          if (state.lockedJetId === jet.id) {
            state.lockedJetId = null;
            setActiveWord('');
            setTypedPart('');
          }

          if (state.cityHealth <= 0) {
            setGameState('gameover');
          }

          return null; // remove
        }

        return {
          ...jet,
          x: nextX,
          y: nextY
        };
      }).filter(Boolean) as Jet[];

      // 5. Update Projectiles (Tracers and homing missiles)
      state.projectiles = state.projectiles.map(proj => {
        const targetJet = state.jets.find(j => j.id === proj.jetId && !j.isDying);

        if (proj.type === 'tracer') {
          // Tracers travel instantly / very fast linearly
          proj.x += proj.vx;
          proj.y += proj.vy;

          // Check boundary limit
          if (proj.y < 0 || proj.x < 0 || proj.x > 1280) return null;

          // Hit detection
          if (targetJet) {
            const dist = Math.hypot(targetJet.x - proj.x, targetJet.y - proj.y);
            if (dist < 28) {
              // Spawn atmospheric Flak Burst impact particles (explosive AA shell impact)
              for (let i = 0; i < 6; i++) {
                state.particles.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: proj.x + (Math.random() * 12 - 6),
                  y: proj.y + (Math.random() * 12 - 6),
                  vx: (Math.random() * 2 - 1),
                  vy: (Math.random() * 2 - 1) - 0.3, // slow drift
                  color: Math.random() < 0.5 ? '#374151' : '#4b5563', // flak grey
                  size: 3 + Math.random() * 4,
                  alpha: 0.8,
                  life: 20 + Math.random() * 15,
                  maxLife: 35
                });
              }
              // Fire center of flak burst
              for (let i = 0; i < 3; i++) {
                state.particles.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: proj.x,
                  y: proj.y,
                  vx: (Math.random() * 3 - 1.5),
                  vy: (Math.random() * 3 - 1.5),
                  color: '#f97316', // orange core
                  size: 2 + Math.random() * 2,
                  alpha: 1,
                  life: 10 + Math.random() * 8,
                  maxLife: 18
                });
              }
              return null; // destroy tracer
            }
          }
        } else {
          // Missile homing logic
          if (!targetJet) {
            // No target left, launch straight up and detonate
            proj.y -= proj.speed;
            if (proj.y < -20) return null;
          } else {
            // Home towards target center mass
            const dx = targetJet.x - proj.x;
            const dy = targetJet.y - proj.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 18) {
              // Direct Hit! Explode and destroy jet
              sounds.playExplosion();
              
              // Increment scores and stats
              state.score += targetJet.scoreValue;
              state.jetsDestroyed += 1;
              setScore(state.score);
              setTotalJetsDestroyed(state.jetsDestroyed);

              // Dynamically scale wave levels every 8 jets
              const calculatedWave = Math.floor(state.jetsDestroyed / 8) + 1;
              if (calculatedWave > state.wave) {
                state.wave = calculatedWave;
                setWave(calculatedWave);
              }

              state.screenShake = Math.max(state.screenShake, 10);

              // 1. Spawn explosion particles
              for (let i = 0; i < 45; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 7;
                state.particles.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: targetJet.x,
                  y: targetJet.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed - 1.5, // slightly upward bias
                  color: `hsl(${10 + Math.random() * 30}, 100%, ${50 + Math.random() * 25}%)`, // Firecolors
                  size: 3 + Math.random() * 6,
                  alpha: 1,
                  life: 40 + Math.random() * 30,
                  maxLife: 70
                });
              }

              // 2. Spawn spark embers
              for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 6 + Math.random() * 9;
                state.particles.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: targetJet.x,
                  y: targetJet.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  color: '#fed7aa', // bright yellow embers
                  size: 1 + Math.random() * 1.5,
                  alpha: 1,
                  life: 25 + Math.random() * 15,
                  maxLife: 40
                });
              }

              // Remove jet
              state.jets = state.jets.filter(j => j.id !== targetJet.id);

              return null; // destroy missile
            }

            // Homing steering adjustments
            const steerX = dx / dist;
            const steerY = dy / dist;

            proj.vx = proj.vx * 0.85 + steerX * proj.speed * 0.15;
            proj.vy = proj.vy * 0.85 + steerY * proj.speed * 0.15;

            proj.x += proj.vx;
            proj.y += proj.vy;
          }

          // Spawn missile smoke trail points
          proj.trail.push({ x: proj.x, y: proj.y, alpha: 1.0 });
          proj.trail = proj.trail.map(t => ({ ...t, alpha: t.alpha - 0.05 })).filter(t => t.alpha > 0);
        }

        return proj;
      }).filter(Boolean) as Projectile[];

      // 6. Update Casings
      state.casings = state.casings.map(c => {
        c.vy += 0.25; // gravity
        c.x += c.vx;
        c.y += c.vy;
        c.angle += c.vAngle;

        // Bounce off bottom armor bulkhead (Y = 540)
        if (c.y >= 540) {
          c.y = 540;
          c.vy = -c.vy * 0.45; // dampening
          c.vx *= 0.6;
          c.vAngle *= 0.5;
          c.bounces++;
        }

        if (c.bounces > 3 || c.x < 0 || c.x > 1280) return null;
        return c;
      }).filter(Boolean) as Casing[];

      // 7. Update Particles
      state.particles = state.particles.map(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // minor gravity for embers
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life <= 0) return null;
        return p;
      }).filter(Boolean) as Particle[];

      // 8. Update Background Smoke
      state.smokePlumes.forEach(p => {
        p.y += p.vy;
        p.x += Math.sin(state.frameCount * 0.005 + p.y * 0.01) * 0.12; // slow sway
        if (p.y < -50) {
          p.y = 480;
          p.x = 100 + Math.random() * 1080;
          p.alpha = 0.12 + Math.random() * 0.15;
        }
      });

      // 9. RENDER SCENE ON CANVAS
      ctx.clearRect(0, 0, 1280, 600);
      ctx.save();

      // Screen Shake translation
      if (state.screenShake > 0) {
        const shakeX = (Math.random() * 2 - 1) * state.screenShake;
        const shakeY = (Math.random() * 2 - 1) * state.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // Draw Real Background Image from User (cropped to remove the right-side hazard panel)
      if (bgImageRef.current && isBgLoaded) {
        const imgWidth = bgImageRef.current.naturalWidth || bgImageRef.current.width || 1280;
        const imgHeight = bgImageRef.current.naturalHeight || bgImageRef.current.height || 600;
        // Crop the right 6.25% (80px out of 1280px width) of the background image
        const cropWidth = imgWidth * (1200 / 1280);
        ctx.drawImage(bgImageRef.current, 0, 0, cropWidth, imgHeight, 0, 0, 1280, 600);
      } else {
        // Fallback Twilight Sky
        const skyGradient = ctx.createLinearGradient(0, 0, 0, 500);
        skyGradient.addColorStop(0, '#04030a'); // Dark deep night blue
        skyGradient.addColorStop(0.3, '#0b0616'); // Dark purple
        skyGradient.addColorStop(0.55, '#2b1029'); // Deep magenta/crimson
        skyGradient.addColorStop(0.8, '#592025'); // Sunset crimson/red
        skyGradient.addColorStop(0.92, '#8c3222'); // Warm sunset orange
        skyGradient.addColorStop(1, '#a64f28'); // Horizon glow
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, 1280, 600);
      }

      // Draw active particles/smoke plumes (makes the background feel animated!)
      state.smokePlumes.forEach(p => {
        ctx.save();
        const radGrd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        radGrd.addColorStop(0, `rgba(32, 28, 38, ${p.alpha * 0.8})`);
        radGrd.addColorStop(0.6, `rgba(20, 18, 24, ${p.alpha * 0.3})`);
        radGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radGrd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Overlay the moving searchlight beams to make the sky feel alive!
      ctx.save();
      for (let i = 0; i < 2; i++) {
        const sX = i === 0 ? 150 : 750;
        const angle = -Math.PI/3 + Math.sin(state.frameCount * 0.003 + i) * 0.25;
        const beamLen = 800;
        const targetX = sX + Math.cos(angle) * beamLen;
        const targetY = 600 + Math.sin(angle) * beamLen;
        
        const beamGrd = ctx.createLinearGradient(sX, 600, targetX, targetY);
        beamGrd.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        beamGrd.addColorStop(0.5, 'rgba(186, 230, 253, 0.02)');
        beamGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.strokeStyle = beamGrd;
        ctx.lineWidth = 35;
        ctx.beginPath();
        ctx.moveTo(sX, 600);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      }
      ctx.restore();

      // Animate battle sky flashes / tracer streaks crossing the twilight sky
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.12)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const tOffset = (state.frameCount * 0.35 + i * 280) % 1800;
        ctx.beginPath();
        ctx.moveTo(tOffset - 300, 600);
        ctx.lineTo(tOffset + 200, -100);
        ctx.stroke();
      }

      // Draw Jet Fighters (FPP perspective, facing forward, scaling up)
      state.jets.forEach(jet => {
        ctx.save();
        ctx.translate(jet.x, jet.y);

        // Scale increases as the jet moves down (approaches camera)
        const scale = 0.5 + (jet.y / 475) * 1.5;
        ctx.scale(scale, scale);

        // Aerodynamic sway/roll
        const rollAngle = jet.vx * 0.15;
        ctx.rotate(rollAngle);

        // Draw wingtip vapor contrails (left/right ends)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-45, -6);
        ctx.lineTo(-45, -50);
        ctx.moveTo(45, -6);
        ctx.lineTo(45, -50);
        ctx.stroke();

        // Vector shapes of modern forward-facing jet (like F-18/Su-35)
        const wingGrad = ctx.createLinearGradient(-45, 0, 45, 0);
        wingGrad.addColorStop(0, '#374151'); // Dark grey wingtip
        wingGrad.addColorStop(0.3, '#4b5563'); // Medium military grey
        wingGrad.addColorStop(0.5, '#6b7280'); // Center fuselage shine
        wingGrad.addColorStop(0.7, '#4b5563');
        wingGrad.addColorStop(1, '#374151');
        
        ctx.fillStyle = wingGrad;
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1;

        // Draw wings & stabilizers
        // Left Wing
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(-45, -6); // left wing tip
        ctx.lineTo(-43, -12);
        ctx.lineTo(-6, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Wing
        ctx.beginPath();
        ctx.moveTo(6, -4);
        ctx.lineTo(45, -6); // right wing tip
        ctx.lineTo(43, -12);
        ctx.lineTo(6, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Underwing Weapon Pods / Missiles
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-28, -6, 4, 8);
        ctx.fillRect(24, -6, 4, 8);
        ctx.fillStyle = '#ef4444'; // Red missile tips
        ctx.fillRect(-28, 2, 4, 2);
        ctx.fillRect(24, 2, 4, 2);

        // Twin vertical stabilizers (Tail fins pointing up/outwards)
        ctx.fillStyle = '#1f2937';
        // Left Fin
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(-20, -26);
        ctx.lineTo(-14, -26);
        ctx.lineTo(-5, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Fin
        ctx.beginPath();
        ctx.moveTo(10, -8);
        ctx.lineTo(20, -26);
        ctx.lineTo(14, -26);
        ctx.lineTo(5, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Central Fuselage cylindrical shading
        const bodyGrad = ctx.createLinearGradient(-6, 0, 6, 0);
        bodyGrad.addColorStop(0, '#1f2937');
        bodyGrad.addColorStop(0.5, '#4b5563');
        bodyGrad.addColorStop(1, '#1f2937');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.moveTo(0, 26); // nose cone pointing forward
        ctx.lineTo(-6, -6);
        ctx.lineTo(-6, -18);
        ctx.lineTo(6, -18);
        ctx.lineTo(6, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Engine Intake slots
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-8, -4, 2, 10);
        ctx.fillRect(6, -4, 2, 10);

        // Cyan glowing cockpit canopy glass with metallic/shiny white reflection
        const canopyGrad = ctx.createRadialGradient(0, 2, 1, 0, 4, 8);
        canopyGrad.addColorStop(0, '#e0f7fa'); // shiny center
        canopyGrad.addColorStop(0.4, '#00e5ff'); // bright cyan
        canopyGrad.addColorStop(1, '#00838f'); // dark teal border
        
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 4, 4.5, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight white line on canopy
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-1.5, 6);
        ctx.lineTo(1, 0);
        ctx.stroke();

        ctx.restore();

        // Draw Somali Word Label Box (High Contrast Pill)
        ctx.save();
        ctx.font = 'bold 14px "Arial", sans-serif';
        const wordText = jet.originalWord.toUpperCase();
        const textWidth = ctx.measureText(wordText).width;

        const boxWidth = textWidth + 24;
        const boxHeight = 26;
        const bx = jet.x - boxWidth / 2;
        const by = jet.y - 42 - scale * 8; // offsets higher as jet approaches

        // Label pill background with subtle glow
        ctx.fillStyle = 'rgba(12, 12, 16, 0.88)';
        ctx.strokeStyle = state.lockedJetId === jet.id ? '#06b6d4' : '#e4e4e7';
        ctx.lineWidth = state.lockedJetId === jet.id ? 2.5 : 1.2;
        
        ctx.beginPath();
        ctx.roundRect(bx, by, boxWidth, boxHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Draw labeled word text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textX = bx + boxWidth / 2;
        const textY = by + boxHeight / 2 + 0.5;

        if (state.lockedJetId === jet.id) {
          // Highlight typed characters in green-cyan
          const typedLen = typedPart.length;
          const matchedText = wordText.slice(0, typedLen);
          const remainingText = wordText.slice(typedLen);
          
          ctx.textAlign = 'left';
          const matchWidth = ctx.measureText(matchedText).width;
          const fullWidth = ctx.measureText(wordText).width;
          const startX = textX - fullWidth / 2;

          ctx.fillStyle = '#34d399'; // green matched
          ctx.font = 'bold 15px "Arial", sans-serif';
          ctx.fillText(matchedText, startX, textY);

          ctx.fillStyle = '#ffffff'; // white remaining
          ctx.fillText(remainingText, startX + matchWidth, textY);
        } else {
          ctx.fillStyle = '#ffffff'; // white standard labels as screenshot
          ctx.fillText(wordText, textX, textY);
        }

        ctx.restore();
      });

      // Draw Homing Missiles Smoke Trails
      state.projectiles.forEach(proj => {
        if (proj.type === 'missile') {
          proj.trail.forEach(pt => {
            ctx.save();
            ctx.globalAlpha = pt.alpha * 0.45;
            ctx.fillStyle = '#4b5563';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4 + (1 - pt.alpha) * 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }
      });

      // Draw Active Projectiles (Tracers & Missiles)
      state.projectiles.forEach(proj => {
        if (proj.type === 'tracer') {
          ctx.save();
          
          // 1. Draw a beautiful, high-speed glowing tracer streak
          // Outer thick orange-red glow
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(proj.x - proj.vx * 1.8, proj.y - proj.vy * 1.8);
          ctx.lineTo(proj.x, proj.y);
          ctx.stroke();

          // Inner bright orange core
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(proj.x - proj.vx * 1.2, proj.y - proj.vy * 1.2);
          ctx.lineTo(proj.x, proj.y);
          ctx.stroke();

          // Hot white center core
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(proj.x - proj.vx * 0.6, proj.y - proj.vy * 0.6);
          ctx.lineTo(proj.x, proj.y);
          ctx.stroke();

          // Draw the micro-rocket at the tip of the trail
          ctx.save();
          ctx.translate(proj.x, proj.y);
          const rAngle = Math.atan2(proj.vy, proj.vx);
          ctx.rotate(rAngle);

          // Micro-rocket body (small white cylinder)
          const rBodyGrd = ctx.createLinearGradient(0, -2.5, 0, 2.5);
          rBodyGrd.addColorStop(0, '#ffffff');
          rBodyGrd.addColorStop(1, '#94a3b8');
          ctx.fillStyle = rBodyGrd;
          ctx.fillRect(-8, -2.5, 8, 5);
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-8, -2.5, 8, 5);
          
          // Red nose tip
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(0, -2.5);
          ctx.lineTo(5, 0);
          ctx.lineTo(0, 2.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Tail fins
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-10, -4, 2, 8);

          // Glowing rocket motor flame
          const flameLen = 6 + Math.random() * 5;
          const flameGrd = ctx.createLinearGradient(-8 - flameLen, 0, -8, 0);
          flameGrd.addColorStop(0, 'rgba(239, 68, 68, 0)');
          flameGrd.addColorStop(0.5, '#f97316');
          flameGrd.addColorStop(1, '#fef08a');
          ctx.fillStyle = flameGrd;
          ctx.beginPath();
          ctx.moveTo(-8, -1.8);
          ctx.lineTo(-8 - flameLen, 0);
          ctx.lineTo(-8, 1.8);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
          ctx.restore();
        } else {
          // Draw Heavy SAM Interceptor Missile
          ctx.save();
          ctx.translate(proj.x, proj.y);
          const rAngle = Math.atan2(proj.vy, proj.vx);
          ctx.rotate(rAngle);

          // Large 3D-shaded rocket body (white/grey military paint)
          const bodyGrd = ctx.createLinearGradient(0, -3.5, 0, 3.5);
          bodyGrd.addColorStop(0, '#ffffff');
          bodyGrd.addColorStop(0.4, '#e2e8f0');
          bodyGrd.addColorStop(0.8, '#94a3b8');
          bodyGrd.addColorStop(1, '#475569');
          ctx.fillStyle = bodyGrd;
          ctx.fillRect(-18, -3.5, 18, 7);
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-18, -3.5, 18, 7);

          // Red warhead nose cone
          const noseGrd = ctx.createLinearGradient(0, -3.5, 0, 3.5);
          noseGrd.addColorStop(0, '#f87171');
          noseGrd.addColorStop(0.5, '#ef4444');
          noseGrd.addColorStop(1, '#991b1b');
          ctx.fillStyle = noseGrd;
          ctx.beginPath();
          ctx.moveTo(0, -3.5);
          ctx.lineTo(10, 0); // pointed nose cone
          ctx.lineTo(0, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Yellow/black hazard band near the nose
          ctx.fillStyle = '#eab308';
          ctx.fillRect(-3, -3.5, 2.5, 7);

          // Dark tail fins
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(-18, -3.5);
          ctx.lineTo(-24, -8);
          ctx.lineTo(-21, -8);
          ctx.lineTo(-15, -3.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(-18, 3.5);
          ctx.lineTo(-24, 8);
          ctx.lineTo(-21, 8);
          ctx.lineTo(-15, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Middle stabilizing fins
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(-8, -3.5);
          ctx.lineTo(-11, -6);
          ctx.lineTo(-8, -6);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(-8, 3.5);
          ctx.lineTo(-11, 6);
          ctx.lineTo(-8, 6);
          ctx.closePath();
          ctx.fill();

          // Powerful volumetric rocket motor exhaust flame
          const flameLen = 14 + Math.random() * 10;
          const flameGrd = ctx.createRadialGradient(-18, 0, 2, -18 - flameLen * 0.5, 0, flameLen);
          flameGrd.addColorStop(0, '#ffffff'); // blinding white core
          flameGrd.addColorStop(0.3, '#fef08a'); // hot yellow
          flameGrd.addColorStop(0.6, '#f97316'); // orange
          flameGrd.addColorStop(1, 'rgba(239, 68, 68, 0)');
          
          ctx.fillStyle = flameGrd;
          ctx.beginPath();
          ctx.ellipse(-18 - flameLen * 0.5, 0, flameLen * 0.5, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });

      // Draw Target Lock Reticle overlay
      if (state.lockedJetId !== null) {
        const lockedJet = state.jets.find(j => j.id === state.lockedJetId && !j.isDying);
        if (lockedJet) {
          ctx.save();
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.5 + Math.sin(state.frameCount * 0.15) * 0.25})`; // cyan pulsing lock reticle
          ctx.lineWidth = 1.5;

          const cx = lockedJet.x;
          const cy = lockedJet.y;
          const r = 38 + Math.sin(state.frameCount * 0.1) * 4;

          // Outer reticle circle
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();

          // Inner crosshairs
          ctx.beginPath();
          ctx.moveTo(cx - r - 4, cy);
          ctx.lineTo(cx - r + 4, cy);
          ctx.moveTo(cx + r - 4, cy);
          ctx.lineTo(cx + r + 4, cy);
          ctx.moveTo(cx, cy - r - 4);
          ctx.lineTo(cx, cy - r + 4);
          ctx.moveTo(cx, cy + r - 4);
          ctx.lineTo(cx, cy + r + 4);
          ctx.stroke();

          ctx.restore();
        }
      }

      // Draw Ejected Brass Casings
      state.casings.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        
        // Shiny brass shell casing (metallic gold gradient)
        const casingGrd = ctx.createLinearGradient(0, -1.5, 0, 1.5);
        casingGrd.addColorStop(0, '#fef08a'); // shiny yellow
        casingGrd.addColorStop(0.5, '#f59e0b'); // gold
        casingGrd.addColorStop(1, '#78350f'); // dark amber
        
        ctx.fillStyle = casingGrd;
        ctx.fillRect(-4, -1.5, 8, 3);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-4, -1.5, 8, 3);
        
        ctx.restore();
      });

      // Draw Particles
      state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw FPP twin-barrels in foreground pointing upwards
      ctx.save();

      // Target position tracking for the central double-barrel gun
      let tx = 640;
      let ty = 515;

      // Central gun base coordinates (centered at X = 640, Y = 515)
      const cx = 640;
      const cy = 515;
      let targetAngle = -20 * Math.PI / 180; // default resting angle (flat right)

      if (state.lockedJetId !== null) {
        const lockedJet = state.jets.find(j => j.id === state.lockedJetId);
        if (lockedJet) {
          tx = lockedJet.x;
          ty = lockedJet.y;
          
          // Calculate angle to target
          targetAngle = Math.atan2(ty - cy, tx - cx);
          
          // Prevent the gun from standing straight up (vertical)
          // Force a minimum slant angle (at least 35 degrees from vertical)
          // This means the angle must NOT be in the vertical "standing" zone of -125° to -55°
          const rad125 = -125 * Math.PI / 180;
          const rad55 = -55 * Math.PI / 180;
          if (targetAngle < rad55 && targetAngle > rad125) {
            // Target is in the vertical zone. Force the gun to slant to the side of the target.
            if (tx < 640) {
              targetAngle = rad125; // slant left
            } else {
              targetAngle = rad55;  // slant right
            }
          }
        }
      } else {
        // Idle/Resting state: force the gun to lie flat
        // LERP towards -20 degrees (flat right) with a gentle breathing sway
        const restingBase = -20 * Math.PI / 180;
        const sway = Math.sin(state.frameCount * 0.02) * (3 * Math.PI / 180); // 3-degree sway
        targetAngle = restingBase + sway;
      }

      // Clamp absolute limits to prevent pointing below deck horizon
      targetAngle = Math.max(-165 * Math.PI / 180, Math.min(-15 * Math.PI / 180, targetAngle));

      // LERP rotation for smooth tracking
      if (state.currentLeftAngle === undefined) {
        state.currentLeftAngle = targetAngle;
      } else {
        let diff = targetAngle - state.currentLeftAngle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        state.currentLeftAngle += diff * 0.12; // Smooth LERP rotation
      }

      // 1. Draw Rotating Central Heavy Surface-to-Air Missile (SAM) Launcher Turret
      const drawRealisticGun = (bx: number, by: number, angle: number, isFiring: boolean) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle);

        // --- 1. TURRET SWIVEL BASE & GEAR RING ---
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-50, -42, 100, 84);
        
        // Rotating gear teeth
        ctx.fillStyle = '#1e293b';
        for (let ga = -Math.PI; ga < Math.PI; ga += Math.PI / 12) {
          const gx = Math.cos(ga) * 44;
          const gy = Math.sin(ga) * 44;
          ctx.fillRect(gx - 3, gy - 3, 6, 6);
        }

        // Swivel Base Outer Collar (Gunmetal steel)
        const baseCollarGrd = ctx.createRadialGradient(0, 0, 32, 0, 0, 46);
        baseCollarGrd.addColorStop(0, '#334155');
        baseCollarGrd.addColorStop(0.5, '#1e293b');
        baseCollarGrd.addColorStop(0.8, '#475569');
        baseCollarGrd.addColorStop(1, '#020617');
        ctx.fillStyle = baseCollarGrd;
        ctx.beginPath();
        ctx.arc(0, 0, 46, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 46, 0, Math.PI * 2);
        ctx.stroke();

        // Base bolts
        ctx.fillStyle = '#94a3b8';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const bx = Math.cos(a) * 38;
          const by = Math.sin(a) * 38;
          ctx.beginPath();
          ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        // --- 2. HEAVY ARMORED SAM LAUNCHER HOUSING ---
        const launcherGrd = ctx.createLinearGradient(-90, 0, 30, 0);
        launcherGrd.addColorStop(0, '#0f172a');
        launcherGrd.addColorStop(0.3, '#1e293b'); // military grey
        launcherGrd.addColorStop(0.7, '#334155');
        launcherGrd.addColorStop(1, '#0b132b');
        ctx.fillStyle = launcherGrd;
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        // Angular turret box
        ctx.moveTo(-90, -40);
        ctx.lineTo(15, -40);
        ctx.lineTo(30, -20);
        ctx.lineTo(30, 20);
        ctx.lineTo(15, 40);
        ctx.lineTo(-90, 40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rivets along the launcher housing edges
        ctx.fillStyle = '#64748b';
        const rxList = [-80, -50, -20, 10];
        rxList.forEach(rx => {
          ctx.beginPath();
          ctx.arc(rx, -35, 1.8, 0, Math.PI * 2);
          ctx.arc(rx, 35, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#020617'; ctx.stroke();
        });

        // Horizontal armored panel plates
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.fillRect(-70, -28, 90, 56);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(-70, -28, 90, 56);

        // --- 3. CENTRAL SPINNING TACTICAL RADAR DISH ---
        ctx.save();
        ctx.translate(-25, 0);
        
        // Radar base ring
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Spin the radar dish array based on framecount
        const radarAngle = state.frameCount * 0.08;
        ctx.rotate(radarAngle);

        // Radar dish curvature (orange/gold glowing lines)
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        // Radar support struts
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(0) * 16, Math.sin(0) * 16);
        ctx.stroke();

        // Radar feed horn at the focus
        ctx.fillStyle = '#ef4444'; // glowing red receiver horn
        ctx.beginPath();
        ctx.arc(6, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // --- 4. TWIN HEAVY LAUNCHING RAILS (GUIDE CRADLES) ---
        const drawLaunchRail = (dy: number) => {
          ctx.save();
          ctx.translate(0, dy);

          // Launch cradle base rail
          const railGrd = ctx.createLinearGradient(0, -7, 0, 7);
          railGrd.addColorStop(0, '#1e293b');
          railGrd.addColorStop(0.4, '#475569');
          railGrd.addColorStop(0.7, '#334155');
          railGrd.addColorStop(1, '#0f172a');
          
          ctx.fillStyle = railGrd;
          ctx.fillRect(-70, -7, 150, 14);
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-70, -7, 150, 14);

          // Guide rail notches
          ctx.fillStyle = '#090d16';
          for (let rx = -50; rx <= 60; rx += 22) {
            ctx.fillRect(rx, -9, 8, 2);
            ctx.fillRect(rx, 7, 8, 2);
          }

          ctx.restore();
        };

        drawLaunchRail(-45);
        drawLaunchRail(45);

        // --- 5. SAM INTERCEPTOR MISSILES ON THE RAILS (WITH RELOAD ANIMATION) ---
        const drawMissileOnRail = (dy: number, isLeft: boolean) => {
          const reloadTimer = isLeft ? state.leftMissileReload : state.rightMissileReload;

          // If reloading, we animate it sliding onto the rail
          let slideX = 0;
          let alpha = 1.0;
          let drawMissile = true;

          if (reloadTimer > 0) {
            if (reloadTimer > 50) {
              drawMissile = false;
            } else {
              const progress = (50 - reloadTimer) / 50; // 0 to 1
              slideX = -80 + progress * 80;
              alpha = progress;
            }
          }

          if (drawMissile) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(slideX, dy);

            // Sleek 3D Missile Body
            const missileWidth = 11;
            const bodyGrd = ctx.createLinearGradient(0, -missileWidth/2, 0, missileWidth/2);
            bodyGrd.addColorStop(0, '#ffffff');
            bodyGrd.addColorStop(0.3, '#f1f5f9');
            bodyGrd.addColorStop(0.6, '#cbd5e1'); // shiny ridge
            bodyGrd.addColorStop(0.8, '#94a3b8');
            bodyGrd.addColorStop(1, '#1e293b');
            ctx.fillStyle = bodyGrd;
            ctx.fillRect(-40, -missileWidth/2, 110, missileWidth);
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-40, -missileWidth/2, 110, missileWidth);

            // Pointed High-Explosive Warhead Nose Cone
            const noseGrd = ctx.createLinearGradient(0, -missileWidth/2, 0, missileWidth/2);
            noseGrd.addColorStop(0, '#f87171');
            noseGrd.addColorStop(0.5, '#ef4444');
            noseGrd.addColorStop(1, '#991b1b');
            ctx.fillStyle = noseGrd;
            ctx.beginPath();
            ctx.moveTo(70, -missileWidth/2);
            ctx.lineTo(95, 0); // pointed tip
            ctx.lineTo(70, missileWidth/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Yellow/black warning band around nose
            ctx.fillStyle = '#eab308';
            ctx.fillRect(60, -missileWidth/2, 5, missileWidth);
            ctx.fillStyle = '#020617';
            ctx.fillRect(62, -missileWidth/2, 1.5, missileWidth);

            // Heavy Tail Fins (Stabilizers)
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(-40, -missileWidth/2);
            ctx.lineTo(-48, -13);
            ctx.lineTo(-44, -13);
            ctx.lineTo(-32, -missileWidth/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-40, missileWidth/2);
            ctx.lineTo(-48, 13);
            ctx.lineTo(-44, 13);
            ctx.lineTo(-32, missileWidth/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Middle swept fins
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(15, -missileWidth/2);
            ctx.lineTo(8, -9);
            ctx.lineTo(15, -9);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(15, missileWidth/2);
            ctx.lineTo(8, 9);
            ctx.lineTo(15, 9);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
          }
        };

        drawMissileOnRail(-45, true);
        drawMissileOnRail(45, false);

        // --- 6. FLOATING HUD HEAT SENSOR LED (ON CENTRAL CONSOLE) ---
        const ledGrd = ctx.createRadialGradient(-36, -4, 0.5, -36, -4, 4);
        if (state.overheated) {
          ledGrd.addColorStop(0, '#f87171');
          ledGrd.addColorStop(1, '#991b1b');
        } else {
          const intensity = Math.floor(state.heat * 2.5);
          ledGrd.addColorStop(0, `rgb(245, ${245 - intensity}, 15)`);
          ledGrd.addColorStop(1, '#78350f');
        }
        ctx.fillStyle = ledGrd;
        ctx.beginPath();
        ctx.arc(-36, -4, 3, 0, Math.PI * 2);
        ctx.fill();

        // --- 7. DYNAMIC ROCKET EXHAUST BACKBLAST (DURING FIRING) ---
        if (isFiring && state.recoil > 5 && state.frameCount % 2 === 0) {
          const drawBackblast = (my: number) => {
            ctx.save();

            const blastLen = 45 + Math.random() * 15;
            const blastWidth = 24 + Math.random() * 8;
            const rx = -90; // emerging from rear breech

            // Rocket backblast fire plume expanding backwards
            const fireGrd = ctx.createRadialGradient(rx, my, 2, rx - 10, my, blastLen);
            fireGrd.addColorStop(0, '#ffffff'); // hot core
            fireGrd.addColorStop(0.3, '#fef08a'); // yellow
            fireGrd.addColorStop(0.6, '#f97316'); // orange
            fireGrd.addColorStop(1, 'rgba(239, 68, 68, 0)');
            
            ctx.fillStyle = fireGrd;
            ctx.beginPath();
            ctx.ellipse(rx - blastLen * 0.5, my, blastLen * 0.5, blastWidth * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          };

          const activeRailY = state.barrelToggle ? -45 : 45;
          drawBackblast(activeRailY);
        }

        ctx.restore();
      };

      const centralIsFiring = state.lockedJetId !== null && state.recoil > 0;

      // Draw Rotating Central SAM Launcher Turret
      drawRealisticGun(640, 515, state.currentLeftAngle, centralIsFiring);

      ctx.restore(); // end screen shake translation

      // Continue Frame Loops
      gameLoopRef.current = requestAnimationFrame(updateGame);
    };

    // Begin Animation Loop
    gameLoopRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, wordQueue]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 select-none relative">
      
      {/* 1. START OVERLAY */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-40 bg-zinc-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-center p-6 border border-zinc-800 shadow-2xl">
          <div className="max-w-xl flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white border border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
              <Target className="w-10 h-10" />
            </div>

            <div>
              <h1 className="text-4xl md:text-5xl font-black text-zinc-100 uppercase tracking-wider font-serif">
                Farmaal Combat
              </h1>
              <p className="text-sm text-red-500 font-extrabold uppercase tracking-widest mt-1">
                Air Defense Typing Simulation
              </p>
            </div>

            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-medium">
              Duullaanno cirka ah ayaa ku soo socda magaalada. Gacanta ku hay madaafiicda lidka diyaaradaha,
              ku toosi dabar-goynta adigoo qoraya erayada ku dul qoran diyaaradaha dagaalka. 
              Magaalada difaac ilaa xabada ugu dambaysa!
            </p>

            <div className="grid grid-cols-3 gap-4 w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80 text-center">
              <div>
                <span className="block text-zinc-500 text-[10px] uppercase font-bold">Lock-On</span>
                <span className="text-zinc-200 text-xs font-black">Xarafka 1aad</span>
              </div>
              <div>
                <span className="block text-zinc-500 text-[10px] uppercase font-bold">Sound FX</span>
                <span className="text-zinc-200 text-xs font-black">Synthesized</span>
              </div>
              <div>
                <span className="block text-zinc-500 text-[10px] uppercase font-bold">Heerka 91</span>
                <span className="text-zinc-200 text-xs font-black">Loo Baahan Yahay</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-10 py-4 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.4)] text-sm tracking-wider uppercase"
            >
              BILOW COMBAT
            </button>
          </div>
        </div>
      )}

      {/* 2. GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-40 bg-zinc-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-center p-6 border border-zinc-800 shadow-2xl">
          <div className="max-w-md flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-red-500 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-zinc-100 uppercase tracking-wide">
                Dagaalku Wuu Dhamaaday
              </h2>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                Magaaladii waa la burburiyay
              </p>
            </div>

            <div className="w-full bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-500 text-xs">Dhibcaha (Score):</span>
                <span className="text-zinc-100 font-extrabold text-sm">{score}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-500 text-xs">Diyaaradaha la toogtay:</span>
                <span className="text-zinc-100 font-extrabold text-sm">{totalJetsDestroyed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs">Mowjada ugu dambaysa:</span>
                <span className="text-red-500 font-extrabold text-sm">Wave {wave}</span>
              </div>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={startGame}
                className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-amber-500 text-white font-extrabold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:from-red-500 hover:to-amber-400 text-xs uppercase"
              >
                <RotateCcw className="w-4 h-4" />
                Ku Celi Dagaalka
              </button>
              <button
                onClick={onBackToSelector}
                className="px-6 py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:bg-zinc-800 text-xs uppercase"
              >
                <Home className="w-4 h-4" />
                Ku Noqo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SCI-FI HUD DASHBOARD OVERLAYS */}
      {/* Container wrapper for absolute placement over canvas */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        
        {/* Hidden Input field to capture text inputs */}
        <input
          ref={inputRef}
          type="text"
          value=""
          onChange={() => {}}
          onKeyDown={handleKeyDown}
          className="absolute opacity-0 top-0 left-0 pointer-events-none w-0 h-0"
          autoFocus={gameState === 'playing'}
          onBlur={() => {
            // Keep focused on keyboard gameplay
            if (gameState === 'playing') {
              setTimeout(() => inputRef.current?.focus(), 10);
            }
          }}
        />

        <canvas
          ref={canvasRef}
          width={1280}
          height={600}
          onClick={() => inputRef.current?.focus()}
          className="w-full h-auto block cursor-crosshair bg-zinc-950"
        />

        {/* HUD Elements Overlaying Canvas */}
        {gameState === 'playing' && (
          <>
            {/* Top-Left: Score and Wave */}
            <div className="absolute top-6 left-8 flex flex-col gap-1 z-30 font-['Rajdhani'] pointer-events-none select-none">
              <div className="flex items-center gap-2 text-zinc-100 font-extrabold text-2xl tracking-wide drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]">
                {/* 3 bullet rounds standing together */}
                <svg className="w-5 h-5 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 6c0-1.5 1-3 2-4 1 1 2 2.5 2 4v14H7V6z M13 8c0-1.5 1-3 2-4 1 1 2 2.5 2 4v12h-4V8z M1 10c0-1.5 1-3 2-4 1 1 2 2.5 2 4v10H1V10z" />
                </svg>
                <span>{score.toLocaleString()}</span>
              </div>
              <div className="text-sm text-zinc-100 font-extrabold tracking-widest uppercase">
                WAVE {wave}
              </div>
            </div>

            {/* Top-Right: Sound Toggle Control */}
            <div className="absolute top-6 right-8 z-30">
              <button 
                onClick={toggleMute} 
                className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-950/80 text-zinc-450 hover:text-zinc-200 transition-colors flex items-center justify-center pointer-events-auto shadow-md"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {/* Bottom-Left: Health Bar HUD with Plus Sign Box */}
            <div className="absolute bottom-6 left-8 flex items-end gap-3.5 z-30 font-['Rajdhani'] pointer-events-none select-none">
              <div className="w-9 h-9 border border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-100 text-xl font-extrabold rounded-sm shadow-md">
                +
              </div>
              <div className="flex flex-col gap-1 w-52">
                <span className="text-[10px] text-zinc-100 font-extrabold uppercase tracking-widest leading-none">HEALTH</span>
                <div className="h-4 bg-red-700 border border-zinc-700 rounded-sm overflow-hidden p-[2px] w-full">
                  <div 
                    className="h-full bg-zinc-100 transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                    style={{ width: `${cityHealth}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom-Center: Current Word / Homing Missile lock, Next Word Sequence queue */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3.5 z-30 pointer-events-none select-none">
              
              {/* CURRENT WORD display box with cyan outline */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-cyan-400 font-extrabold tracking-widest uppercase mb-1 font-['Rajdhani']">CURRENT WORD</span>
                <div className="min-w-[280px] bg-zinc-950 border border-cyan-400 px-6 py-2.5 rounded-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] text-center">
                  {activeWord ? (
                    <span className="text-2xl font-extrabold tracking-widest text-cyan-450 font-['Orbitron'] drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
                      {typedPart.toUpperCase()}
                      <span className="text-zinc-500">{activeWord.slice(typedPart.length).toUpperCase()}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-zinc-500 tracking-wider font-['Rajdhani']">NO LOCKED TARGET</span>
                  )}
                </div>
              </div>

              {/* NEXT WORD display queue list with orange outline */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-orange-500 font-extrabold tracking-widest uppercase mb-0.5 font-['Rajdhani']">NEXT WORD</span>
                <div className="bg-zinc-950 border border-orange-500/80 px-6 py-2 rounded-sm shadow-[0_0_15px_rgba(249,115,22,0.15)] flex gap-4 text-sm font-extrabold text-orange-500 tracking-widest font-['Rajdhani']">
                  {wordQueue.map(w => w.toUpperCase()).join('   ')}
                </div>
              </div>
            </div>

            {/* Bottom-Right: White Diamond-Star Emblem & Sleek Mini Gun Heat Bar */}
            <div className="absolute bottom-6 right-8 flex items-end gap-3.5 z-30 pointer-events-none select-none font-['Rajdhani']">
              {/* Sleek Mini Gun Heat Bar */}
              <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-sm flex flex-col gap-1 w-36 shadow-md">
                <div className="flex justify-between text-[8px] text-zinc-400 uppercase tracking-widest font-extrabold">
                  <span>Gun Heat</span>
                  <span className={isOverheated ? 'text-red-500 animate-pulse font-extrabold' : 'text-zinc-300'}>
                    {isOverheated ? 'OVERHEAT' : `${Math.floor(heatLevel)}%`}
                  </span>
                </div>
                
                <div className="w-full h-1.5 bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      isOverheated ? 'bg-red-600 animate-pulse' :
                      heatLevel > 70 ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]' :
                      'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)]'
                    }`}
                    style={{ width: `${heatLevel}%` }}
                  />
                </div>
              </div>

              {/* White Diamond-Star Emblem */}
              <div className="w-9 h-9 border border-zinc-700 bg-zinc-950 flex items-center justify-center rounded-sm shadow-md opacity-90">
                <svg className="w-6 h-6 text-zinc-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Exits panel */}
      {gameState !== 'playing' && (
        <div className="flex justify-center mt-2">
          <button
            onClick={onBackToSelector}
            className="px-6 py-2.5 text-xs font-extrabold rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all uppercase tracking-wider active:scale-[0.98]"
          >
            Ku Noqo Casharada
          </button>
        </div>
      )}

    </div>
  );
};

export default CombatGame;
