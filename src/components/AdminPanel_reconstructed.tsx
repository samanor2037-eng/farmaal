import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { 
  Search, Trash2, RotateCcw, ShieldAlert, Award, 
  Check, X, Flame, Target, TrendingUp, Users, ChevronRight
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { allUsers, user: currentUser, deleteUser, resetUser, adjustUserLevel } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempLevel, setTempLevel] = useState<number>(1);

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

      {/* Main Two-column panel layout */}
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
                          </td>

                          {/* XP / WPM */}
                          <td 
                            className="px-5 py-4 cursor-pointer"
                            onClick={() => setSelectedUser(u)}
                          >
                            <div className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">{u.totalXP} XP</div>
                            <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">Sare: {u.highestWPM} WPM</div>
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

    </div>
  );
};

export default AdminPanel;
