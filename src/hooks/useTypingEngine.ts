import { useState, useEffect, useRef, useCallback } from 'react';
import sounds from '../utils/soundEffects';

export interface UseTypingEngineProps {
  levelId: number;
  text: string;
  targetWPM: number;
  targetAccuracy: number;
  onComplete?: (wpm: number, accuracy: number, stars: number) => void;
}

const somaliWordsMap: Record<string, string[]> = {
  a: ['aabe', 'hooyo', 'caan', 'dal', 'laas'],
  b: ['beer', 'bari', 'baro', 'buug', 'bad'],
  c: ['caan', 'cunto', 'calan', 'cusub', 'cag'],
  d: ['dal', 'dad', 'dawo', 'dan', 'dugsi'],
  e: ['keen', 'meel', 'beer', 'eey', 'ehel'],
  f: ['far', 'fure', 'fanka', 'fiican', 'fadhi'],
  g: ['gabay', 'geed', 'guul', 'guri', 'gacanta'],
  h: ['hooyo', 'hadal', 'horumar', 'hir', 'habaar'],
  i: ['iftiin', 'iyo', 'iimayl', 'il', 'irid'],
  j: ['jidka', 'jeclahay', 'joogo', 'jid', 'jiir'],
  k: ['keen', 'koob', 'kastaa', 'kow', 'kalluun'],
  l: ['loox', 'laas', 'luuqad', 'labo', 'lugo'],
  m: ['meel', 'maahmaah', 'magaalo', 'muhiim', 'mid'],
  n: ['nin', 'nabad', 'nool', 'nambar', 'nafta'],
  o: ['roob', 'oo', 'dayax', 'odaa', 'orod'],
  p: ['play', 'post', 'page'],
  q: ['qof', 'qani', 'qoraal', 'qaran', 'qeyb'],
  r: ['roob', 'runta', 'rasmi', 'reer', 'rux'],
  s: ['suuq', 'sano', 'suuban', 'sax', 'saaxiib'],
  t: ['taariikh', 'tiro', 'tababar', 'tag', 'tusaale'],
  u: ['suuq', 'uu', 'urur', 'usha', 'ubax'],
  v: ['video', 'virus'],
  w: ['waa', 'waddani', 'wadajir', 'waara', 'wax'],
  x: ['loox', 'xorriyad', 'xarun', 'xeebta', 'xikmad'],
  y: ['hooyo', 'ayay', 'yoolka', 'yaqaan', 'yool'],
  z: ['zero', 'zone'],
};

const getGroupVocab = (levelId: number): string[] => {
  const groupIdx = Math.floor((levelId - 1) / 15);
  if (groupIdx === 0) {
    return ['aas', 'sad', 'adaa', 'faas', 'daas', 'sada', 'asaf', 'daasa', 'faasa'];
  } else if (groupIdx === 1) {
    return ['dal', 'sal', 'laas', 'kala', 'daal', 'kalka', 'kalkaal', 'laasaha', 'dalalka'];
  } else if (groupIdx === 2) {
    return ['hal', 'gal', 'had', 'hadal', 'dhag', 'shaal', 'hadala', 'dhagaha', 'shaalalka'];
  } else if (groupIdx === 3) {
    return ['qor', 'eey', 'oo', 'keen', 'roob', 'faro', 'hooyo', 'geel', 'weyn'];
  } else if (groupIdx === 4) {
    return ['nin', 'bad', 'cag', 'aabe', 'baro', 'xamar', 'nabad', 'macaan', 'gacan'];
  }
  return [];
};

const getAllowedKeysForLevel = (levelId: number): Set<string> => {
  const allowed = new Set<string>();
  allowed.add(' ');
  if (levelId <= 15) {
    ['a', 's', 'd', 'f'].forEach(c => allowed.add(c));
  } else if (levelId <= 30) {
    ['a', 's', 'd', 'f', 'j', 'k', 'l'].forEach(c => allowed.add(c));
  } else if (levelId <= 45) {
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].forEach(c => allowed.add(c));
  } else if (levelId <= 60) {
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].forEach(c => allowed.add(c));
  }
  return allowed;
};

export const useTypingEngine = ({
  levelId,
  text,
  targetWPM,
  targetAccuracy,
  onComplete
}: UseTypingEngineProps) => {
  const [activeText, setActiveText] = useState(text);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [charStatuses, setCharStatuses] = useState<('untyped' | 'correct' | 'incorrect')[]>([]);
  const [errors, setErrors] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [isCompleted, setIsCompleted] = useState(false);
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);

  // Remediation & Slow Repeat states
  const [isRemediation, setIsRemediation] = useState(false);
  const [isSlowRepeat, setIsSlowRepeat] = useState(false);
  const [struggleChars, setStruggleChars] = useState<string[]>([]);
  const remediationAttempts = useRef(0);

  // Refs for tracking original stats
  const originalWpmRef = useRef(0);
  const originalAccRef = useRef(0);
  const originalStarsRef = useRef(0);

  // Refs for character latency tracking
  const lastKeyTimeRef = useRef<number | null>(null);
  const latenciesRef = useRef<Record<string, number[]>>({});
  const errorsRef = useRef<Record<string, number>>({});

  const timerRef = useRef<number | null>(null);

  // Reset state when base text changes (level change)
  useEffect(() => {
    setActiveText(text);
    setCurrentIndex(0);
    setCharStatuses(new Array(text.length).fill('untyped'));
    setErrors(0);
    setCorrectCount(0);
    setStartTime(null);
    setElapsedTime(0);
    setIsCompleted(false);
    setShakeIndex(null);
    setIsRemediation(false);
    setIsSlowRepeat(false);
    setStruggleChars([]);
    remediationAttempts.current = 0;

    originalWpmRef.current = 0;
    originalAccRef.current = 0;
    originalStarsRef.current = 0;

    lastKeyTimeRef.current = null;
    latenciesRef.current = {};
    errorsRef.current = {};

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);

  // Handle timer interval
  useEffect(() => {
    if (startTime !== null && !isCompleted) {
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTime, isCompleted]);

  // Calculate real-time metrics
  const timeInMinutes = elapsedTime > 0 ? elapsedTime / 60 : 1 / 60;
  const wpm = Math.round((correctCount / 5) / timeInMinutes);
  const totalKeystrokes = correctCount + errors;
  const accuracy = totalKeystrokes > 0 ? Math.round((correctCount / totalKeystrokes) * 100) : 100;

  // Rating evaluator
  const calculateStars = useCallback((finalWpm: number, finalAccuracy: number) => {
    if (finalAccuracy < targetAccuracy) return 0; // Fail if below minimum accuracy (90%)

    if (finalAccuracy >= 97 && finalWpm >= targetWPM) {
      return 3;
    } else if (finalAccuracy >= 93 && finalWpm >= targetWPM * 0.7) {
      return 2;
    } else {
      return 1;
    }
  }, [targetWPM, targetAccuracy]);

  const handleKeyPress = useCallback((key: string) => {
    if (isCompleted) return;

    // Start timer on first keypress
    if (startTime === null) {
      setStartTime(Date.now());
      lastKeyTimeRef.current = Date.now();
    }

    // Ignore non-character keys (e.g., Shift, Control, Meta)
    if (key.length !== 1) return;

    const targetChar = activeText[currentIndex];

    // Measure character input latency
    const now = Date.now();
    let keyLatency = 0;
    if (lastKeyTimeRef.current !== null) {
      keyLatency = now - lastKeyTimeRef.current;
    }

    if (key === targetChar) {
      sounds.playClick();

      // Record key latency for correct press
      if (lastKeyTimeRef.current !== null && targetChar !== ' ') {
        const charKey = targetChar.toLowerCase();
        if (!latenciesRef.current[charKey]) {
          latenciesRef.current[charKey] = [];
        }
        latenciesRef.current[charKey].push(keyLatency);
      }
      lastKeyTimeRef.current = now;

      setCorrectCount(prev => prev + 1);
      setCharStatuses(prev => {
        const next = [...prev];
        next[currentIndex] = 'correct';
        return next;
      });

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // Level / text segment completed
      if (nextIndex === activeText.length) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const finalTime = Math.max(1, (Date.now() - (startTime || Date.now())) / 1000);
        const finalMinutes = finalTime / 60;
        const finalWpm = Math.round(((correctCount + 1) / 5) / finalMinutes);
        const finalAcc = Math.round(((correctCount + 1) / (correctCount + 1 + errors)) * 100);

        // 1. Check if user is slow in Beginner levels (Levels 1-75)
        // If slow, repeat lesson with another set of vocabulary words from that row
        if (levelId <= 75 && finalWpm < targetWPM) {
          let vocab: string[] = [];
          const groupIdx = Math.floor((levelId - 1) / 15);
          const levelOffset = (levelId - 1) % 15;
          const cycle = levelOffset % 3; // 0 = Low, 1 = Medium, 2 = High
          
          if (groupIdx === 0) {
            // Left Hand
            if (cycle === 0) {
              vocab = ['aas', 'sad', 'adaa'];
            } else if (cycle === 1) {
              vocab = ['faas', 'daas', 'sada'];
            } else {
              vocab = ['asaf', 'daasa', 'faasa'];
            }
          } else if (groupIdx === 1) {
            // Right Hand
            if (cycle === 0) {
              vocab = ['dal', 'sal', 'laas'];
            } else if (cycle === 1) {
              vocab = ['kala', 'daal', 'kalka'];
            } else {
              vocab = ['kalkaal', 'laasaha', 'dalalka'];
            }
          } else if (groupIdx === 2) {
            // Middle keys
            if (cycle === 0) {
              vocab = ['hal', 'gal', 'had'];
            } else if (cycle === 1) {
              vocab = ['hadal', 'dhag', 'shaal'];
            } else {
              vocab = ['hadala', 'dhagaha', 'shaalalka'];
            }
          } else if (groupIdx === 3) {
            // Top Row
            if (cycle === 0) {
              vocab = ['qor', 'eey', 'oo'];
            } else if (cycle === 1) {
              vocab = ['keen', 'roob', 'faro'];
            } else {
              vocab = ['hooyo', 'geel', 'weyn'];
            }
          } else if (groupIdx === 4) {
            // Bottom Row
            if (cycle === 0) {
              vocab = ['nin', 'bad', 'cag'];
            } else if (cycle === 1) {
              vocab = ['aabe', 'baro', 'xamar'];
            } else {
              vocab = ['nabad', 'macaan', 'gacan'];
            }
          }

          if (vocab.length > 0) {
            // Pick 4 random words
            const repeatedWords: string[] = [];
            for (let i = 0; i < 4; i++) {
              repeatedWords.push(vocab[Math.floor(Math.random() * vocab.length)]);
            }
            const repeatedText = repeatedWords.join(' ');

            // Setup slow repeat state (reset session timers/errors but preserve level text)
            setIsSlowRepeat(true);
            setIsRemediation(false);
            setStruggleChars([]);
            setActiveText(repeatedText);
            setCurrentIndex(0);
            setCharStatuses(new Array(repeatedText.length).fill('untyped'));
            setErrors(0);
            setCorrectCount(0);
            setStartTime(null);
            setElapsedTime(0);
            lastKeyTimeRef.current = null;
            latenciesRef.current = {};
            errorsRef.current = {};
            return;
          }
        }

        // 2. Normal completion / remediation checks
        if (isRemediation) {
          // Remediation complete - finish the level using stored original stats
          setIsCompleted(true);
          sounds.playSuccess();
          if (onComplete) {
            onComplete(originalWpmRef.current, originalAccRef.current, originalStarsRef.current);
          }
        } else {
          // Check for slow / struggle characters (excluding space, latency > 900ms or error count > 0)
          const slowList = Object.keys(latenciesRef.current).filter(char => {
            if (char === ' ' || !/^[a-zA-Z]$/.test(char)) return false;
            const charLatencies = latenciesRef.current[char] || [];
            const avgLatency = charLatencies.length > 0 
              ? charLatencies.reduce((s, l) => s + l, 0) / charLatencies.length 
              : 0;
            const errs = errorsRef.current[char] || 0;
            return avgLatency > 900 || errs > 0;
          });

          const starsResult = calculateStars(finalWpm, finalAcc);

          // Trigger struggle remediation if they completed the text, have struggle keys
          if (slowList.length > 0 && remediationAttempts.current < 1) {
            // Store original level scoring
            originalWpmRef.current = finalWpm;
            originalAccRef.current = finalAcc;
            originalStarsRef.current = starsResult;

            // Generate practice words
            const remediationWords: string[] = [];
            const groupVocab = getGroupVocab(levelId);
            const allowedKeys = getAllowedKeysForLevel(levelId);

            slowList.forEach(c => {
              // 1. Try to find words in the current group's vocabulary that contain the struggle character
              let matchingWords = groupVocab.filter(w => w.toLowerCase().includes(c.toLowerCase()));
              
              // 2. If no words in group vocab, try somaliWordsMap and filter by allowed keys
              if (matchingWords.length === 0 && allowedKeys.size > 0) {
                const mapWords = somaliWordsMap[c.toLowerCase()] || [];
                matchingWords = mapWords.filter(w => {
                  return w.toLowerCase().split('').every(char => allowedKeys.has(char));
                });
              }

              // 3. Fallback to simple character repeat if still empty
              if (matchingWords.length === 0) {
                matchingWords = [c + c + c];
              }

              const randomWord = matchingWords[Math.floor(Math.random() * matchingWords.length)];
              remediationWords.push(randomWord);
            });

            const remediationString = remediationWords.slice(0, 5).join(' ');

            // Switch to remediation state
            setIsRemediation(true);
            setIsSlowRepeat(false);
            setStruggleChars(slowList);
            remediationAttempts.current += 1;
            setActiveText(remediationString);
            setCurrentIndex(0);
            setCharStatuses(new Array(remediationString.length).fill('untyped'));
            setErrors(0);
            setCorrectCount(0);
            setStartTime(null);
            setElapsedTime(0);
            lastKeyTimeRef.current = null;
            latenciesRef.current = {};
            errorsRef.current = {};
          } else {
            // No struggle keys -> Complete level
            setIsCompleted(true);
            sounds.playSuccess();
            if (onComplete) {
              onComplete(finalWpm, finalAcc, starsResult);
            }
          }
        }
      }
    } else {
      sounds.playError();

      // Track errors for this character
      if (targetChar && targetChar !== ' ') {
        const charKey = targetChar.toLowerCase();
        errorsRef.current[charKey] = (errorsRef.current[charKey] || 0) + 1;
      }
      lastKeyTimeRef.current = now;

      setErrors(prev => prev + 1);
      setCharStatuses(prev => {
        const next = [...prev];
        next[currentIndex] = 'incorrect';
        return next;
      });

      // Trigger shake animation at current error index
      setShakeIndex(currentIndex);
      setTimeout(() => {
        setShakeIndex(null);
      }, 200);
    }
  }, [currentIndex, activeText, startTime, isCompleted, correctCount, errors, onComplete, calculateStars, isRemediation, levelId, targetWPM]);

  const reset = useCallback(() => {
    setActiveText(text);
    setCurrentIndex(0);
    setCharStatuses(new Array(text.length).fill('untyped'));
    setErrors(0);
    setCorrectCount(0);
    setStartTime(null);
    setElapsedTime(0);
    setIsCompleted(false);
    setShakeIndex(null);
    setIsRemediation(false);
    setIsSlowRepeat(false);
    setStruggleChars([]);
    remediationAttempts.current = 0;

    originalWpmRef.current = 0;
    originalAccRef.current = 0;
    originalStarsRef.current = 0;

    lastKeyTimeRef.current = null;
    latenciesRef.current = {};
    errorsRef.current = {};

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [text]);

  return {
    activeText,
    currentIndex,
    charStatuses,
    errors,
    correctCount,
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
  };
};
export default useTypingEngine;
