import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Trash2, User as UserIcon, Flame, TrendingUp, Target, History, Sparkles, Monitor, Download } from 'lucide-react';

interface DashboardProps {
  onBackToSelector: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onBackToSelector }) => {
  const { user, logoutUser } = useAuth();
  const isDesktop = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).deferredPrompt) {
      setInstallPrompt((window as any).deferredPrompt);
    }

    const handlePrompt = () => {
      setInstallPrompt((window as any).deferredPrompt);
    };

    window.addEventListener('pwa-install-available', handlePrompt);
    return () => {
      window.removeEventListener('pwa-install-available', handlePrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        (window as any).deferredPrompt = null;
      }
    } else {
      alert(
        "Si aad toos ugu rakibto Farmaal (PWA):\n\n" +
        "1. Ku riix browser-kaaga astaanta saddexda dhibcood (ee koonaha sare/midig) ama astaanta '+' ee URL bar-ka.\n" +
        "2. Dooro 'Install Farmaal' ama 'Add to Home Screen'.\n\n" +
        "Tani waxay app-ka toos ugu soo dejinaysaa desktop-kaaga ama mobile-kaaga iyadoo aan wax digniin ah soo saarayn!"
      );
    }
  };

  if (!user) return null;

  // Calculate Average Accuracy
  const avgAccuracy = user.levelHistory.length > 0
    ? Math.round(user.levelHistory.reduce((sum, h) => sum + h.accuracy, 0) / user.levelHistory.length)
    : 0;

  // Level Progression details
  const totalLevels = 120;
  const completedCount = user.levelHistory.filter(h => h.stars >= 1).length;
  const progressPercent = Math.round((completedCount / totalLevels) * 100);

  // Group levels completion by category
  const beginnerCompleted = user.levelHistory.filter(h => h.levelId >= 1 && h.levelId <= 75 && h.stars >= 1).length;
  const intermediateCompleted = user.levelHistory.filter(h => h.levelId >= 76 && h.levelId <= 90 && h.stars >= 1).length;
  const advancedCompleted = user.levelHistory.filter(h => h.levelId >= 91 && h.levelId <= 105 && h.stars >= 1).length;
  const expertCompleted = user.levelHistory.filter(h => h.levelId >= 106 && h.levelId <= 120 && h.stars >= 1).length;

  const handleResetProgress = () => {
    if (window.confirm("Ma dhab baa inaad rabto inaad dib u bilowdo dhammaan horumarkaaga? Tani dib looma soo celin karo! (Are you sure you want to reset all your progress? This cannot be undone!)")) {
      // Clear level history in LocalStorage and refresh
      const storedUsers = localStorage.getItem('typemaster_users');
      if (storedUsers) {
        const usersList = JSON.parse(storedUsers);
        const updatedUsers = usersList.map((u: any) => {
          if (u.userId === user.userId) {
            return {
              ...u,
              currentLevel: 1,
              totalXP: 0,
              highestWPM: 0,
              levelHistory: []
            };
          }
          return u;
        });
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
        window.location.reload();
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      {/* Dashboard Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
              {user.name}
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {user.email}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onBackToSelector}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/15 transition-all"
          >
            Ku laabo Casharrada
          </button>
          <button
            onClick={logoutUser}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-rose-500 transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total XP Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dhibcaha (Total XP)</div>
            <div className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-0.5 font-mono">{user.totalXP}</div>
          </div>
        </div>

        {/* Highest WPM Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Xawaaraha Ugu Sareeya</div>
            <div className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-0.5 font-mono">{user.highestWPM} WPM</div>
          </div>
        </div>

        {/* Average Accuracy Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Saxnaanta Celcelis</div>
            <div className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-0.5 font-mono">{avgAccuracy}%</div>
          </div>
        </div>

        {/* Completed Levels Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Casharada (Completed)</div>
            <div className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-0.5 font-mono">{completedCount}/120</div>
          </div>
        </div>
      </div>

      {/* Progress Bars and Category Progression */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progression Overview */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-5">
          <div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Natiijada guud (Overall Progress)</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Dhamaystirka 120-ka heer ee casharrada.</p>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              <span>Boqolleyda: {progressPercent}%</span>
              <span>{completedCount} / 120 Cashar</span>
            </div>
            <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Category Split */}
          <div className="flex flex-col gap-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
            {/* Beginner */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                <span>Beginner (Level 1-75)</span>
                <span>{beginnerCompleted}/75</span>
              </div>
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(beginnerCompleted/75)*100}%` }} />
              </div>
            </div>

            {/* Intermediate */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                <span>Intermediate (Level 76-90)</span>
                <span>{intermediateCompleted}/15</span>
              </div>
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${(intermediateCompleted/15)*100}%` }} />
              </div>
            </div>

            {/* Advanced */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                <span>Advanced (Level 91-105)</span>
                <span>{advancedCompleted}/15</span>
              </div>
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${(advancedCompleted/15)*100}%` }} />
              </div>
            </div>

            {/* Expert */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                <span>Expert (Level 106-120)</span>
                <span>{expertCompleted}/15</span>
              </div>
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500" style={{ width: `${(expertCompleted/15)*100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* History Logs */}
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              Dhacdooyinkii u dambeeyay (Recent History)
            </h3>
          </div>

          <div className="flex-1 max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-2.5">
            {user.levelHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500 text-xs">
                <span>Wali wax taariikh ah ma jiro.</span>
                <span>Dhamaystir casharka koowaad si aad u aragto!</span>
              </div>
            ) : (
              [...user.levelHistory].reverse().map((history) => (
                <div 
                  key={history.levelId}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 font-mono text-xs text-zinc-500 dark:text-zinc-400"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Casharka {history.levelId}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {new Date(history.completedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span>{history.wpm} WPM</span>
                    <span>{history.accuracy}% Acc</span>
                    <div className="flex">
                      {[1, 2, 3].map((s) => (
                        <span key={s} className={s <= history.stars ? 'text-amber-400' : 'text-zinc-200 dark:text-zinc-800'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Installation Banner */}
      {!isDesktop && (
        <div className="p-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 flex flex-col gap-6 mt-2 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shrink-0">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center md:justify-start gap-2">
                <span>FARMAAL Desktop & Mobile App</span>
                <span className="text-[10px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Dooro Qaabka Aad Rabto</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-xl leading-relaxed">
                Waxaad mashruuca Farmaal u rakiban kartaa kombiyuutarkaaga ama telefoonkaaga labo qaab oo kala duwan. Dooro midda kuugu habboon:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: PWA (Recommended) */}
            <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5 flex flex-col justify-between gap-4">
              <div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider w-fit block mb-2">
                  Lagu Taliyey (Recommended)
                </span>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Toos u Rakibo (PWA App)</span>
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Ku rakibo hal guji directly Browser-kaaga. Waa bilaash, wuxuu ku samaynayaa icon desktop-ka, wuxuuna ku furmayaa window standalone ah.
                  <strong> Ma laha wax digniin ammaan ah (Zero security warnings).</strong>
                </p>
              </div>
              <button
                onClick={handleInstallPWA}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Toos u Rakibo (Install PWA)</span>
              </button>
            </div>

            {/* Option 2: Setup Installer (.exe) */}
            <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/5 flex flex-col justify-between gap-4">
              <div>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider w-fit block mb-2">
                  Offline Setup File
                </span>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Soo Degso Setup (.exe)</span>
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Soo degso installer-ka rasmiga ah ee desktop-ka (111.72 MB).
                  <em> Fiiro gaar ah: Haddii uu Windows Defender kuu soo saaro digniin buluug ah, guji "More info" ka dibna dooro "Run anyway" si aad u bilowdo.</em>
                </p>
              </div>
              <a
                href="https://github.com/samanor2037-eng/farmaal/releases/download/v1.0.0/Farmaal_Setup.exe"
                download
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] text-center cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Soo Degso Setup (.exe)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
        <div>
          <h4 className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" />
            <span>Dib u Dejinta Xogta (Danger Zone)</span>
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Waxaad gabi ahaanba tirtiri kartaa dhibcahaaga, casharada iyo taariikhda la kaydiyay ee profile-kaan.
          </p>
        </div>
        <button
          onClick={handleResetProgress}
          className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/10 active:scale-95"
        >
          Dib u Deji
        </button>
      </div>
    </div>
  );
};
export default Dashboard;
