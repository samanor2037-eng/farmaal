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
import FooterModal from './components/FooterModal';
import LogoDraw from './components/LogoDraw';
import SpeedTest from './components/SpeedTest';
import { User as UserIcon, Flame, Award, Sun, Moon, Menu, X } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading: authLoading, theme, toggleTheme } = useAuth();
  const [view, setView] = useState<'selector' | 'typing' | 'dashboard' | 'admin' | 'game' | 'speedtest'>('dashboard');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [gameLevelFilter, setGameLevelFilter] = useState<Level | null>(null);
  const [nextLevelPending, setNextLevelPending] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [minLoadingDone, setMinLoadingDone] = useState(false);
  const [activeFooterTab, setActiveFooterTab] = useState<'terms' | 'privacy' | 'contact' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleNavClick = (newView: 'selector' | 'typing' | 'dashboard' | 'admin' | 'game' | 'speedtest') => {
    setView(newView);
    setActiveLevel(null);
    setIsMobileMenuOpen(false);
  };

  // Guarantee loading animation is shown for at least 1.8 seconds for premium UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingDone(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

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

  // Auto-close AuthModal when user successfully signs in
  useEffect(() => {
    if (user && user.userId !== 'guest') {
      setShowAuthModal(false);
    }
  }, [user]);

  // Loading Screen
  const isLoading = authLoading || !minLoadingDone;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-50 dark:bg-[#0b0f19] transition-colors duration-500 p-4">
        {/* Centered layout wrapper */}
        <div className="relative flex flex-col items-center gap-6 p-8">

          {/* Logo container wrapper with loading spinner rounding the logo */}
          <div className="w-32 h-32 relative flex items-center justify-center z-10">
            {/* Concentric non-rotating rounded square spinner */}
            <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="60%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Outer stationary track */}
              <path
                d="M 24,8 L 76,8 C 85,8 92,15 92,24 L 92,76 C 92,85 85,92 76,92 L 24,92 C 15,92 8,85 8,76 L 8,24 C 8,15 15,8 24,8 Z"
                stroke="rgba(156, 163, 175, 0.12)"
                strokeWidth="2.5"
                fill="none"
              />
              {/* Sweeping border glow segment */}
              <path
                d="M 24,8 L 76,8 C 85,8 92,15 92,24 L 92,76 C 92,85 85,92 76,92 L 24,92 C 15,92 8,85 8,76 L 8,24 C 8,15 15,8 24,8 Z"
                stroke="url(#spinner-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                className="animate-border-glow-sweep"
              />
            </svg>
            <LogoDraw size={96} className="relative z-10" />
          </div>
        </div>
      </div>
    );
  }

  // Safe fallback if user is null
  if (!user) {
    return null;
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
      <nav className="sticky top-0 z-50 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
          >
            <img
              src="logo.png"
              alt="FARMAAL Logo"
              className="w-9 h-9 object-contain logo-header-spring select-none pointer-events-none"
            />
            <div className="text-left flex flex-col justify-center">
              <span className="text-[16px] sm:text-[20px] font-black tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent leading-none">
                FARMAAL
              </span>
              <span className="text-[5px] sm:text-[6px] font-bold text-zinc-400 dark:text-zinc-500 block mt-1 uppercase tracking-tight whitespace-nowrap leading-none">
                PROFESSIONAL TYPING MASTERY
              </span>
            </div>
          </div>

          {/* Desktop Navigation Widget */}
          <div className="hidden xl:flex items-center gap-2">
            {/* Stats Pills */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => handleNavClick('dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/80 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition-colors whitespace-nowrap"
                title="XP earned"
              >
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{user.totalXP} XP</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                <Award className="w-4 h-4 text-indigo-500" />
                <span>Casharka {user.currentLevel}</span>
              </div>
            </div>

            {/* Keyboard Guide Button */}
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm cursor-pointer whitespace-nowrap"
              title="Open Keyboard Guide and Typing Tutorial"
            >
              <span>📖 Hagaha</span>
            </button>

            {/* Casharada Button */}
            <button
              onClick={() => handleNavClick('selector')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer whitespace-nowrap ${view === 'selector' || view === 'typing'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm'
                }`}
              title="Lessons"
            >
              <span>📚 Casharada</span>
            </button>

            {/* Speed Test Button */}
            <button
              onClick={() => handleNavClick('speedtest')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer whitespace-nowrap ${view === 'speedtest'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm'
                }`}
              title="Tijaabo Xawaaraha"
            >
              <span>⏱️ Tijaabo</span>
            </button>

            {/* Game Button */}
            <button
              onClick={() => handleNavClick('game')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer whitespace-nowrap ${view === 'game'
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer whitespace-nowrap ${view === 'admin'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm'
                  }`}
              >
                <Award className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>Admin Panel</span>
              </button>
            )}

            {/* Quick Profile Nav button / Login Trigger */}
            {user.userId === 'guest' ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm cursor-pointer whitespace-nowrap shadow-sm active:scale-95 transition-all"
              >
                <UserIcon className="w-4 h-4" />
                <span>Gali / Is-diiwaangeli</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer whitespace-nowrap ${view === 'dashboard'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm transition-colors'
                  }`}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-4 h-4 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                )}
                <span className="max-w-[80px] truncate">{user.name}</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm cursor-pointer transition-colors whitespace-nowrap"
              title={theme === 'dark' ? "Badal Iftiinka (Light Mode)" : "Badal Madowga (Dark Mode)"}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
          </div>

          {/* Mobile Navigation Header Controls */}
          <div className="flex items-center gap-2 xl:hidden">
            {/* Theme Toggle Button (Mobile) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm cursor-pointer transition-colors whitespace-nowrap"
              title={theme === 'dark' ? "Badal Iftiinka" : "Badal Madowga"}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-indigo-500" />}
            </button>

            {/* Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="xl:hidden w-full border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0b0f19] py-4 px-4 flex flex-col gap-2.5 shadow-lg animate-fade-in">
            {/* Mobile Stats */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-900/20 rounded-xl border border-zinc-150 dark:border-zinc-850">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{user.totalXP} XP</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <Award className="w-4 h-4 text-indigo-500" />
                <span>Casharka {user.currentLevel}</span>
              </div>
            </div>

            {/* Navigation links */}
            <button
              onClick={() => handleNavClick('selector')}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl font-semibold text-sm cursor-pointer ${view === 'selector' || view === 'typing'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500 pl-2'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
            >
              <span>📚 Casharada</span>
            </button>

            <button
              onClick={() => handleNavClick('speedtest')}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl font-semibold text-sm cursor-pointer ${view === 'speedtest'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500 pl-2'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
            >
              <span>⏱️ Tijaabo Xawaaraha</span>
            </button>

            <button
              onClick={() => handleNavClick('game')}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl font-semibold text-sm cursor-pointer ${view === 'game'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500 pl-2'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
            >
              <span>🎮 FARMAAL Games</span>
            </button>

            <button
              onClick={() => { setShowGuide(true); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              <span>📖 Hagaha Qorista</span>
            </button>

            {user.email === 'admin@typemaster.com' && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl font-semibold text-sm cursor-pointer ${view === 'admin'
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500 pl-2'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
              >
                <Award className="w-4 h-4 text-indigo-500" />
                <span>Admin Panel</span>
              </button>
            )}

            {user.userId === 'guest' ? (
              <button
                onClick={() => { setShowAuthModal(true); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span>Gali / Is-diiwaangeli</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl font-semibold text-sm cursor-pointer ${view === 'dashboard'
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500 pl-2'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-4 h-4 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                )}
                <span>Profile ({user.name})</span>
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Guest Mode Warning Banner */}
      {user.userId === 'guest' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center select-none animate-fade-in">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2.5 text-xs font-semibold text-amber-850 dark:text-amber-300">
            <span>⚠️ Waxaad ku jirtaa Habka Martida (Guest Mode). Horumarkaaga lama kaydin doono haddii aad ka baxdo browser-ka.</span>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              Gali / Is-diiwaangeli
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-start">
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

        {view === 'speedtest' && (
          <div className="animate-fade-in">
            <SpeedTest
              onBackToSelector={() => setView('selector')}
            />
          </div>
        )}
      </main>

      {/* Premium Footer */}
      <footer className="w-full py-6 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/20 text-center text-xs text-zinc-400 dark:text-zinc-500 select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 FARMAAL. Af-Soomaali Fasiix ah (Somali Typing Trainer).</span>
          <div className="flex gap-4">
            <span onClick={() => setActiveFooterTab('terms')} className="hover:text-indigo-500 cursor-pointer">Shuruudaha</span>
            <span onClick={() => setActiveFooterTab('privacy')} className="hover:text-indigo-500 cursor-pointer">Qaanuunka</span>
            <span onClick={() => setActiveFooterTab('contact')} className="hover:text-indigo-500 cursor-pointer">Nala soo xidhiidh</span>
          </div>
        </div>
      </footer>

      {/* Keyboard Guide Overlay Modal */}
      {showGuide && <KeyboardGuideModal onClose={() => setShowGuide(false)} />}

      {/* Footer Details Modals */}
      {activeFooterTab && (
        <FooterModal type={activeFooterTab} onClose={() => setActiveFooterTab(null)} />
      )}

      {/* Floating Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/45 backdrop-blur-[2px] p-4 animate-fade-in">
          <AuthModal onClose={() => setShowAuthModal(false)} />
        </div>
      )}
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
