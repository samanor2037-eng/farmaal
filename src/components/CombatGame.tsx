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
  const [xpEarned, setXpEarned] = useState(0);
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
    img.src = '/images/combat_game_bg_real.jpg';
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
    barrelToggle: false
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
    setXpEarned(0);
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
      barrelToggle: false
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
      const finalXP = Math.floor(score * 0.15) + 30; // base + scaled XP
      setXpEarned(finalXP);
      addGameXP(finalXP);
    }
  }, [gameState, score, addGameXP]);

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

  // Fire Tracer Bullet
  const fireTracer = (jetId: string, tx: number, ty: number) => {
    const state = stateRef.current;
    sounds.playShoot();

    // Coordinates of twin barrels (centers of receivers)
    const lx = 350;
    const ly = 485;
    const rx = 930;
    const ry = 485;

    // Toggle barrel
    state.barrelToggle = !state.barrelToggle;

    const bx = state.barrelToggle ? lx : rx;
    const by = state.barrelToggle ? ly : ry;

    // Calculate angle towards target jet
    const dx = tx - bx;
    const dy = ty - by;
    const barrelAngle = Math.atan2(dy, dx);

    // Apply recoil
    state.recoil = 12;

    const tipLen = 245;
    const launchX = bx + Math.cos(barrelAngle) * tipLen;
    const launchY = by + Math.sin(barrelAngle) * tipLen;

    // Create tracer projectile
    state.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      x: launchX,
      y: launchY,
      targetX: tx,
      targetY: ty,
      vx: Math.cos(barrelAngle) * 22,
      vy: Math.sin(barrelAngle) * 22,
      speed: 22,
      type: 'tracer',
      jetId,
      trail: []
    });

    // Eject shell casing from the breech
    state.casings.push({
      id: Math.random().toString(36).substring(2, 9),
      x: bx,
      y: by - 10,
      vx: state.barrelToggle ? -2 - Math.random() * 2 : 2 + Math.random() * 2,
      vy: -6 - Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      vAngle: 0.1 + Math.random() * 0.3,
      bounces: 0
    });

    // Increment minor heat
    incrementHeat(3.5);
  };

  // Launch Homing Missile
  const launchMissile = (jetId: string) => {
    const state = stateRef.current;
    
    // Launch from the outer ammo box areas (FPP flanks)
    const lx = 170;
    const rx = 1110;
    const by = 485;

    const mx = state.barrelToggle ? lx : rx;

    state.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      x: mx,
      y: by - 105, // Just above the ammo box top (Y = 380)
      targetX: mx,
      targetY: by - 200,
      vx: state.barrelToggle ? -3.5 : 3.5,
      vy: -5,
      speed: 10,
      type: 'missile',
      jetId,
      trail: []
    });
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
              // Spawn impact spark particles
              for (let i = 0; i < 5; i++) {
                state.particles.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: proj.x,
                  y: proj.y,
                  vx: (Math.random() * 4 - 2),
                  vy: (Math.random() * 4 - 2),
                  color: '#22c55e', // green impact sparks for correct letters
                  size: 1.5 + Math.random() * 2,
                  alpha: 1,
                  life: 15 + Math.random() * 10,
                  maxLife: 25
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

      // Draw Real Background Image from User
      if (bgImageRef.current && isBgLoaded) {
        ctx.drawImage(bgImageRef.current, 0, 0, 1280, 600);
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
          // Draw neon-blue tracer laser beam with white core (screenshot style)
          ctx.save();
          ctx.strokeStyle = '#00d2ff'; // Cyan outer glow
          ctx.lineWidth = 5.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(proj.x - proj.vx * 0.7, proj.y - proj.vy * 0.7);
          ctx.lineTo(proj.x, proj.y);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff'; // White inner core
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(proj.x - proj.vx * 0.7, proj.y - proj.vy * 0.7);
          ctx.lineTo(proj.x, proj.y);
          ctx.stroke();
          ctx.restore();
        } else {
          // Draw missile silhouette
          ctx.save();
          ctx.translate(proj.x, proj.y);
          const angle = Math.atan2(proj.vy, proj.vx);
          ctx.rotate(angle);

          // Rocket Body
          ctx.fillStyle = '#d1d5db';
          ctx.fillRect(-8, -2.5, 10, 5);
          ctx.fillStyle = '#ef4444'; // Red nose cone
          ctx.beginPath();
          ctx.moveTo(2, -2.5);
          ctx.lineTo(8, 0);
          ctx.lineTo(2, 2.5);
          ctx.closePath();
          ctx.fill();

          // Rocket tail fin
          ctx.fillStyle = '#111827';
          ctx.fillRect(-10, -4, 2, 8);

          // Rocket Flame
          const flameLength = 8 + Math.random() * 6;
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(-8, -2);
          ctx.lineTo(-8 - flameLength, 0);
          ctx.lineTo(-8, 2);
          ctx.closePath();
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

      // Draw Ejected Casings
      state.casings.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.fillStyle = '#fbbf24'; // brass casing
        ctx.fillRect(-3, -1, 6, 2);
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
      const rec = state.recoil;

      // Target position tracking (Left and Right guns track independent targets when not locked)
      let ltx = 640;
      let lty = 120;
      let rtx = 640;
      let rty = 120;

      if (state.lockedJetId !== null) {
        const lockedJet = state.jets.find(j => j.id === state.lockedJetId);
        if (lockedJet) {
          ltx = lockedJet.x;
          lty = lockedJet.y;
          rtx = lockedJet.x;
          rty = lockedJet.y;
        }
      } else {
        // Track the nearest left and right incoming jets to make the barrels point at the threat
        const leftJets = state.jets.filter(j => j.x < 640 && !j.isDying);
        const rightJets = state.jets.filter(j => j.x >= 640 && !j.isDying);

        if (leftJets.length > 0) {
          const target = leftJets.reduce((prev, current) => (prev.y > current.y) ? prev : current);
          ltx = target.x;
          lty = target.y;
        } else if (state.jets.length > 0) {
          const target = state.jets.reduce((prev, current) => (prev.y > current.y) ? prev : current);
          ltx = target.x;
          lty = target.y;
        } else {
          ltx = 480 + Math.sin(state.frameCount * 0.005) * 160;
          lty = 140 + Math.cos(state.frameCount * 0.01) * 40;
        }

        if (rightJets.length > 0) {
          const target = rightJets.reduce((prev, current) => (prev.y > current.y) ? prev : current);
          rtx = target.x;
          rty = target.y;
        } else if (state.jets.length > 0) {
          const target = state.jets.reduce((prev, current) => (prev.y > current.y) ? prev : current);
          rtx = target.x;
          rty = target.y;
        } else {
          rtx = 800 + Math.sin(state.frameCount * 0.005 + 1) * 160;
          rty = 140 + Math.cos(state.frameCount * 0.01 + 1) * 40;
        }
      }

      // Left Barrel base & angle (centered on the receiver breeches)
      const lx = 350;
      const ly = 485;
      const leftAngle = Math.atan2(lty - ly, ltx - lx);

      // Right Barrel base & angle
      const rx = 930;
      const ry = 485;
      const rightAngle = Math.atan2(rty - ry, rtx - rx);

      // 1. Draw Rotating Left and Right Heavy Gatling Gun Assemblies
      const drawRealisticGun = (bx: number, by: number, angle: number, isFiring: boolean) => {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle);

        const barrelRec = isFiring ? rec : 0;

        // --- BREECH RECEIVER CASING ---
        // Symmetrical blocky military chassis extending backwards from pivot (negative X)
        ctx.beginPath();
        ctx.moveTo(-120, -32);
        ctx.lineTo(-100, -42);
        ctx.lineTo(0, -42);
        ctx.lineTo(0, 42);
        ctx.lineTo(-100, 42);
        ctx.lineTo(-120, 32);
        ctx.closePath();

        const breechGrd = ctx.createLinearGradient(0, -42, 0, 42);
        breechGrd.addColorStop(0, '#0f172a');
        breechGrd.addColorStop(0.2, '#334155');
        breechGrd.addColorStop(0.4, '#475569');
        breechGrd.addColorStop(0.5, '#64748b'); // central metal shine
        breechGrd.addColorStop(0.65, '#334155');
        breechGrd.addColorStop(0.85, '#1e293b');
        breechGrd.addColorStop(1, '#020617');
        ctx.fillStyle = breechGrd;
        ctx.fill();
        
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Control Face Plate on breech side/back
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-100, -28, 80, 56, 4);
        ctx.fill();
        ctx.stroke();

        // Mechanical Toggle Switch
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(-75, -12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-77, -22, 4, 11); // Toggle lever

        // Rotary Adjustment Dial
        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-45, -12, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = '#f59e0b'; // orange indicator notch
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-45, -12);
        ctx.lineTo(-45 + Math.cos(-Math.PI / 4) * 7, -12 + Math.sin(-Math.PI / 4) * 7);
        ctx.stroke();

        // Glowing LED Indicator (Green)
        const ledGrd = ctx.createRadialGradient(-75, 12, 1, -75, 12, 5);
        ledGrd.addColorStop(0, '#86efac'); // bright green
        ledGrd.addColorStop(1, '#166534'); // dark green
        ctx.fillStyle = ledGrd;
        ctx.beginPath();
        ctx.arc(-75, 12, 4, 0, Math.PI * 2);
        ctx.fill();

        // Realtime Gun Heat Indicator Bar on the gun itself
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-55, 10, 25, 4);
        const currentHeatWidth = (state.heat / 100) * 25;
        ctx.fillStyle = state.overheated ? '#ef4444' : '#06b6d4';
        ctx.fillRect(-55, 10, currentHeatWidth, 4);

        // Latch Handle bracket on the back edge
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-115, -18);
        ctx.lineTo(-115, 18);
        ctx.stroke();

        // --- HEXAGONAL TRANSITION COLLAR ---
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.fillRect(0, -32, 20, 64);
        ctx.strokeRect(0, -32, 20, 64);

        // --- VENTILATED HEAT SHROUD ---
        const shroudWidth = 36;
        const shroudLen = 110; // X = 20 to X = 130
        const shroudGrd = ctx.createLinearGradient(0, -shroudWidth / 2, 0, shroudWidth / 2);
        shroudGrd.addColorStop(0, '#0f172a');
        shroudGrd.addColorStop(0.3, '#334155');
        shroudGrd.addColorStop(0.5, '#64748b'); // shine
        shroudGrd.addColorStop(0.7, '#334155');
        shroudGrd.addColorStop(1, '#020617');
        ctx.fillStyle = shroudGrd;
        ctx.fillRect(20, -shroudWidth / 2, shroudLen, shroudWidth);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(20, -shroudWidth / 2, shroudLen, shroudWidth);

        // Vent slots (capsule shapes with depth)
        ctx.fillStyle = '#020617';
        for (let px = 30; px < 20 + shroudLen - 12; px += 20) {
          ctx.beginPath();
          ctx.roundRect(px, -12, 10, 4, 1.5);
          ctx.roundRect(px, 8, 10, 4, 1.5);
          ctx.roundRect(px + 10, -2, 10, 4, 1.5);
          ctx.fill();
        }

        // --- GATLING TUBE BUNDLE ---
        const bundleWidth = 24;
        const bundleLen = 95 - barrelRec; // extends from X = 130 to X = 225 - recoil
        const tubeStartX = 20 + shroudLen; // 130
        const tubeEndX = tubeStartX + bundleLen;

        const drawSingleTube = (offsetY: number, h: number, topCol: string, midCol: string, botCol: string) => {
          const tubeGrd = ctx.createLinearGradient(0, offsetY, 0, offsetY + h);
          tubeGrd.addColorStop(0, topCol);
          tubeGrd.addColorStop(0.5, midCol);
          tubeGrd.addColorStop(1, botCol);
          ctx.fillStyle = tubeGrd;
          ctx.fillRect(tubeStartX, offsetY, tubeEndX - tubeStartX, h);
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(tubeStartX, offsetY, tubeEndX - tubeStartX, h);
        };

        drawSingleTube(-9, 5, '#1e293b', '#475569', '#0f172a');
        drawSingleTube(-3, 6, '#334155', '#94a3b8', '#1e293b'); // shining middle tube
        drawSingleTube(4, 5, '#0f172a', '#334155', '#020617');

        // Spacer / Clamp Rings
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1;
        ctx.fillRect(tubeStartX + 15, -bundleWidth / 2 - 1, 6, bundleWidth + 2);
        ctx.strokeRect(tubeStartX + 15, -bundleWidth / 2 - 1, 6, bundleWidth + 2);
        ctx.fillRect(tubeEndX - 15, -bundleWidth / 2 - 1, 6, bundleWidth + 2);
        ctx.strokeRect(tubeEndX - 15, -bundleWidth / 2 - 1, 6, bundleWidth + 2);

        // --- MUZZLE BRAKE TIP ---
        const brakeWidth = bundleWidth * 1.1; // 26.4
        const brakeLen = 20;
        const brakeX = tubeEndX;

        const brakeGrd = ctx.createLinearGradient(0, -brakeWidth / 2, 0, brakeWidth / 2);
        brakeGrd.addColorStop(0, '#1e293b');
        brakeGrd.addColorStop(0.3, '#334155');
        brakeGrd.addColorStop(0.7, '#18181b'); // carbon scored
        brakeGrd.addColorStop(1, '#09090b');
        ctx.fillStyle = brakeGrd;
        ctx.fillRect(brakeX, -brakeWidth / 2, brakeLen, brakeWidth);
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(brakeX, -brakeWidth / 2, brakeLen, brakeWidth);

        // Gas escape slots
        ctx.fillStyle = '#020617';
        ctx.fillRect(brakeX + 4, -brakeWidth / 2 + 2, 3, brakeWidth - 4);
        ctx.fillRect(brakeX + 10, -brakeWidth / 2 + 2, 3, brakeWidth - 4);

        // --- DYNAMIC FIRE MUZZLE FLASH ---
        const finalTipX = brakeX + brakeLen;
        if (isFiring && state.recoil > 5 && state.frameCount % 2 === 0) {
          ctx.save();
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 35;

          const flashLen = 55 + Math.random() * 15;
          const flashWidth = 32 + Math.random() * 10;

          // Outer orange fireball
          const orangeFlash = ctx.createRadialGradient(finalTipX, 0, 5, finalTipX + 15, 0, flashLen);
          orangeFlash.addColorStop(0, 'rgba(254, 240, 138, 1)'); // white center
          orangeFlash.addColorStop(0.3, 'rgba(249, 115, 22, 0.9)'); // orange
          orangeFlash.addColorStop(0.7, 'rgba(239, 68, 68, 0.5)'); // red
          orangeFlash.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = orangeFlash;
          ctx.beginPath();
          ctx.ellipse(finalTipX + 10, 0, flashLen, flashWidth, 0, 0, Math.PI * 2);
          ctx.fill();

          // Inner white-hot core
          const whiteFlash = ctx.createRadialGradient(finalTipX, 0, 2, finalTipX + 8, 0, flashLen * 0.4);
          whiteFlash.addColorStop(0, '#ffffff');
          whiteFlash.addColorStop(0.5, '#fed7aa');
          whiteFlash.addColorStop(1, 'rgba(249, 115, 22, 0)');
          
          ctx.fillStyle = whiteFlash;
          ctx.beginPath();
          ctx.ellipse(finalTipX + 5, 0, flashLen * 0.4, flashWidth * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // --- REALTIME DYNAMIC LIGHT REFLECTION ON METAL ---
        if (isFiring && state.recoil > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop'; // apply only on drawn gun pixels
          const glowGrd = ctx.createRadialGradient(finalTipX, 0, 0, finalTipX, 0, 185);
          glowGrd.addColorStop(0, 'rgba(253, 186, 116, 0.55)');
          glowGrd.addColorStop(0.5, 'rgba(249, 115, 22, 0.15)');
          glowGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrd;
          ctx.fillRect(-130, -45, 410, 90);
          ctx.restore();
        }

        ctx.restore();
      };

      const leftIsFiring = state.lockedJetId !== null && state.recoil > 0 && state.barrelToggle;
      const rightIsFiring = state.lockedJetId !== null && state.recoil > 0 && !state.barrelToggle;

      // Draw Rotating Left and Right Guns (placed under static chassis for natural depth layering)
      drawRealisticGun(lx, ly, leftAngle, leftIsFiring);
      drawRealisticGun(rx, ry, rightAngle, rightIsFiring);

      // 2. Draw Flexible Segmented Brass Ammo Feed Belts (dynamic curvature linking ammo box to gun)
      const drawAmmoChute = (startX: number, startY: number, endX: number, endY: number, isLeft: boolean) => {
        const cpX = isLeft ? (startX + endX) * 0.5 - 20 : (startX + endX) * 0.5 + 20;
        const cpY = Math.max(startY, endY) + 60; // loops downwards with gravity

        ctx.save();
        const steps = 9;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const mt = 1 - t;
          // Quadratic bezier interpolation
          const px = mt * mt * startX + 2 * mt * t * cpX + t * t * endX;
          const py = mt * mt * startY + 2 * mt * t * cpY + t * t * endY;

          // Derivative for rotation tangent
          const tx = 2 * mt * (cpX - startX) + 2 * t * (endX - cpX);
          const ty = 2 * mt * (cpY - startY) + 2 * t * (endY - cpY);
          const angle = Math.atan2(ty, tx);

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(angle);

          // Metal Guide Link Bracket
          const linkGrd = ctx.createLinearGradient(0, -11, 0, 11);
          linkGrd.addColorStop(0, '#475569');
          linkGrd.addColorStop(0.5, '#64748b');
          linkGrd.addColorStop(1, '#1e293b');
          ctx.fillStyle = linkGrd;
          ctx.fillRect(-6, -9, 12, 18);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.strokeRect(-6, -9, 12, 18);

          // Brass Shell Bullet inside link
          ctx.fillStyle = '#fbbf24'; // brass casing
          ctx.fillRect(-3, -6, 6, 4);
          ctx.fillStyle = '#f59e0b'; // copper tip
          ctx.beginPath();
          ctx.moveTo(3, -6);
          ctx.lineTo(6, -4);
          ctx.lineTo(3, -2);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
        ctx.restore();
      };

      // Connect ammo box outlets to breech receiver intakes (back side of rotating guns)
      const leftBreechX = lx + Math.cos(leftAngle) * -60;
      const leftBreechY = ly + Math.sin(leftAngle) * -60;
      const rightBreechX = rx + Math.cos(rightAngle) * -60;
      const rightBreechY = ry + Math.sin(rightAngle) * -60;

      drawAmmoChute(240, 440, leftBreechX, leftBreechY, true);
      drawAmmoChute(1040, 440, rightBreechX, rightBreechY, false);

      // 3. Draw Heavy Central Mounting Platform and Hydraulics
      // Central Platform Block
      const platGrd = ctx.createLinearGradient(480, 500, 800, 500);
      platGrd.addColorStop(0, '#0f172a');
      platGrd.addColorStop(0.5, '#1e293b');
      platGrd.addColorStop(1, '#020617');
      ctx.fillStyle = platGrd;
      ctx.fillRect(480, 500, 320, 40);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(480, 500, 320, 40);

      // Hydraulic Cylinders (Double support pistons)
      const drawHydraulicPiston = (cx: number) => {
        // Chrome Rod
        const rodGrd = ctx.createLinearGradient(cx + 4, 0, cx + 16, 0);
        rodGrd.addColorStop(0, '#94a3b8');
        rodGrd.addColorStop(0.5, '#ffffff');
        rodGrd.addColorStop(1, '#475569');
        ctx.fillStyle = rodGrd;
        ctx.fillRect(cx + 5, 450, 10, 40);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cx + 5, 450, 10, 40);

        // Cylinder Body (Dark Steel)
        const bodyGrd = ctx.createLinearGradient(cx, 0, cx + 20, 0);
        bodyGrd.addColorStop(0, '#0f172a');
        bodyGrd.addColorStop(0.4, '#334155');
        bodyGrd.addColorStop(0.8, '#1e293b');
        bodyGrd.addColorStop(1, '#020617');
        ctx.fillStyle = bodyGrd;
        ctx.fillRect(cx, 480, 20, 60);
        ctx.strokeRect(cx, 480, 20, 60);

        // Brass joint locking collar
        ctx.fillStyle = '#b45309';
        ctx.fillRect(cx - 2, 477, 24, 5);
        ctx.strokeRect(cx - 2, 477, 24, 5);
      };

      drawHydraulicPiston(535);
      drawHydraulicPiston(725);

      // Heavy Structural Girders with weight-reduction holes
      const drawGirder = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.save();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Round hollow indicators
        ctx.fillStyle = '#020617';
        const steps = 4;
        for (let i = 1; i <= steps; i++) {
          const t = i / (steps + 1);
          ctx.beginPath();
          ctx.arc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      drawGirder(380, 490, 640, 540);
      drawGirder(900, 490, 640, 540);

      // 4. Draw Static Flank Ammo Container Boxes (sitting flush on bulkhead)
      // Left Ammo Box
      const ammoGrdL = ctx.createLinearGradient(80, 380, 260, 380);
      ammoGrdL.addColorStop(0, '#0f172a');
      ammoGrdL.addColorStop(0.3, '#334155');
      ammoGrdL.addColorStop(0.6, '#475569');
      ammoGrdL.addColorStop(0.9, '#1e293b');
      ammoGrdL.addColorStop(1, '#020617');
      ctx.fillStyle = ammoGrdL;
      ctx.beginPath();
      ctx.roundRect(80, 380, 180, 160, [12, 12, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ammo box panel details (left)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(110, 380); ctx.lineTo(110, 540);
      ctx.moveTo(230, 380); ctx.lineTo(230, 540);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      for (let by = 395; by < 540; by += 35) {
        ctx.beginPath();
        ctx.arc(95, by, 2, 0, Math.PI * 2);
        ctx.arc(245, by, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Chevron hazard stripes (left)
      ctx.save();
      ctx.beginPath();
      ctx.rect(120, 390, 100, 12);
      ctx.clip();
      ctx.fillStyle = '#eab308'; // Amber
      ctx.fillRect(120, 390, 100, 12);
      ctx.fillStyle = '#0f172a'; // dark stripes
      ctx.lineWidth = 4;
      for (let sx = 100; sx < 240; sx += 12) {
        ctx.beginPath();
        ctx.moveTo(sx, 390);
        ctx.lineTo(sx + 10, 402);
        ctx.stroke();
      }
      ctx.restore();

      // Right Ammo Box
      const ammoGrdR = ctx.createLinearGradient(1020, 380, 1200, 380);
      ammoGrdR.addColorStop(0, '#020617');
      ammoGrdR.addColorStop(0.1, '#1e293b');
      ammoGrdR.addColorStop(0.4, '#475569');
      ammoGrdR.addColorStop(0.7, '#334155');
      ammoGrdR.addColorStop(1, '#0f172a');
      ctx.fillStyle = ammoGrdR;
      ctx.beginPath();
      ctx.roundRect(1020, 380, 180, 160, [12, 12, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ammo box panel details (right)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(1050, 380); ctx.lineTo(1050, 540);
      ctx.moveTo(1170, 380); ctx.lineTo(1170, 540);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      for (let by = 395; by < 540; by += 35) {
        ctx.beginPath();
        ctx.arc(1035, by, 2, 0, Math.PI * 2);
        ctx.arc(1185, by, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Chevron hazard stripes (right)
      ctx.save();
      ctx.beginPath();
      ctx.rect(1060, 390, 100, 12);
      ctx.clip();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(1060, 390, 100, 12);
      ctx.fillStyle = '#0f172a';
      ctx.lineWidth = 4;
      for (let sx = 1040; sx < 1180; sx += 12) {
        ctx.beginPath();
        ctx.moveTo(sx, 390);
        ctx.lineTo(sx + 10, 402);
        ctx.stroke();
      }
      ctx.restore();

      // 5. Draw Solid Metallic Bulkhead Deck Plate (spans bottom width to mask all gaps & wells)
      const bulkheadGrd = ctx.createLinearGradient(0, 540, 0, 600);
      bulkheadGrd.addColorStop(0, '#0b0f19'); // dark slate
      bulkheadGrd.addColorStop(0.2, '#1e293b'); // metal plate face
      bulkheadGrd.addColorStop(0.3, '#111827');
      bulkheadGrd.addColorStop(1, '#020617'); // shadow baseline
      ctx.fillStyle = bulkheadGrd;
      ctx.fillRect(0, 540, 1280, 60);

      // Top silver bevel trim
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 540);
      ctx.lineTo(1280, 540);
      ctx.stroke();

      // Bevel glare line
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 541);
      ctx.lineTo(1280, 541);
      ctx.stroke();

      // Heavy industrial rivets
      ctx.fillStyle = '#64748b';
      for (let rx = 20; rx < 1280; rx += 40) {
        ctx.beginPath();
        ctx.arc(rx, 546, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cooling vent slats on deck bulkhead center
      ctx.fillStyle = '#020617';
      for (let vx = 400; vx <= 820; vx += 70) {
        ctx.fillRect(vx, 555, 50, 18);
        ctx.fillStyle = '#1e293b';
        for (let gx = vx + 6; gx < vx + 50; gx += 10) {
          ctx.fillRect(gx, 555, 3, 18);
        }
        ctx.fillStyle = '#020617';
      }

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
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-500 text-xs">Mowjada ugu dambaysa:</span>
                <span className="text-red-500 font-extrabold text-sm">Wave {wave}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs">XP Guul ahaan:</span>
                <span className="text-lime-400 font-extrabold text-sm">+{xpEarned} XP</span>
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
