import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/soundEffects';
import { Play, RotateCcw, Award, Volume2, VolumeX, Timer, AlertCircle } from 'lucide-react';

const SPEED_TEST_PARAGRAPHS = [
  "Af-Soomaaligu waa af qani ah oo ka tirsan qoyska luuqadaha Kawaashiga ee loogu hadlo Geeska Afrika. Waa luuqad leh suugaan aad u hodan ah, gaar ahaan gabayada, sheekooyinka iyo maahmaahyada oo jiilba jiil u gudbin jiray taariikhda iyo dhaqanka bulshada Soomaaliyeed.",
  "Dhaqanka Soomaaliyeed wuxuu ku dhisnaan jiray reer miyinnimo iyo xoolo dhaqasho, halkaas oo geelu uu ahaa hantida ugu qaalisan. Geelu kaliya ma ahayn xoolo la raacdo, ee wuxuu ahaa halbeeg dhaqaale, calaamad sharaf, iyo dulucda maansooyin badan oo suugaanta Soomaalida ah.",
  "Magaalada Muqdisho ee caasimadda dalka Soomaaliya waxay leedahay taariikh fac weyn oo ka bilaabata xilligii ganacsiga badaha ee badweynta Hindiya. Muqdisho waxay ahayd xarun weyn oo ganacsi oo isku xiri jirtay Carabta, Faaris, Hindiya iyo bariga Afrika oo dhan.",
  "Aqoon la'aantu waa iftiin la'aan, waana caqabadda ugu weyn ee hortaagan horumarka bulshada. Waxbarashadu waa furaha albaab kasta oo guul ah, waana aaladda kaliya ee beddeli karta nolosha aadanaha iyadoo bixisa aqoon, xirfado iyo garasho ka caawisa qofka inuu wax cusub abuuro.",
  "Tiknoolajiyada casriga ah waxay beddeshay qaabka aan u wada xiriirno, u shaqayno, iyo u baranno culuumta kala duwan. Dunidu hadda waxay noqotay meel aad u dhow oo hal gujin oo qura aad ku heli karto macluumaad kasta oo aad u baahan tahay, taas oo fududaysay nolosha aadanaha.",
  "Badda Soomaaliya waxay ka mid tahay badaha ugu khayraadka badan adduunka, iyadoo leh xeebta ugu dheer qaaradda Afrika. Baddan waxay hodan ku tahay noocyada kala duwan ee kalluunka, dhirta badda iyo khayraadka kale ee dabiiciga ah oo haddii si fiican looga faa'iidaysto wax weyn ka beddeli kara dhaqaalaha.",
  "Dhalinyaradu waa mustaqbalka dalka, waana xoogga ugu weyn ee keeni kara isbeddel togan iyo horumar waara. Haddii dhalinyarada la siiyo waxbarasho tayo leh, shaqo abuur iyo fursado ay ku muujiyaan tayadooda, waxay horseedi karaan barwaaqo iyo nabadgelyo waarta oo ka dhalata gobolka.",
  "Wada-jirka iyo isku-duubnidu waa aasaaska nabadgelyada iyo guusha bulsho kasta. Sida la yiraahdo far kaligeed fool ma dhaqdo, sidaas darteed bulshada wada shaqaysa oo iska kaashata dhibaatooyinka waxay mar kasta gaartaa guulo waaweyn oo aan kaligeed la gaari kareen."
];

interface SpeedTestProps {
  onBackToSelector: () => void;
}

export const SpeedTest: React.FC<SpeedTestProps> = ({ onBackToSelector }) => {
  const { isMuted, toggleMute } = useAuth();
  
  const [phase, setPhase] = useState<'select' | 'typing' | 'result'>('select');
  const [selectedDuration, setSelectedDuration] = useState<number>(60); // in seconds
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [currentText, setCurrentText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  
  // Scoring metrics
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState<number>(0);
  const [completedCharsCount, setCompletedCharsCount] = useState<number>(0); // chars completed in previous paragraphs during this session

  // Logs for detailed word diagnostics
  const [expectedTextLog, setExpectedTextLog] = useState<string[]>([]);
  const [userInputsLog, setUserInputsLog] = useState<string[]>([]);

  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pick a random paragraph different from current if possible
  const getRandomParagraph = (excludeText?: string): string => {
    const candidates = excludeText 
      ? SPEED_TEST_PARAGRAPHS.filter(p => p !== excludeText)
      : SPEED_TEST_PARAGRAPHS;
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const startTest = () => {
    setPhase('typing');
    setTimeLeft(selectedDuration);
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    setCompletedCharsCount(0);
    setUserInput('');
    setCurrentText(getRandomParagraph());
    setExpectedTextLog([]);
    setUserInputsLog([]);
  };

  // Focus input field when typing phase starts
  useEffect(() => {
    if (phase === 'typing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  // Countdown timer hook
  useEffect(() => {
    if (phase !== 'typing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPhase('result');
          sounds.playSuccess();
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Save the final text and input logs when the test completes
  useEffect(() => {
    if (phase === 'result') {
      const hasTypedInCurrent = userInput.length > 0;
      const isFirstParagraph = expectedTextLog.length === 0;
      
      if (hasTypedInCurrent || isFirstParagraph) {
        setExpectedTextLog(prev => [...prev, currentText]);
        setUserInputsLog(prev => [...prev, userInput]);
      }
    }
  }, [phase]);

  // Handle keystroke input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const lastCharTyped = value[value.length - 1];
    
    // Calculate typing input lengths
    const prevInputLen = userInput.length;
    const isBackspace = value.length < prevInputLen;

    if (!isBackspace && lastCharTyped !== undefined) {
      // Evaluate if the last typed character matches the target character
      const targetChar = currentText[prevInputLen];
      const isCorrect = lastCharTyped === targetChar;

      setTotalKeystrokes(prev => prev + 1);
      if (isCorrect) {
        setCorrectKeystrokes(prev => prev + 1);
        sounds.playClick();
      } else {
        sounds.playError();
      }
    }

    setUserInput(value);

    // If paragraph is fully completed, transition to a new one
    if (value.length === currentText.length) {
      // Calculate correct strokes in this paragraph
      let correctInPara = 0;
      for (let i = 0; i < currentText.length; i++) {
        if (value[i] === currentText[i]) {
          correctInPara++;
        }
      }
      setCompletedCharsCount(prev => prev + correctInPara);

      // Save logs
      setExpectedTextLog(prev => [...prev, currentText]);
      setUserInputsLog(prev => [...prev, value]);

      setUserInput('');
      setCurrentText(getRandomParagraph(currentText));
    }
  };

  // Re-focus input if user clicks on the text display panel
  const handlePanelClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Real-time calculations
  const timeElapsed = selectedDuration - timeLeft;
  const timeElapsedMins = timeElapsed > 0 ? timeElapsed / 60 : 0.01;

  // Realtime WPM
  const realtimeCorrectChars = completedCharsCount + [...userInput].filter((char, idx) => char === currentText[idx]).length;
  const wpm = timeElapsed > 0 ? Math.round((realtimeCorrectChars / 5) / timeElapsedMins) : 0;

  // Realtime Accuracy
  const accuracy = totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 100;

  // Final Results
  const finalTimeElapsedMins = selectedDuration / 60;
  const finalWpm = Math.round((correctKeystrokes / 5) / finalTimeElapsedMins);

  // Word helper function
  const getWordCount = (text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") return 0;
    return trimmed.split(/\s+/).length;
  };

  // Realtime and final word count calculations
  const completedWordsExpected = expectedTextLog.reduce((acc, text) => acc + getWordCount(text), 0);
  const currentWordsExpected = getWordCount(currentText);
  const realtimeTotalWordsExpected = completedWordsExpected + currentWordsExpected;

  const completedWordsTyped = userInputsLog.reduce((acc, text) => acc + getWordCount(text), 0);
  const currentWordsTyped = getWordCount(userInput);
  const realtimeTotalWordsTyped = completedWordsTyped + currentWordsTyped;

  // Final results word count calculations (use the logs)
  const totalWordsExpected = expectedTextLog.reduce((acc, text) => acc + getWordCount(text), 0);
  const totalWordsTyped = userInputsLog.reduce((acc, text) => acc + getWordCount(text), 0);

  // Render a detailed analysis comparing expected words to user typed words
  const renderWordAnalysis = () => {
    return expectedTextLog.map((expPara, paraIdx) => {
      const expWords = expPara.trim().split(/\s+/);
      const typedWords = (userInputsLog[paraIdx] || "").trim().split(/\s+/);

      return (
        <div key={paraIdx} className="mb-4 text-left leading-relaxed font-sans text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-b-0 last:pb-0">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
            Paragraph {paraIdx + 1}
          </span>
          <div className="flex flex-wrap gap-x-2 gap-y-1.5">
            {expWords.map((word, wordIdx) => {
              const typedWord = typedWords[wordIdx];
              let colorClass = "text-zinc-400 dark:text-zinc-500"; // default if not reached

              if (typedWord !== undefined) {
                if (typedWord === word) {
                  colorClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                } else {
                  colorClass = "text-rose-600 dark:text-rose-400 font-bold line-through";
                }
              }

              return (
                <span key={wordIdx} className="inline-flex items-center">
                  <span className={colorClass}>{word}</span>
                  {typedWord !== undefined && typedWord !== word && (
                    <span className="text-zinc-450 dark:text-zinc-500 text-xs ml-1 font-mono font-medium">
                      ({typedWord})
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      );
    });
  };

  // Somali Feedback messages based on WPM
  const getFeedback = (finalWpm: number) => {
    if (finalWpm >= 60) {
      return { text: "Aad iyo aad baad u dheereysaa! Waxaad tahay khabiir weyn oo dhanka qoraalka ah.", style: "text-emerald-500" };
    } else if (finalWpm >= 40) {
      return { text: "Hambalyo! Xawaarahaagu waa mid aad u fiican oo dhiirigelin leh. Sii wad tababarka.", style: "text-blue-500" };
    } else if (finalWpm >= 25) {
      return { text: "Waa xawaare dhex-dhexaad ah. Haddii aad si joogto ah u tababarato waad sii kordhin kartaa xawaarahaaga.", style: "text-amber-500" };
    } else {
      return { text: "Xawaarahaagu wuu hooseeyaa. Isticmaal faraha saxda ah oo si joogto ah u tababaro si aad u kordhiso.", style: "text-rose-500" };
    }
  };

  const feedback = getFeedback(finalWpm);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 select-none animate-fade-in">
      {/* Top Header Panel */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider text-indigo-500 uppercase px-2.5 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15">
            Tijaabada Xawaaraha (Speed Test)
          </span>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mt-2">
            Tijaabi Xawaarahaaga Qoraalka
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Qor farriimaha si aad u ogaato inta erey aad daqiiqaddii qori karto (WPM).
          </p>
        </div>

        {/* Action Toggles */}
        <div className="flex gap-2">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onBackToSelector}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            Casharada
          </button>
        </div>
      </div>

      {/* 1. SELECT PHASE */}
      {phase === 'select' && (
        <div className="w-full flex flex-col items-center justify-center p-10 py-14 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 shadow-xl text-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/25 shadow-inner">
            <Timer className="w-12 h-12 animate-pulse" />
          </div>
          
          <div>
            <h3 className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">Dooro Wakhtiga Tijaabada</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
              Xulo inta ilbiriqsi ama daqiiqo aad rabto inaad naftaada tijaabiso, ka dibna bilaaw qoraalka si loo xisaabiyo xawaarahaaga.
            </p>
          </div>

          {/* Duration Selector Tabs */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Xulo Wakhtiga:</span>
            <div className="flex flex-wrap justify-center gap-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
              {[
                { label: '15 Seexan', value: 15 },
                { label: '30 Seexan', value: 30 },
                { label: '1 Daqiiqo (60s)', value: 60 },
                { label: '2 Daqiiqo (120s)', value: 120 },
                { label: '5 Daqiiqo (300s)', value: 300 }
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setSelectedDuration(item.value)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    selectedDuration === item.value
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startTest}
            className="px-8 py-3.5 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/35 transition-all active:scale-[0.98] hover:scale-[1.01] mt-2 text-base cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Bilaaw Tijaabada</span>
          </button>
        </div>
      )}

      {/* 2. TYPING PHASE */}
      {phase === 'typing' && (
        <div className="w-full flex flex-col gap-6">
          {/* Realtime Stats HUD */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/35 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Xawaaraha (WPM)</span>
              <span className="text-3xl font-extrabold text-emerald-500 mt-1 font-mono">{wpm}</span>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/35 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Saxnaanta (Accuracy)</span>
              <span className="text-3xl font-extrabold text-amber-500 mt-1 font-mono">{accuracy}%</span>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/35 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Ereyada (La Qoray / La Rabay)</span>
              <span className="text-2xl font-extrabold text-indigo-500 mt-1.5 font-mono">{realtimeTotalWordsTyped} / {realtimeTotalWordsExpected}</span>
            </div>

            {/* Circular Timer HUD */}
            <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/35 flex justify-between items-center px-6 shadow-sm">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Wakhtiga</span>
                <span className={`text-2xl font-extrabold mt-0.5 font-mono ${
                  timeLeft > 15 ? 'text-indigo-500' : timeLeft > 7 ? 'text-amber-500' : 'text-rose-500 animate-pulse'
                }`}>{timeLeft}s</span>
              </div>
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    className="stroke-zinc-200 dark:stroke-zinc-850"
                    strokeWidth="3"
                    fill="transparent"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    className={`transition-all duration-300 ${
                      timeLeft > 15 ? 'stroke-indigo-500' : timeLeft > 7 ? 'stroke-amber-500' : 'stroke-rose-500'
                    }`}
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 16}
                    strokeDashoffset={2 * Math.PI * 16 * (1 - timeLeft / selectedDuration)}
                    strokeLinecap="round"
                  />
                </svg>
                <Timer className="absolute w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Typing Terminal Display Board */}
          <div 
            onClick={handlePanelClick}
            className="relative w-full p-8 md:p-10 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/20 backdrop-blur-md shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-indigo-500/20 cursor-text transition-all duration-300"
          >
            {/* Guide click tooltip when typing starts */}
            {userInput.length === 0 && (
              <div className="absolute top-3 right-6 flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-xs animate-pulse">
                <span>Ka bilaaw inaad badhanka qorto...</span>
              </div>
            )}

            {/* Target text visualizer */}
            <div className="text-xl md:text-2xl leading-relaxed font-medium font-mono select-none tracking-wide text-left break-words max-h-56 overflow-y-auto pr-2">
              {(() => {
                // Find character range of current word
                let curWordStart = userInput.length;
                while (curWordStart > 0 && currentText[curWordStart - 1] !== ' ') {
                  curWordStart--;
                }
                let curWordEnd = userInput.length;
                while (curWordEnd < currentText.length && currentText[curWordEnd] !== ' ') {
                  curWordEnd++;
                }

                return currentText.split('').map((char, index) => {
                  let color = "text-zinc-400 dark:text-zinc-600";
                  let isCurrent = index === userInput.length;
                  const isCharInCurrentWord = index >= curWordStart && index < curWordEnd;
                  
                  if (index < userInput.length) {
                    const typed = userInput[index];
                    if (typed === char) {
                      color = "text-emerald-550 dark:text-emerald-400 font-bold transition-all duration-150 drop-shadow-[0_0_2px_rgba(16,185,129,0.35)]";
                    } else {
                      color = "text-rose-550 dark:text-rose-450 font-bold border-b-2 border-rose-500 bg-rose-500/10 drop-shadow-[0_0_2px_rgba(244,63,94,0.35)]";
                    }
                  }

                  const wordHighlightClass = isCharInCurrentWord && !isCurrent
                    ? "bg-indigo-500/5 dark:bg-indigo-500/10 border-b border-indigo-500/20"
                    : "";

                  return (
                    <span 
                      key={index}
                      className={`relative ${color} ${wordHighlightClass} ${
                        isCurrent ? 'bg-zinc-200 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 ring-2 ring-indigo-500/50 rounded-sm' : ''
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-indigo-500 animate-blink" />
                      )}
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  );
                });
              })()}
            </div>

            {/* Hidden Input field for keyboard listening */}
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
            />
          </div>

          {/* Quick tip */}
          <div className="flex items-center gap-2 text-xs text-zinc-450 dark:text-zinc-500 px-4">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Ku fiiro: Waxaad bedeli kartaa sanduuqa qoraalka marka aad dhamaystirto adiga oo aan istaagin. Wakhtigu wuu soconayaa.</span>
          </div>
        </div>
      )}

      {/* 3. RESULT PHASE */}
      {phase === 'result' && (
        <div className="w-full flex flex-col items-center justify-center p-10 py-12 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#15171e]/95 text-zinc-800 dark:text-zinc-100 shadow-2xl text-center gap-6 relative backdrop-blur-xl border-t-4 border-t-indigo-500 hover:shadow-[0_0_50px_rgba(99,102,241,0.15)] transition-all duration-300">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
            <Award className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h3 className="text-3xl font-extrabold text-zinc-800 dark:text-zinc-100">
              Natiijada Tijaabada!
            </h3>
            <p className={`text-sm font-semibold mt-3 max-w-md mx-auto ${feedback.style}`}>
              {feedback.text}
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="w-full max-w-md grid grid-cols-3 gap-3 border-t border-b border-zinc-100 dark:border-zinc-800 py-6 font-mono text-xs text-zinc-500 dark:text-zinc-400 my-2 shadow-inner p-2.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Xawaaraha</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{finalWpm} WPM</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Saxnaanta</span>
              <span className="text-xl font-extrabold text-amber-500">{accuracy}%</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Keystrokes</span>
              <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{correctKeystrokes}/{totalKeystrokes}</span>
            </div>
          </div>

          {/* Expected vs Typed Word Statistics Grid */}
          <div className="w-full max-w-md grid grid-cols-2 gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-5 font-mono text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <div className="flex flex-col gap-1 items-center p-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="text-[10px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider font-semibold">Ereyada La Rabay (Expected)</span>
              <span className="text-lg font-extrabold text-indigo-500">{totalWordsExpected} Erey</span>
            </div>
            <div className="flex flex-col gap-1 items-center p-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="text-[10px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider font-semibold">Ereyada Aad Qortay (Typed)</span>
              <span className="text-lg font-extrabold text-indigo-500">{totalWordsTyped} Erey</span>
            </div>
          </div>

          {/* Detailed Word Analysis rendering block */}
          {expectedTextLog.length > 0 && (
            <div className="w-full text-left mt-2 max-w-lg">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-405 uppercase tracking-wider mb-2.5 font-mono">
                📝 Ereyadii la Soo Bandhigay (Diagnostic Word View):
              </h4>
              <div className="w-full max-h-48 overflow-y-auto p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 shadow-inner">
                {renderWordAnalysis()}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex gap-4 w-full justify-center max-w-xs mt-4">
            <button
              onClick={startTest}
              className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-550 hover:to-purple-550 text-white flex items-center justify-center gap-1 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tijaabi Mar Kale</span>
            </button>
            
            <button
              onClick={() => {
                setPhase('select');
                setUserInput('');
              }}
              className="flex-1 py-3 rounded-xl font-bold border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Wakhti Kale</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeedTest;
