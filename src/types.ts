export interface LevelHistory {
  levelId: number;
  wpm: number;
  accuracy: number;
  stars: number;
  completedAt: string;
}

export interface User {
  userId: string;
  name: string;
  email: string;
  password?: string;
  currentLevel: number; // 1-indexed, represents the furthest level unlocked
  totalXP: number;
  highestWPM: number;
  levelHistory: LevelHistory[];
  createdAt?: string;
  lastActiveAt?: string;
}

export interface Level {
  id: number;
  title: string;
  text: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  targetWPM: number;
  targetAccuracy: number;
  description: string;
}

export interface TypingStats {
  wpm: number;
  accuracy: number;
  errors: number;
  elapsedTime: number; // in seconds
  isCompleted: boolean;
}
