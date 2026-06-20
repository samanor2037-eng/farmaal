import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { 
  Search, Trash2, RotateCcw, ShieldAlert, Award, 
  Check, X, Flame, Target, TrendingUp, Users, ChevronRight,
  BarChart3, Trophy, Activity, Zap
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { allUsers, user: currentUser, deleteUser, resetUser, adjustUserLevel, adjustUserXP } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempLevel, setTempLevel] = useState<number>(1);
  const [editingXpUserId, setEditingXpUserId] = useState<string | null>(null);
  const [tempXp, setTempXp] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'users' | 'analytics'>('users');

  // 1. Difficulty distribution among all users
  const getDifficultyDistribution = () => {
    let beginner = 0;
    let intermediate = 0;
    let advanced = 0;
    let expert = 0;

    allUsers.forEach(u => {
      const lvl = u.currentLevel;
      if (lvl <= 30) beginner++;
      else if (lvl <= 60) intermediate++;
      else if (lvl <= 90) advanced++;
      else expert++;
    });

    const total = allUsers.length || 1;
    return {
      beginner: { count: beginner, percent: Math.round((beginner / total) * 100) },
      intermediate: { count: intermediate, percent: Math.round((intermediate / total) * 100) },
      advanced: { count: advanced, percent: Math.round((advanced / total) * 100) },
      expert: { count: expert, percent: Math.round((expert / total) * 100) }
    };
  };

  // 2. Progression ranges (users at different level ranges)
  const getLevelDistribution = () => {
    let range1 = 0; // 1-10
    let range2 = 0; // 11-30
    let range3 = 0; // 31-60
    let range4 = 0; // 61-120

    allUsers.forEach(u => {
      const lvl = u.currentLevel;
      if (lvl <= 10) range1++;
      else if (lvl <= 30) range2++;
      else if (lvl <= 60) range3++;
      else range4++;
    });

    const max = Math.max(range1, range2, range3, range4, 1);
    return [
      { label: 'Heerka 1-10', count: range1, percent: Math.round((range1 / max) * 100) },
      { label: 'Heerka 11-30', count: range2, percent: Math.round((range2 / max) * 100) },
      { label: 'Heerka 31-60', count: range3, percent: Math.round((range3 / max) * 100) },
      { label: 'Heerka 61-120', count: range4, percent: Math.round((range4 / max) * 100) }
    ];
  };

  // 3. WPM distribution (typing speeds of all users based on maxWpm)
  const getWpmDistribution = () => {
    let speed1 = 0; // <20 WPM
    let speed2 = 0; // 20-40 WPM
    let speed3 = 0; // 40-60 WPM
    let speed4 = 0; // 60+ WPM

    allUsers.forEach(u => {
      const w = u.highestWPM;
      if (w < 20) speed1++;
      else if (w <= 40) speed2++;
      else if (w <= 60) speed3++;
      else speed4++;
    });

    const total = allUsers.length || 1;
    return [
      { label: 'Hoose (<20 WPM)', count: speed1, percent: Math.round((speed1 / total) * 100) },
      { label: 'Dhexe (20-40 WPM)', count: speed2, percent: Math.round((speed2 / total) * 100) },
      { label: 'Sare (40-60 WPM)', count: speed3, percent: Math.round((speed3 / total) * 100) },
      { label: 'Xawaare Sare (60+ WPM)', count: speed4, percent: Math.round((speed4 / total) * 100) }
    ];
  };

  // 4. Leaders (WPM and XP)
  const leaderboardWpm = [...allUsers].sort((a, b) => b.highestWPM - a.highestWPM).slice(0, 3);
  const leaderboardXp = [...allUsers].sort((a, b) => b.totalXP - a.totalXP).slice(0, 3);

  // 5. Hardest levels (levels with lowest average accuracy across all user histories)
  const getHardestLevels = () => {
    const levelStats: Record<number, { count: number; sumAcc: number; sumWpm: number }> = {};
    
    allUsers.forEach(u => {
      u.levelHistory.forEach(h => {
        if (!levelStats[h.levelId]) {
          levelStats[h.levelId] = { count: 0, sumAcc: 0, sumWpm: 0 };
        }
        levelStats[h.levelId].count++;
        levelStats[h.levelId].sumAcc += h.accuracy;
        levelStats[h.levelId].sumWpm += h.wpm;
      });
    });

    const hardest = Object.entries(levelStats)
      .map(([id, stats]) => ({
        levelId: parseInt(id),
        avgAcc: Math.round(stats.sumAcc / stats.count),
        avgWpm: Math.round(stats.sumWpm / stats.count),
        completions: stats.count
      }))
      .sort((a, b) => a.avgAcc - b.avgAcc) // lowest accuracy first
      .slice(0, 4);

    return hardest;
  };

  // 6. Overall aggregate averages
  const getOverallAverages = () => {
    let totalWpm = 0;
    let totalAcc = 0;
    let count = 0;

    allUsers.forEach(u => {
      u.levelHistory.forEach(h => {
        totalWpm += h.wpm;
        totalAcc += h.accuracy;
        count++;
      });
    });

    return {
      avgWpm: count > 0 ? Math.round(totalWpm / count) : 0,
      avgAcc: count > 0 ? Math.round(totalAcc / count) : 0,
      totalCompletions: count
    };
  };

  const diffDistribution = getDifficultyDistribution();
  const lvlDistribution = getLevelDistribution();
  const wpmDistribution = getWpmDistribution();
  const hardestLevels = getHardestLevels();
  const overallAvg = getOverallAverages();

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Lama yaqaan (N/A)';
    try {
      const date = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const y = date.getFullYear();
      const m = pad(date.getMonth() + 1);
      const d = pad(date.getDate());
      const h = pad(date.getHours());
      const min = pad(date.getMinutes());
      return `${d}/${m}/${y} ${h}:${min}`;
    } catch {
      return 'Lama yaqaan (N/A)';
    }
  };

  const getAverageStats = (history?: User['levelHistory']) => {
    if (!history || history.length === 0) return { avgWpm: 0, avgAcc: 0 };
    const sumWpm = history.reduce((sum, h) => sum + h.wpm, 0);
    const sumAcc = history.reduce((sum, h) => sum + h.accuracy, 0);
    return {
      avgWpm: Math.round(sumWpm / history.length),
      avgAcc: Math.round(sumAcc / history.length)
    };
  };

  // Filter users based on search
  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Administrative summary stats
  const totalUsers = allUsers.length;
  const totalXP = allUsers.reduce((sum, u) => sum + u.totalXP, 0);
  const highestAppWPM = allUsers.reduce((max, u) => Math.max(max, u.highestWPM), 0);
  const avgLevel = totalUsers > 0 
    ? Math.round(allUsers.reduce((sum, u) => sum + u.currentLevel, 0) / totalUsers) 
    : 1;

  const handleDelete = (userId: string, name: string) => {
    if (userId === 'user_admin') {
      alert("Ma tirtiri kartid maamulaha koowaad. (You cannot delete the primary admin user.)");
      return;
    }
    if (currentUser && currentUser.userId === userId) {
      alert("Ma tirtiri kartid naftaada marka aad ku jirto admin panel. (You cannot delete your own active session.)");
      return;
    }
    if (window.confirm(`Ma dhab baa inaad rabto inaad tirtirto isticmaalaha '${name}'? Tani xogtiisa oo dhan ayay meesha ka saaraysaa! (Are you sure you want to delete '${name}'? This deletes all their data!)`)) {
      deleteUser(userId);
      if (selectedUser?.userId === userId) {
        setSelectedUser(null);
      }
    }
  };

  const handleReset = (userId: string, name: string) => {
    if (window.confirm(`Ma dhab baa inaad rabto inaad dib u dejiso horumarka '${name}'? Heerarkooda oo dhan ayaa dib loo xiri doonaa! (Are you sure you want to reset progress for '${name}'? All levels will be relocked!)`)) {
      resetUser(userId);
      // Refresh selected user context if active
      const updated = allUsers.find(u => u.userId === userId);
      if (updated && selectedUser?.userId === userId) {
        setSelectedUser(updated);
      }
    }
  };

  const startLevelEdit = (u: User) => {
    setEditingUserId(u.userId);
    setTempLevel(u.currentLevel);
  };

  const saveLevelEdit = (userId: string) => {
    const lvl = Math.max(1, Math.min(120, tempLevel));
    adjustUserLevel(userId, lvl);
    setEditingUserId(null);
    
    // Refresh details drawer if active
    if (selectedUser?.userId === userId) {
      const updated = allUsers.find(u => u.userId === userId);
      if (updated) setSelectedUser(updated);
    }
  };

  const startXpEdit = (u: User) => {
    setEditingXpUserId(u.userId);
    setTempXp(u.totalXP);
  };

  const saveXpEdit = (userId: string) => {
    const xp = Math.max(0, tempXp);
    adjustUserXP(userId, xp);
    setEditingXpUserId(null);
    
    // Refresh details drawer if active
    if (selectedUser?.userId === userId) {
      const updated = allUsers.find(u => u.userId === userId);
      if (updated) setSelectedUser(updated);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in select-none">
      
      {/* Header section */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span>Qaybta Maamulka (Admin Dashboard)</span>
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            U kuurgal xogta isticmaalayaasha, maamul horumarkooda iyo casharrada u furan.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Wada-isticmaalayaasha</div>
            <div className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100 font-mono mt-0.5">{totalUsers}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dhibcaha Wadajirka (Total XP)</div>
            <div className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100 font-mono mt-0.5">{totalXP} XP</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Xawaaraha Sare (Max WPM)</div>
            <div className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100 font-mono mt-0.5">{highestAppWPM} WPM</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Celceliska Heerarka</div>
            <div className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100 font-mono mt-0.5">Heerka {avgLevel}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6 mt-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${
            activeTab === 'users'
              ? 'text-indigo-500 font-bold border-b-2 border-indigo-500'
              : 'text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Maamulka Isticmaalayaasha (User List)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {allUsers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 font-semibold text-sm transition-all relative flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'text-indigo-500 font-bold border-b-2 border-indigo-500'
              : 'text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Falanqaynta Xogta (Data Analytics)</span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Users list block */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input 
                type="text" 
                placeholder="Raadi isticmaalayaasha magac ama iimayl ahaan... (Search users by name or email...)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            {/* User Table card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/60 text-[10px] font-bold uppercase text-zinc-400 tracking-wider border-b border-zinc-200 dark:border-zinc-800/80">
                      <th className="px-5 py-3.5">Isticmaalaha (User)</th>
                      <th className="px-5 py-3.5">Dhibcaha / WPM</th>
                      <th className="px-5 py-3.5">Heerka Furka (Unlocked Level)</th>
                      <th className="px-5 py-3.5 text-center">Maamul (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                          Ma jiraan isticmaalayaal buuxiyay shuruudahan. (No users match the search criteria.)
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelf = currentUser?.userId === u.userId;
                        const isDefaultAdmin = u.userId === 'user_admin';
                        const isDetailsActive = selectedUser?.userId === u.userId;

                        return (
                          <tr 
                            key={u.userId}
                            className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors ${
                              isDetailsActive ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                            }`}
                          >
                            {/* Name & Email */}
                            <td 
                              className="px-5 py-4 cursor-pointer"
                              onClick={() => setSelectedUser(u)}
                            >
                              <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                {u.name}
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                                    You
                                  </span>
                                )}
                                {isDefaultAdmin && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold uppercase">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{u.email}</div>
                              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
                                <span>Ugu dambaysay: {formatDateTime(u.lastActiveAt)}</span>
                              </div>
                            </td>

                            {/* XP / WPM */}
                            <td className="px-5 py-4">
                              {editingXpUserId === u.userId ? (
                                <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1.5">
                                    <input 
                                      type="number" 
                                      min={0}
                                      value={tempXp}
                                      onChange={(e) => setTempXp(parseInt(e.target.value) || 0)}
                                      className="w-24 px-1.5 py-1 text-center font-mono text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950/60"
                                    />
                                    <button 
                                      onClick={() => saveXpEdit(u.userId)}
                                      className="p-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                      title="Save XP"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingXpUserId(null)}
                                      className="p-1 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-300 transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">Sare: {u.highestWPM} WPM</div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => setSelectedUser(u)}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                                      {u.totalXP} XP
                                    </span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startXpEdit(u);
                                      }}
                                      className="text-indigo-500 hover:text-indigo-600 text-[10px] font-semibold underline"
                                    >
                                      Wax ka bedel (Edit)
                                    </button>
                                  </div>
                                  <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">Sare: {u.highestWPM} WPM</div>
                                </div>
                              )}
                            </td>

                            {/* Unlocked Level Adjuster */}
                            <td className="px-5 py-4">
                              {editingUserId === u.userId ? (
                                <div className="flex items-center gap-1.5">
                                  <input 
                                    type="number" 
                                    min={1} 
                                    max={120}
                                    value={tempLevel}
                                    onChange={(e) => setTempLevel(parseInt(e.target.value) || 1)}
                                    className="w-16 px-1.5 py-1 text-center font-mono text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950/60"
                                  />
                                  <button 
                                    onClick={() => saveLevelEdit(u.userId)}
                                    className="p-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                    title="Save Adjustments"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => setEditingUserId(null)}
                                    className="p-1 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-300 transition-colors"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                                    Heerka {u.currentLevel}
                                  </span>
                                  <button 
                                    onClick={() => startLevelEdit(u)}
                                    className="text-indigo-500 hover:text-indigo-600 text-[10px] font-semibold underline"
                                  >
                                    Wax ka bedel (Edit)
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Control actions */}
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-2.5">
                                <button
                                  onClick={() => setSelectedUser(u)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1"
                                  title="Show level history details"
                                >
                                  <span>Taariikhda</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleReset(u.userId, u.name)}
                                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-500/25 transition-colors"
                                  title="Reset user progression"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(u.userId, u.name)}
                                  disabled={isDefaultAdmin || isSelf}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    isDefaultAdmin || isSelf
                                      ? 'border-zinc-100 dark:border-zinc-900/50 text-zinc-300 dark:text-zinc-800 cursor-not-allowed'
                                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-rose-500 hover:border-rose-500/25'
                                  }`}
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* User Details Drawer panel (Right side) */}
          <div className="lg:col-span-1">
            {selectedUser ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-5 shadow-sm relative animate-slide-in">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <X className="w-5 h-5" />
                </button>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                    Faahfaahinta Isticmaalaha
                  </span>
                  <h3 className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                    {selectedUser.name}
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 break-all">
                    {selectedUser.email}
                  </p>
                </div>

                {/* Statistics Summary */}
                <div className="grid grid-cols-2 gap-3 border-t border-b border-zinc-100 dark:border-zinc-800/60 py-4 font-mono text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400">Dhibcaha (XP)</span>
                    <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">{selectedUser.totalXP}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400">Xawaaraha Sare</span>
                    <span className="text-base font-extrabold text-emerald-500">{selectedUser.highestWPM} WPM</span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-2 col-span-2">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400">Heerarka la Qabtay</span>
                    <span className="text-sm font-extrabold text-zinc-700 dark:text-zinc-300">
                      {selectedUser.levelHistory.length} / 120 heer oo la dhamaystiray
                    </span>
                  </div>
                </div>

                {/* Joined and Last Active Metadata */}
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 text-[11px] font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-[10px] uppercase font-sans font-bold">Kusoo Biiray</span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-bold">{formatDateTime(selectedUser.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800/40 pt-2">
                    <span className="text-zinc-400 text-[10px] uppercase font-sans font-bold">Ugu Dambaysay</span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-bold">{formatDateTime(selectedUser.lastActiveAt)}</span>
                  </div>
                </div>

                {/* Detailed Performance / Activity Summary */}
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Aktivitiga & Celceliska (Activity Analytics)</h4>
                  <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
                    <div className="p-2.5 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-950/30">
                      <div className="text-[9px] text-zinc-400 uppercase font-sans font-bold">Avg Speed</div>
                      <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {getAverageStats(selectedUser.levelHistory).avgWpm} WPM
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-950/30">
                      <div className="text-[9px] text-zinc-400 uppercase font-sans font-bold">Avg Accuracy</div>
                      <div className="text-base font-extrabold text-emerald-500 mt-0.5">
                        {getAverageStats(selectedUser.levelHistory).avgAcc}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Log History */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Log-ga Casharrada la Dhammaystay</h4>
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                    {selectedUser.levelHistory.length === 0 ? (
                      <div className="text-xs text-center py-6 text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-950/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/80">
                        Wali ma jiro cashar uu dhammaystay.
                      </div>
                    ) : (
                      [...selectedUser.levelHistory]
                        .sort((a, b) => b.levelId - a.levelId)
                        .map((h) => (
                          <div 
                            key={h.levelId}
                            className="p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/30 font-mono text-xs flex justify-between items-center"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">Casharka {h.levelId}</span>
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                {new Date(h.completedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-right flex flex-col gap-0.5">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{h.wpm} WPM</span>
                              <span className="text-[10px] text-amber-500">Acc: {h.accuracy}%</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/80 p-8 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center justify-center min-h-[300px]">
                <Award className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2.5" />
                <p className="text-sm font-semibold">Xulo Isticmaale si aad u aragto taariikhdiisa dhammaystiran.</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1 max-w-[200px] mx-auto">
                  Select a user to view their level history logs.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
          
          {/* Left / Main analytics column (spans 2) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Aggregate Overview Card */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Celceliska WPM</span>
                <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{overallAvg.avgWpm} WPM</span>
                <span className="text-[10px] text-zinc-400">Dhamaan isticmaalayaasha</span>
              </div>
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Celceliska Saxnaanta</span>
                <span className="text-xl font-extrabold text-emerald-500 font-mono mt-0.5">{overallAvg.avgAcc}%</span>
                <span className="text-[10px] text-zinc-400">Dhamaan casharrada</span>
              </div>
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Wadarta Casharrada</span>
                <span className="text-xl font-extrabold text-zinc-700 dark:text-zinc-300 font-mono mt-0.5">{overallAvg.totalCompletions}</span>
                <span className="text-[10px] text-zinc-400">la dhammaystiray</span>
              </div>
            </div>

            {/* Level Distribution Column Chart */}
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-5 shadow-sm">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Heerarka Wada-isticmaalayaasha (User Progression Map)</h3>
                <p className="text-xs text-zinc-400 mt-1">Sida isticmaalayaashu ugu kala qaybsan yihiin heerarka casharrada ee kala duwan.</p>
              </div>

              {/* Columns container */}
              <div className="flex h-52 items-end justify-around border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5 pt-4">
                {lvlDistribution.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 w-16 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-850 text-[10px] font-bold py-1 px-2 rounded-md shadow font-mono text-center z-10 whitespace-nowrap">
                      {item.count} Isticmaale
                    </div>

                    {/* Column bar */}
                    <div 
                      style={{ height: `${Math.max(item.percent, 5)}%` }}
                      className={`w-10 rounded-t-lg transition-all duration-500 cursor-pointer ${
                        idx === 0 ? 'bg-indigo-500 hover:bg-indigo-600' :
                        idx === 1 ? 'bg-sky-500 hover:bg-sky-600' :
                        idx === 2 ? 'bg-emerald-500 hover:bg-emerald-600' :
                        'bg-amber-500 hover:bg-amber-600'
                      }`}
                    />
                    
                    {/* Value indicator */}
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{item.count}</span>
                  </div>
                ))}
              </div>

              {/* Labels list */}
              <div className="flex justify-around text-[10px] font-semibold text-zinc-400 font-sans tracking-wide">
                {lvlDistribution.map((item, idx) => (
                  <span key={idx} className="w-16 text-center">{item.label}</span>
                ))}
              </div>
            </div>

            {/* WPM Distribution Progress Bars */}
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-4 shadow-sm">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Qaybinta Xawaaraha (Speed Profile)</h3>
                <p className="text-xs text-zinc-400 mt-1">Boqolleyda isticmaalayaasha ee ku kala jira xawaareyaasha kala duwan.</p>
              </div>

              <div className="flex flex-col gap-3.5 mt-2">
                {wpmDistribution.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.label}</span>
                      <span className="font-bold text-zinc-500 dark:text-zinc-400">{item.count} user ({item.percent}%)</span>
                    </div>
                    {/* Progress track */}
                    <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-950/60 overflow-hidden">
                      <div 
                        style={{ width: `${item.percent}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? 'bg-rose-500' :
                          idx === 1 ? 'bg-amber-500' :
                          idx === 2 ? 'bg-sky-500' :
                          'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right analytics column */}
          <div className="lg:col-span-1 flex flex-col gap-6">

            {/* Difficulty Tiers Card */}
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Qaybaha Heerar-adag (Difficulty Tiers)</span>
              </h3>
              
              <div className="flex flex-col gap-2.5 font-mono text-xs">
                <div className="flex justify-between items-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/30">
                  <span className="font-semibold text-zinc-650 dark:text-zinc-400">Beginner (Level 1-30)</span>
                  <span className="font-bold text-indigo-500">{diffDistribution.beginner.count} ({diffDistribution.beginner.percent}%)</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/30">
                  <span className="font-semibold text-zinc-655 dark:text-zinc-400">Intermediate (31-60)</span>
                  <span className="font-bold text-sky-500">{diffDistribution.intermediate.count} ({diffDistribution.intermediate.percent}%)</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/30">
                  <span className="font-semibold text-zinc-655 dark:text-zinc-400">Advanced (61-90)</span>
                  <span className="font-bold text-emerald-500">{diffDistribution.advanced.count} ({diffDistribution.advanced.percent}%)</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/30">
                  <span className="font-semibold text-zinc-655 dark:text-zinc-400">Expert (91-120)</span>
                  <span className="font-bold text-amber-500">{diffDistribution.expert.count} ({diffDistribution.expert.percent}%)</span>
                </div>
              </div>
            </div>

            {/* Leaderboards Card */}
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-5 shadow-sm">
              
              {/* Leaderboard 1: Speed WPM */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Isticmaalayaasha Ugu Dheereeya</span>
                </h3>
                <div className="flex flex-col gap-2 font-mono text-xs">
                  {leaderboardWpm.map((user, idx) => (
                    <div key={user.userId} className="flex justify-between items-center p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/30">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          idx === 0 ? 'bg-amber-500 text-white' :
                          idx === 1 ? 'bg-zinc-300 text-zinc-800 dark:text-zinc-200' :
                          'bg-amber-600/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{user.name}</span>
                      </div>
                      <span className="font-bold text-emerald-500">{user.highestWPM} WPM</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard 2: XP */}
              <div className="flex flex-col gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>Isticmaalayaasha Ugu Dhibco Badan</span>
                </h3>
                <div className="flex flex-col gap-2 font-mono text-xs">
                  {leaderboardXp.map((user, idx) => (
                    <div key={user.userId} className="flex justify-between items-center p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/30">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          idx === 0 ? 'bg-amber-500 text-white' :
                          idx === 1 ? 'bg-zinc-300 text-zinc-800 dark:text-zinc-200' :
                          'bg-amber-600/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{user.name}</span>
                      </div>
                      <span className="font-bold text-indigo-500">{user.totalXP} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hardest levels */}
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>Casharrada Ugu Adag (Hardest Lessons)</span>
              </h3>
              
              <div className="flex flex-col gap-2.5 font-mono text-xs">
                {hardestLevels.length === 0 ? (
                  <div className="text-center py-4 text-zinc-400 font-sans">
                    Ma jiraan casharro la dhammeeyey weli.
                  </div>
                ) : (
                  hardestLevels.map(item => (
                    <div key={item.levelId} className="flex flex-col p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/30 gap-1">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-zinc-800 dark:text-zinc-200">Casharka {item.levelId}</span>
                        <span className="text-rose-500">Acc: {item.avgAcc}%</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>Xawaaraha: {item.avgWpm} WPM</span>
                        <span>Dhammeeyey: {item.completions} user{item.completions !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
