import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Users, ChevronRight, User as UserIcon, X } from 'lucide-react';
import type { User } from '../types';

interface AuthModalProps {
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { registerUser, loginUser, allUsers, loginWithGoogle, loginWithGoogleRedirect, useFirebase, loginWithToken } = useAuth();
  const isDesktop = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  const [isLogin, setIsLogin] = useState(allUsers.length > 0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [desktopToken, setDesktopToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError(null);
    setLoading(true);

    const res = await loginWithToken(desktopToken);
    if (res.success) {
      if (onClose) onClose();
    } else {
      setTokenError(res.error || 'Token-ku waa khalad.');
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        if (res.error === 'POPUP_BLOCKED') {
          setError('Daqoqa gelitaanka waa la xannibay ama waa la xiray. Waxaa laguu wareejinayaa bogga Google...');
          setTimeout(async () => {
            try {
              await loginWithGoogleRedirect();
            } catch (redirectErr: any) {
              setError('Wareejintu way fashilantay: ' + redirectErr.message);
              setLoading(false);
            }
          }, 1500);
        } else {
          setError(res.error || 'Google Sign-In failed.');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError('Cillad farsamo ayaa dhacday.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await loginUser(email, password);
        if (!res.success) {
          setError(res.error || 'Khalad ayaa dhacay.');
        }
      } else {
        const res = await registerUser(name, email, password);
        if (!res.success) {
          setError(res.error || 'Khalad ayaa dhacay.');
        }
      }
    } catch (err) {
      setError('Cillad farsamo ayaa dhacday.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (u: User) => {
    setError(null);
    setEmail(u.email);
    setIsLogin(true);

    const isBypassUser = u.email === 'admin@typemaster.com';

    if (!useFirebase || isBypassUser) {
      setLoading(true);
      const correctPassword = u.userId === 'user_admin' ? (u.password || 'admin123') : u.password;
      try {
        const res = await loginUser(u.email, correctPassword);
        if (!res.success) {
          setError(res.error || 'Gaba-gabo khaldan.');
        }
      } catch (err) {
        setError('Cillad farsamo ayaa dhacday.');
      } finally {
        setLoading(false);
      }
    } else {
      setPassword('');
      setError('Fadlan geli kelmadaada sirta ah (Password) si aad u gasho.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 shadow-xl flex flex-col gap-6 select-none animate-fade-in relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-150 dark:hover:bg-zinc-800 text-zinc-450 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {/* Header info */}
      <div className="text-center flex flex-col items-center">
        <img 
          src="logo.png" 
          alt="FARMAAL Logo" 
          className="w-16 h-16 object-contain mb-3 drop-shadow-md select-none pointer-events-none" 
        />
        <h2 className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">
          FARMAAL
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[280px]">
          Horumari xawaarahaaga iyo saxnaantaada qoraalka adigoo adeegsanaya Af-Soomaali Fasiix ah.
        </p>
      </div>

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className={`p-3 text-xs font-semibold rounded-xl border ${
            error.includes('Fadlan geli kelmadaada sirta ah')
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}>
            {error}
          </div>
        )}

        {!isLogin && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Magacaaga (Name)</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Geli magacaaga"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Iimaylka (Email)</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="magac@iimayl.com"
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Kelmada Sirta ah (Password)</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {isLogin ? (
            <>
              <LogIn className="w-4.5 h-4.5" />
              <span>Gali System-ka</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4.5 h-4.5" />
              <span>Is-diiwaangeli</span>
            </>
          )}
        </button>
      </form>

      {/* Switch state Link */}
      <div className="text-center text-xs">
        <span className="text-zinc-400 dark:text-zinc-500">
          {isLogin ? "Madan tahay mid cusub? " : "Mar hore baad is-diiwaangelisay? "}
        </span>
        <button
          onClick={() => {
            setError(null);
            setIsLogin(!isLogin);
            setName('');
            setEmail('');
            setPassword('');
          }}
          type="button"
          className="font-bold text-indigo-500 hover:text-indigo-400 transition-colors ml-1 focus:outline-none"
        >
          {isLogin ? "Is-diiwaangeli (Sign Up)" : "Galo (Log In)"}
        </button>
      </div>

      {/* Google Sign-In Button / Desktop Info */}
      {isDesktop ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-800/60 mt-2">
            <div className="text-left flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">Ku Galo Google</label>
              <button
                type="button"
                onClick={() => {
                  window.open("https://farmaal.vercel.app/?desktop_auth=true", "_blank");
                }}
                className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Ku galo Google</span>
              </button>
            </div>
            
            {showManualToken ? (
              <form onSubmit={handleVerifyToken} className="flex flex-col gap-3 mt-1 animate-fade-in">
                <div className="text-left flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider">Geli Token-ka Aqoonsiga (Paste Token)</label>
                  <input
                    type="text"
                    required
                    value={desktopToken}
                    onChange={(e) => setDesktopToken(e.target.value)}
                    placeholder="Dheji token-kii aad ka soo koobisay browser-ka"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                
                {tokenError && (
                  <div className="p-3 text-xs font-semibold rounded-xl border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                    {tokenError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  <span>Xaqiiji oo Gali</span>
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowManualToken(true)}
                className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors focus:outline-none cursor-pointer text-center mt-0.5"
              >
                Muggee login-ka otomaatiga ah uu shaqayn waayay? Guji halkan si aad u geliso token gacanta ah.
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-600 select-none mt-2">
            <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800/60 flex-1" />
            <span className="text-[9px] uppercase font-bold tracking-wider px-2">Ama Offline</span>
            <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800/60 flex-1" />
          </div>

          <button
            type="button"
            onClick={() => {
              const localAdmin = allUsers.find(u => u.userId === 'user_admin') || allUsers[0];
              if (localAdmin) {
                handleQuickLogin(localAdmin);
              }
            }}
            className="w-full py-2.5 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Ku soco Offline (Local Guest Mode)</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-600 select-none">
            <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800/60 flex-1" />
            <span className="text-[10px] uppercase font-bold tracking-wider px-3">Ama (Or)</span>
            <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800/60 flex-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Ku galo Google</span>
          </button>
        </div>
      )}

      {/* Existing Local Users List (Profiles quick selector) - Only show in offline local mode or on desktop */}
      {(!useFirebase || isDesktop) && allUsers.length > 0 && (
        <div className="mt-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Dooro Profile-kaaga (Quick Switch):</span>
          </div>

          <div className="max-h-28 overflow-y-auto flex flex-col gap-2 pr-1">
            {allUsers.map((u) => (
              <div
                key={u.userId}
                onClick={() => handleQuickLogin(u)}
                className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 hover:border-indigo-500/40 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/30 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{u.name}</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-1">{u.email}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthModal;
