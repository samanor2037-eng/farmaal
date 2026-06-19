import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { levels } from './data/levels';
import type { Level } from './types';
import AuthModal from './components/AuthModal';
import LevelSelector from './components/LevelSelector';
import TypingArea from './components/TypingArea';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import TypingGame from './components/TypingGame';
import KeyboardGuideModal from './components/KeyboardGuideModal';
import { User as UserIcon, Flame, Award, Sun, Moon } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading, theme, toggleTheme } = useAuth();
  const [view, setView] = useState<'selector' | 'typing' | 'dashboard' | 'admin' | 'game'>('dashboard');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [gameLevelFilter, setGameLevelFilter] = useState<Level | null>(null);
  const [nextLevelPending, setNextLevelPending] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Auto-show Keyboard Guide for new users on their first session
  useEffect(() => {
    if (user) {
      const guideKey = `farmaal_guide_viewed_${user.userId}`;
      const hasViewed = localStorage.getItem(guideKey);
      const isNewUser = user.currentLevel === 1 && user.totalXP === 0 && user.levelHistory.length === 0;
      
      if (isNewUser && !hasViewed) {
        setShowGuide(true);
        localStorage.setItem(guideKey, 'true');
      }
    }
  }, [user]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4 bg-zinc-50 dark:bg-[#0b0f19] transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Soo rarayaa... (Loading...)</span>
      </div>
    );
  }

  // Not Authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-50 dark:bg-[#0b0f19] px-4 transition-colors duration-300 relative">
        <div className="absolute top-4 right-4 z-50 animate-fade-in">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm cursor-pointer transition-colors"
            title={theme === 'dark' ? "Badal Iftiinka (Light Mode)" : "Badal Madowga (Dark Mode)"}
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-indigo-500" />}
          </button>
        </div>
        <AuthModal />
      </div>
    );
  }

  // Navigation handlers
  const handleSelectLevel = (level: Level) => {
    setActiveLevel(level);
    setView('typing');
  };

  const handleNextLevel = () => {
    if (!activeLevel) return;
    const nextId = activeLevel.id + 1;

    // Boundary Checkpoint: Level 15, 30, 45, 60, etc. (group endpoints)
    if (activeLevel.id % 15 === 0) {
      setGameLevelFilter(activeLevel);
      setNextLevelPending(nextId);
      setView('game');
      return;
    }

    const nextLevel = levels.find(l => l.id === nextId);
    if (nextLevel && nextId <= user.currentLevel) {
      setActiveLevel(nextLevel);
      setView('typing');
    } else {
      setView('selector');
      setActiveLevel(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#0b0f19] text-zinc-800 dark:text-zinc-100 transition-colors duration-300">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-[#0b0f19]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div 
            onClick={() => { setView('dashboard'); setActiveLevel(null); }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <img 
              src="/logo.png" 
              alt="FARMAAL Logo" 
              className="w-9 h-9 object-contain group-hover:scale-105 transition-transform select-none pointer-events-none" 
            />
            <div className="text-left">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                FARMAAL
              </span>
              <span className="text-[10px] font-bold text-zinc-400 block -mt-1 uppercase tracking-wide">
                Af-Soomaali
              </span>
            </div>
          </div>

          {/* User Widget */}
          <div className="flex items-center gap-4">
            {/* Stats Pills */}
            <div className="hidden sm:flex items-center gap-3">
              <div 
                onClick={() => setView('dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/80 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition-colors"
                title="XP earned"
              >
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{user.totalXP} XP</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <Award className="w-4 h-4 text-indigo-500" />
                <span>Casharka {user.currentLevel}</span>
              </div>
            </div>

            {/* Keyboard Guide Button */}
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm cursor-pointer"
              title="Open Keyboard Guide and Typing Tutorial"
            >
              <span>📖 Hagaha</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm cursor-pointer transition-colors"
              title={theme === 'dark' ? "Badal Iftiinka (Light Mode)" : "Badal Madowga (Dark Mode)"}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Casharada Button */}
            <button
              onClick={() => { setView('selector'); setActiveLevel(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer ${
                view === 'selector' || view === 'typing'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm'
              }`}
              title="Lessons"
            >
              <span>📚 Casharada</span>
            </button>

            {/* Game Button */}
            <button
              onClick={() => { setView('game'); setActiveLevel(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer ${
                view === 'game' 
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm'
              }`}
              title="Play FARMAAL Games"
            >
              <span>🎮 Game</span>
            </button>

            {/* Admin Panel button */}
            {user.email === 'admin@typemaster.com' && (
              <button
                onClick={() => setView(view === 'admin' ? 'selector' : 'admin')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer ${
                  view === 'admin' 
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm'
                }`}
              >
                <Award className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>Admin Panel</span>
              </button>
            )}

            {/* Quick Profile Nav button */}
            <button
              onClick={() => { setView('dashboard'); setActiveLevel(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer ${
                view === 'dashboard'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm transition-colors'
              }`}
            >
              <UserIcon className="w-4 h-4 text-zinc-500" />
              <span className="max-w-[80px] truncate">{user.name}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-start">
        {view === 'selector' && (
          <div className="animate-fade-in">
            <LevelSelector 
              levels={levels} 
              onSelectLevel={handleSelectLevel} 
            />
          </div>
        )}

        {view === 'typing' && activeLevel && (
          <div className="animate-fade-in">
            <TypingArea 
              level={activeLevel} 
              onNextLevel={handleNextLevel}
              onBackToLevels={() => { setView('selector'); setActiveLevel(null); }}
              onPlayPracticeGame={(lvl) => {
                setGameLevelFilter(lvl);
                setView('game');
              }}
            />
          </div>
        )}

        {view === 'dashboard' && (
          <div className="animate-fade-in">
            <Dashboard 
              onBackToSelector={() => setView('selector')} 
            />
          </div>
        )}

        {view === 'admin' && (
          <div className="animate-fade-in">
            <AdminPanel />
          </div>
        )}

        {view === 'game' && (
          <div className="animate-fade-in">
            <TypingGame 
              onBackToSelector={() => { 
                setView('selector'); 
                setActiveLevel(null); 
                setGameLevelFilter(null); 
                setNextLevelPending(null); 
              }} 
              levelFilter={gameLevelFilter}
              nextLevelId={nextLevelPending}
              onStartNextLevel={(nextId) => {
                const nextLvl = levels.find(l => l.id === nextId);
                if (nextLvl) {
                  setActiveLevel(nextLvl);
                  setView('typing');
                  setGameLevelFilter(null);
                  setNextLevelPending(null);
                }
              }}
            />
          </div>
        )}
      </main>

      {/* Premium Footer */}
      <footer className="w-full py-6 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/20 text-center text-xs text-zinc-400 dark:text-zinc-500 select-none">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 FARMAAL. Af-Soomaali Fasiix ah (Somali Typing Trainer).</span>
          <div className="flex gap-4">
            <span className="hover:text-indigo-500 cursor-pointer">Shuruudaha</span>
            <span className="hover:text-indigo-500 cursor-pointer">Qaanuunka</span>
            <span className="hover:text-indigo-500 cursor-pointer">Nala soo xidhiidh</span>
          </div>
        </div>
      </footer>

      {/* Keyboard Guide Overlay Modal */}
      {showGuide && <KeyboardGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
