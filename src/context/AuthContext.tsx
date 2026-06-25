import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LevelHistory } from '../types';
import sounds from '../utils/soundEffects';
import { levels } from '../data/levels';
import { isFirebaseConfigured, db, auth, googleProvider } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  loading: boolean;
  theme: 'light' | 'dark';
  isMuted: boolean;
  useFirebase: boolean;
  registerUser: (name: string, email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginUser: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;
  updateUserProgress: (levelId: number, wpm: number, accuracy: number, stars: number) => void;
  addGameXP: (xpAmount: number) => Promise<void>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithGoogleRedirect: () => Promise<void>;
  toggleTheme: () => void;
  toggleMute: () => void;
  deleteUser: (userId: string) => void;
  resetUser: (userId: string) => void;
  adjustUserLevel: (userId: string, level: number) => void;
  adjustUserXP: (userId: string, xp: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const useFirebase = isFirebaseConfigured && isOnline;

  // Load initial configurations and active session
  useEffect(() => {
    const initializeData = async () => {
      try {
        let usersList: User[] = [];

        if (useFirebase && db) {
          try {
            const usersCol = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCol);
            usersList = usersSnapshot.docs.map(doc => doc.data() as User);

            // Seed default admin user if not present
            const adminExists = usersList.some(u => u.email.toLowerCase() === 'admin@typemaster.com');
            if (!adminExists) {
              const defaultAdmin: User = {
                userId: 'user_admin',
                name: 'Admin User',
                email: 'admin@typemaster.com',
                currentLevel: 1,
                totalXP: 0,
                highestWPM: 0,
                levelHistory: [],
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', defaultAdmin.userId), defaultAdmin);
              usersList = [defaultAdmin, ...usersList];
            }

            // Handle redirect result if user just returned from Google redirect sign-in
            if (auth) {
              try {
                const redirectResult = await getRedirectResult(auth);
                if (redirectResult && redirectResult.user) {
                  const googleUser = redirectResult.user;
                  const lowerEmail = googleUser.email?.toLowerCase().trim();

                  let foundUser: User | null = null;
                  const userDocRef = doc(db, 'users', googleUser.uid);
                  const userDocSnap = await getDoc(userDocRef);
                  if (userDocSnap.exists()) {
                    foundUser = userDocSnap.data() as User;
                  }

                  if (!foundUser && lowerEmail) {
                    const existingUserByEmail = usersList.find(u => u.email.toLowerCase() === lowerEmail);
                    if (existingUserByEmail) {
                      foundUser = {
                        ...existingUserByEmail,
                        userId: googleUser.uid
                      };
                    }
                  }

                  if (!foundUser && lowerEmail) {
                    foundUser = {
                      userId: googleUser.uid,
                      name: googleUser.displayName || 'Google User',
                      email: lowerEmail,
                      currentLevel: 1,
                      totalXP: 0,
                      highestWPM: 0,
                      levelHistory: [],
                      createdAt: new Date().toISOString(),
                      lastActiveAt: new Date().toISOString()
                    };
                  } else if (foundUser) {
                    foundUser = {
                      ...foundUser,
                      lastActiveAt: new Date().toISOString()
                    };
                  }

                  if (foundUser) {
                    await setDoc(doc(db, 'users', foundUser.userId), foundUser);
                    setUser(foundUser);
                    localStorage.setItem('typemaster_current_user_id', foundUser.userId);

                    const updatedUsers = usersList.some(u => u.userId === foundUser!.userId)
                      ? usersList.map(u => u.userId === foundUser!.userId ? foundUser! : u)
                      : [...usersList, foundUser];
                    usersList = updatedUsers;
                  }
                }
              } catch (redirectErr) {
                console.error("Redirect sign-in error check failed: ", redirectErr);
              }
            }
          } catch (fireError) {
            console.error("Firebase load failed, falling back to localStorage: ", fireError);
            const storedUsers = localStorage.getItem('typemaster_users');
            usersList = storedUsers ? JSON.parse(storedUsers) : [];
          }
        } else {
          const storedUsers = localStorage.getItem('typemaster_users');
          usersList = storedUsers ? JSON.parse(storedUsers) : [];
          
          // Seed default admin user if not present
          const adminExists = usersList.some(u => u.email.toLowerCase() === 'admin@typemaster.com');
          if (!adminExists) {
            const defaultAdmin: User = {
              userId: 'user_admin',
              name: 'Admin User',
              email: 'admin@typemaster.com',
              currentLevel: 1,
              totalXP: 0,
              highestWPM: 0,
              levelHistory: [],
              createdAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString()
            };
            usersList = [defaultAdmin, ...usersList];
            localStorage.setItem('typemaster_users', JSON.stringify(usersList));
          }
        }

        setAllUsers(usersList);

        const activeUserId = localStorage.getItem('typemaster_current_user_id');
        if (activeUserId) {
          const foundUser = usersList.find(u => u.userId === activeUserId);
          if (foundUser) {
            const updatedUser = {
              ...foundUser,
              lastActiveAt: new Date().toISOString()
            };
            setUser(updatedUser);
            const updatedUsersList = usersList.map(u => u.userId === activeUserId ? updatedUser : u);
            setAllUsers(updatedUsersList);
            if (useFirebase && db) {
              try {
                await setDoc(doc(db, 'users', activeUserId), updatedUser);
              } catch (e) {
                console.error("Failed to update active user on initialize", e);
              }
            } else {
              localStorage.setItem('typemaster_users', JSON.stringify(updatedUsersList));
            }
          }
        }

        const storedTheme = localStorage.getItem('typemaster_theme') as 'light' | 'dark' | null;
        if (storedTheme) {
          setTheme(storedTheme);
          applyTheme(storedTheme);
        } else {
          applyTheme('dark');
        }

        const storedMuted = localStorage.getItem('typemaster_sound_muted');
        if (storedMuted === 'true') {
          setIsMuted(true);
          sounds.setMuted(true);
        }
      } catch (e) {
        console.error("Error initializing auth: ", e);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const applyTheme = (t: 'light' | 'dark') => {
    const root = window.document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#0b0f19'; // Rich dark background color
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc'; // Clean soft light background
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('typemaster_theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    sounds.setMuted(newMuted);
    localStorage.setItem('typemaster_sound_muted', String(newMuted));
  };

  const registerUser = async (name: string, email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim() || !email.trim() || !password || !password.trim()) {
      return { success: false, error: 'Fadlan buuxi magacaaga, iimaylkaaga iyo kelmada sirta ah.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Fadlan geli iimayl sax ah.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Kelmada sirta ah waa inaysan ka yaraanin 6 xaraf.' };
    }

    const lowerEmail = email.toLowerCase().trim();

    if (!useFirebase) {
      const emailExists = allUsers.some(u => u.email.toLowerCase() === lowerEmail);
      if (emailExists) {
        return { success: false, error: 'Iimaylkan mar hore ayaa la isticmaalay.' };
      }
    }

    let uid = 'user_' + Math.random().toString(36).substr(2, 9);
    
    try {
      if (useFirebase && auth && db) {
        const result = await createUserWithEmailAndPassword(auth, lowerEmail, password);
        uid = result.user.uid;
      }

      const newUser: User = {
        userId: uid,
        name: name.trim(),
        email: lowerEmail,
        currentLevel: 1,
        totalXP: 0,
        highestWPM: 0,
        levelHistory: [],
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };

      if (!isFirebaseConfigured) {
        newUser.password = password;
      }

      if (useFirebase && db) {
        await setDoc(doc(db, 'users', newUser.userId), newUser);
      }

      const updatedUsers = [...allUsers, newUser];
      setAllUsers(updatedUsers);
      
      if (!useFirebase) {
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
      }

      setUser(newUser);
      localStorage.setItem('typemaster_current_user_id', newUser.userId);

      return { success: true };
    } catch (e: any) {
      console.error("Error registering user: ", e);
      let errorMsg = 'Diiwaangelintu way fashilantay.';
      if (e.code === 'auth/email-already-in-use') {
        errorMsg = 'Iimaylkan mar hore ayaa la isticmaalay.';
      } else if (e.code === 'auth/invalid-email') {
        errorMsg = 'Fadlan geli iimayl sax ah.';
      } else if (e.code === 'auth/weak-password') {
        errorMsg = 'Kelmada sirta ah waa inay noqotaa ugu yaraan 6 xaraf.';
      } else if (e.message) {
        errorMsg = e.message;
      }
      return { success: false, error: errorMsg };
    }
  };

  const loginUser = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!email.trim() || !password || !password.trim()) {
      return { success: false, error: 'Fadlan geli iimaylkaaga iyo kelmada sirta ah.' };
    }

    const lowerEmail = email.toLowerCase().trim();

    // Admin bypass check to allow login with default admin credentials
    if (lowerEmail === 'admin@typemaster.com' && password === 'admin123') {
      let foundUser = allUsers.find(u => u.email.toLowerCase() === 'admin@typemaster.com');
      if (!foundUser && db && useFirebase) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', 'user_admin'));
          if (userDocSnap.exists()) {
            foundUser = userDocSnap.data() as User;
          }
        } catch (err) {
          console.error("Failed to fetch admin bypass doc: ", err);
        }
      }
      if (!foundUser) {
        foundUser = {
          userId: 'user_admin',
          name: 'Admin User',
          email: 'admin@typemaster.com',
          currentLevel: 1,
          totalXP: 0,
          highestWPM: 0,
          levelHistory: [],
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
      } else {
        foundUser = {
          ...foundUser,
          lastActiveAt: new Date().toISOString()
        };
      }

      if (useFirebase && db) {
        try {
          await setDoc(doc(db, 'users', foundUser.userId), foundUser);
        } catch (err) {
          console.error("Failed to update admin bypass lastActiveAt", err);
        }
      } else {
        const updatedUsersList = allUsers.some(u => u.userId === foundUser!.userId)
          ? allUsers.map(u => u.userId === foundUser!.userId ? foundUser! : u)
          : [foundUser, ...allUsers];
        setAllUsers(updatedUsersList);
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsersList));
      }

      setUser(foundUser);
      localStorage.setItem('typemaster_current_user_id', foundUser.userId);
      return { success: true };
    }

    if (useFirebase && auth && db) {
      try {
        const result = await signInWithEmailAndPassword(auth, lowerEmail, password);
        const firebaseUser = result.user;
        let foundUser: User | null = null;

        // Try to fetch from Firestore using UID
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            foundUser = userDocSnap.data() as User;
          }
        } catch (dbError) {
          console.error("Firestore user fetch failed: ", dbError);
        }

        // Fallback/Migration: search memory users by email
        if (!foundUser) {
          const existingUserByEmail = allUsers.find(u => u.email.toLowerCase() === lowerEmail);
          if (existingUserByEmail) {
            foundUser = {
              ...existingUserByEmail,
              userId: firebaseUser.uid
            };
            
            // Delete old seeded record if it was under 'user_admin'
            if (existingUserByEmail.userId === 'user_admin') {
              try {
                await deleteDoc(doc(db, 'users', 'user_admin'));
              } catch (delErr) {
                console.error("Failed to delete user_admin doc: ", delErr);
              }
            }
          }
        }

        // Create document if somehow authenticated user has no document in database
        if (!foundUser) {
          foundUser = {
            userId: firebaseUser.uid,
            name: firebaseUser.displayName || email.split('@')[0],
            email: lowerEmail,
            currentLevel: 1,
            totalXP: 0,
            highestWPM: 0,
            levelHistory: [],
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
          };
        } else {
          foundUser = {
            ...foundUser,
            lastActiveAt: new Date().toISOString()
          };
        }

        // Save/update user profile in Firestore
        try {
          await setDoc(doc(db, 'users', foundUser.userId), foundUser);
        } catch (saveError) {
          console.error("Failed to save user in Firestore: ", saveError);
        }

        setUser(foundUser);
        localStorage.setItem('typemaster_current_user_id', foundUser.userId);

        const updatedUsers = allUsers.some(u => u.userId === foundUser!.userId)
          ? allUsers.map(u => u.userId === foundUser!.userId ? foundUser! : u)
          : [...allUsers, foundUser];
        
        // Remove old 'user_admin' from state if migrated
        const filteredUsers = updatedUsers.filter(u => u.userId !== 'user_admin' || u.email.toLowerCase() !== 'admin@typemaster.com');
        setAllUsers([...filteredUsers, foundUser]);

        return { success: true };
      } catch (error: any) {
        console.error("Firebase Sign-In failed: ", error);
        let errorMsg = 'Gaba-gabo khaldan.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          errorMsg = 'Iimaylka ama kelmada sirta ah waa khalad.';
        } else if (error.message) {
          errorMsg = error.message;
        }
        return { success: false, error: errorMsg };
      }
    } else {
      const foundUser = allUsers.find(u => u.email.toLowerCase() === lowerEmail);

      if (!foundUser) {
        return { success: false, error: 'Waan ka xunnahay, laguma helin iimaylkan. Fadlan is-diiwaangeli.' };
      }

      const correctPassword = foundUser.userId === 'user_admin' ? (foundUser.password || 'admin123') : foundUser.password;

      if (correctPassword && correctPassword !== password) {
        return { success: false, error: 'Kelmada sirta ah waa khalad.' };
      }

      const updatedUser = {
        ...foundUser,
        lastActiveAt: new Date().toISOString()
      };

      setUser(updatedUser);
      localStorage.setItem('typemaster_current_user_id', updatedUser.userId);

      const updatedUsers = allUsers.map(u => u.userId === updatedUser.userId ? updatedUser : u);
      setAllUsers(updatedUsers);
      localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));

      return { success: true };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured || !auth) {
      return { success: false, error: 'Firebase is not configured for Google Sign-In.' };
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      if (!googleUser.email) {
        return { success: false, error: 'Failed to retrieve email from Google account.' };
      }

      const lowerEmail = googleUser.email.toLowerCase().trim();
      let foundUser: User | null = null;

      // Check if user already exists in Firestore by UID
      try {
        const userDocRef = doc(db, 'users', googleUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          foundUser = userDocSnap.data() as User;
        }
      } catch (dbError) {
        console.error("Firestore user fetch failed: ", dbError);
      }

      // Fallback: check in current memory users list by email
      if (!foundUser) {
        const existingUserByEmail = allUsers.find(u => u.email.toLowerCase() === lowerEmail);
        if (existingUserByEmail) {
          foundUser = {
            ...existingUserByEmail,
            userId: googleUser.uid // align UID
          };
        }
      }

      // Create new user profile if not found
      if (!foundUser) {
        foundUser = {
          userId: googleUser.uid,
          name: googleUser.displayName || 'Google User',
          email: lowerEmail,
          currentLevel: 1,
          totalXP: 0,
          highestWPM: 0,
          levelHistory: [],
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
      } else {
        foundUser = {
          ...foundUser,
          lastActiveAt: new Date().toISOString()
        };
      }

      // Save/update user profile in Firestore
      try {
        await setDoc(doc(db, 'users', foundUser.userId), foundUser);
      } catch (saveError) {
        console.error("Failed to save Google user in Firestore: ", saveError);
      }

      // Update state and persistence
      setUser(foundUser);
      localStorage.setItem('typemaster_current_user_id', foundUser.userId);

      const updatedUsers = allUsers.some(u => u.userId === foundUser!.userId)
        ? allUsers.map(u => u.userId === foundUser!.userId ? foundUser! : u)
        : [...allUsers, foundUser];
      setAllUsers(updatedUsers);

      if (!useFirebase) {
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
      }

      return { success: true };
    } catch (error: any) {
      console.error("Google Sign-In failed: ", error);
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'POPUP_BLOCKED' };
      }
      return { success: false, error: 'Google Sign-In: ' + (error.message || 'Error occurred.') };
    }
  };

  const loginWithGoogleRedirect = async () => {
    if (useFirebase && auth) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err) {
        console.error("signInWithRedirect failed: ", err);
      }
    }
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('typemaster_current_user_id');
  };

  const updateUserProgress = async (levelId: number, wpm: number, accuracy: number, stars: number) => {
    if (!user) return;

    // 1. Calculate XP difference
    const newScoreXP = Math.round(stars * wpm * 10);
    const existingHistory = user.levelHistory.find(h => h.levelId === levelId);
    
    let xpGain = 0;
    if (existingHistory) {
      xpGain = 0;
    } else {
      xpGain = newScoreXP;
    }

    // 2. Build or update history record (save the best stats)
    const newHistoryEntry: LevelHistory = {
      levelId,
      wpm: existingHistory ? Math.max(existingHistory.wpm, wpm) : wpm,
      accuracy: existingHistory ? Math.max(existingHistory.accuracy, accuracy) : accuracy,
      stars: existingHistory ? Math.max(existingHistory.stars, stars) : stars,
      completedAt: new Date().toISOString()
    };

    const updatedHistory = existingHistory
      ? user.levelHistory.map(h => h.levelId === levelId ? newHistoryEntry : h)
      : [...user.levelHistory, newHistoryEntry];

    // 3. Determine if next level should be unlocked
    const passed = stars >= 1;
    let nextLevel = user.currentLevel;
    if (passed && levelId === user.currentLevel) {
      nextLevel = Math.min(levels.length, levelId + 1);
    }

    const updatedUser: User = {
      ...user,
      currentLevel: nextLevel,
      totalXP: user.totalXP + xpGain,
      highestWPM: Math.max(user.highestWPM, wpm),
      levelHistory: updatedHistory,
      lastActiveAt: new Date().toISOString()
    };

    try {
      if (useFirebase && db) {
        await setDoc(doc(db, 'users', user.userId), updatedUser);
      }

      setUser(updatedUser);
      
      const updatedUsers = allUsers.map(u => u.userId === user.userId ? updatedUser : u);
      setAllUsers(updatedUsers);
      
      if (!useFirebase) {
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
      }
    } catch (e) {
      console.error("Error updating user progress: ", e);
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === 'user_admin' || (user && user.userId === userId)) {
      return; // Can't delete admin or current logged-in user
    }

    try {
      if (useFirebase && db) {
        await deleteDoc(doc(db, 'users', userId));
      }

      const updatedUsers = allUsers.filter(u => u.userId !== userId);
      setAllUsers(updatedUsers);

      if (!useFirebase) {
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
      }
    } catch (e) {
      console.error("Error deleting user: ", e);
    }
  };

  const resetUser = async (userId: string) => {
    const updatedUsers = allUsers.map(u => {
      if (u.userId === userId) {
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

    const targetUser = updatedUsers.find(u => u.userId === userId);
    if (!targetUser) return;

    try {
      if (useFirebase && db) {
        await setDoc(doc(db, 'users', userId), targetUser);
      }

      setAllUsers(updatedUsers);
      
      if (!useFirebase) {
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
      }
      
      if (user && user.userId === userId) {
        setUser({
          ...user,
          currentLevel: 1,
          totalXP: 0,
          highestWPM: 0,
          levelHistory: []
        });
      }
    } catch (e) {
      console.error("Error resetting user: ", e);
    }
  };

  const adjustUserLevel = async (userId: string, level: number) => {
    const targetLvl = Math.max(1, Math.min(120, level));
    const updatedUsers = allUsers.map(u => {
      if (u.userId === userId) {
        return {
          ...u,
          currentLevel: targetLvl
        };
      }
      return u;
    });

    const targetUser = updatedUsers.find(u => u.userId === userId);
    if (!targetUser) return;

    try {
      if (useFirebase && db) {
        await setDoc(doc(db, 'users', userId), targetUser);
      }

      setAllUsers(updatedUsers);

      if (!useFirebase) {
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
      }

      if (user && user.userId === userId) {
        setUser({
          ...user,
          currentLevel: targetLvl
        });
      }
    } catch (e) {
      console.error("Error adjusting user level: ", e);
    }
  };

  const adjustUserXP = async (userId: string, xp: number) => {
    const targetXP = Math.max(0, xp);
    const updatedUsers = allUsers.map(u => {
      if (u.userId === userId) {
        return {
          ...u,
          totalXP: targetXP
        };
      }
      return u;
    });

    const targetUser = updatedUsers.find(u => u.userId === userId);
    if (!targetUser) return;

    try {
      if (useFirebase && db) {
        await setDoc(doc(db, 'users', userId), targetUser);
      }

      setAllUsers(updatedUsers);

      if (!useFirebase) {
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
      }

      if (user && user.userId === userId) {
        setUser({
          ...user,
          totalXP: targetXP
        });
      }
    } catch (e) {
      console.error("Error adjusting user XP: ", e);
    }
  };

  const addGameXP = async (_xpGain: number) => {
    if (!user) return;

    // Games no longer award XP
    const actualXpGain = 0;

    const updatedUser: User = {
      ...user,
      totalXP: user.totalXP + actualXpGain,
      lastActiveAt: new Date().toISOString()
    };

    try {
      if (useFirebase && db) {
        await setDoc(doc(db, 'users', user.userId), updatedUser);
      }

      setUser(updatedUser);
      
      const updatedUsers = allUsers.map(u => u.userId === user.userId ? updatedUser : u);
      setAllUsers(updatedUsers);
      
      if (!useFirebase) {
        localStorage.setItem('typemaster_users', JSON.stringify(updatedUsers));
      }
    } catch (e) {
      console.error("Error adding game XP: ", e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      allUsers,
      loading,
      theme,
      isMuted,
      useFirebase,
      registerUser,
      loginUser,
      logoutUser,
      updateUserProgress,
      addGameXP,
      loginWithGoogle,
      loginWithGoogleRedirect,
      toggleTheme,
      toggleMute,
      deleteUser,
      resetUser,
      adjustUserLevel,
      adjustUserXP
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
