export interface User {
  id: string; // Now using RA as ID
  name: string;
  email: string; // Generated from RA
  avatar?: string;
  level: number;
  totalScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  ra?: string; // Optional RA field for display
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: QuestionCategory;
  explanation?: string;
  points: number;
}

export type QuestionCategory = 
  | 'recycling'
  | 'biodiversity'
  | 'energy'
  | 'climate-change'
  | 'sustainable-consumption'
  | 'pollution'
  | 'conservation';

export interface GameRoom {
  id: string;
  name: string;
  players: User[];
  maxPlayers: number;
  isPrivate: boolean;
  gameState: GameState;
  currentQuestion?: Question;
  questionIndex: number;
  timeRemaining: number;
  scores: Record<string, number>;
  lastUpdate: number; // NOVO
}

export type GameState = 'waiting' | 'playing' | 'question' | 'results' | 'finished';

export interface PlayerAnswer {
  playerId: string;
  answerIndex: number;
  timeSpent: number;
  isCorrect: boolean;
  points: number;
}

export interface GameSettings {
  questionsPerGame: number;
  timePerQuestion: number;
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  categories: QuestionCategory[];
}