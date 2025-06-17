import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { User, GameRoom, Question, GameState, PlayerAnswer, GameSettings } from '../types/game';
import { mockQuestions } from '../data/questions';

interface GameStore {
  // User state
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // Game state
  currentRoom: GameRoom | null;
  availableRooms: GameRoom[];
  currentQuestion: Question | null;
  playerAnswers: PlayerAnswer[];
  gameSettings: GameSettings;
  
  // Online users
  onlineUsers: User[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  showResults: boolean;
  
  // Actions
  setUser: (user: User) => void;
  logout: () => void;
  createRoom: (roomName: string, maxPlayers: number, isPrivate: boolean) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  submitAnswer: (answerIndex: number, timeSpent: number) => void;
  nextQuestion: () => void;
  endGame: () => void;
  setGameSettings: (settings: Partial<GameSettings>) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  updateOnlineUsers: () => void;
  syncRooms: () => void;
}

const defaultGameSettings: GameSettings = {
  questionsPerGame: 10,
  timePerQuestion: 30,
  difficulty: 'mixed',
  categories: ['recycling', 'biodiversity', 'energy', 'climate-change', 'sustainable-consumption', 'pollution', 'conservation']
};

// Mock online users for demonstration
const generateMockOnlineUsers = (): User[] => {
  const mockUsers = [
    { id: '158435', name: 'Ana Júlia Furtado', email: '12345@student.edu', level: 10, totalScore: 1250, gamesPlayed: 8, correctAnswers: 45 },
    { id: '148723', name: 'Natã da Silva Almeida', email: '12345@student.edu', level: 10, totalScore: 1250, gamesPlayed: 8, correctAnswers: 45 },
    { id: '176563', name: 'Livia de Moura Carvalho', email: '12345@student.edu', level: 7, totalScore: 1100, gamesPlayed: 5, correctAnswers: 22 },
    { id: '1639111', name: 'Lucas Alves Marques', email: '12345@student.edu', level: 4, totalScore: 900, gamesPlayed: 5, correctAnswers: 30 }];
  
  // Randomly select 3-6 users to be "online"
  const shuffled = mockUsers.sort(() => 0.5 - Math.random());
  const onlineCount = Math.floor(Math.random() * 4) + 3; // 3-6 users
  return shuffled.slice(0, onlineCount);
};

// Cross-tab synchronization utilities
const STORAGE_KEYS = {
  ROOMS: 'ecotrivia-rooms',
  ONLINE_USERS: 'ecotrivia-online-users',
  ROOM_UPDATE: 'ecotrivia-room-update'
};

const saveRoomsToStorage = (rooms: GameRoom[]) => {
  localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  // Trigger storage event for other tabs
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEYS.ROOM_UPDATE,
    newValue: Date.now().toString()
  }));
};

const loadRoomsFromStorage = (): GameRoom[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveOnlineUsersToStorage = (users: User[]) => {
  localStorage.setItem(STORAGE_KEYS.ONLINE_USERS, JSON.stringify(users));
};

const loadOnlineUsersFromStorage = (): User[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ONLINE_USERS);
    return stored ? JSON.parse(stored) : generateMockOnlineUsers();
  } catch {
    return generateMockOnlineUsers();
  }
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        currentUser: null,
        isAuthenticated: false,
        currentRoom: null,
        availableRooms: loadRoomsFromStorage(),
        currentQuestion: null,
        playerAnswers: [],
        gameSettings: defaultGameSettings,
        onlineUsers: loadOnlineUsersFromStorage(),
        isLoading: false,
        error: null,
        showResults: false,

        // Actions
        setUser: (user) => {
          set({ currentUser: user, isAuthenticated: true });
          // Add current user to online users if not already there
          const { onlineUsers } = get();
          if (!onlineUsers.find(u => u.id === user.id)) {
            const updatedUsers = [...onlineUsers, user];
            set({ onlineUsers: updatedUsers });
            saveOnlineUsersToStorage(updatedUsers);
          }
        },
        
        logout: () => {
          const { currentUser, onlineUsers } = get();
          const updatedUsers = currentUser ? onlineUsers.filter(u => u.id !== currentUser.id) : onlineUsers;
          
          set({ 
            currentUser: null, 
            isAuthenticated: false, 
            currentRoom: null,
            currentQuestion: null,
            playerAnswers: [],
            showResults: false,
            onlineUsers: updatedUsers
          });
          
          saveOnlineUsersToStorage(updatedUsers);
        },

        createRoom: (roomName, maxPlayers, isPrivate) => {
          const { currentUser, availableRooms } = get();
          if (!currentUser) return;

          const newRoom: GameRoom = {
            id: Math.random().toString(36).substr(2, 9),
            name: roomName,
            players: [currentUser],
            maxPlayers,
            isPrivate,
            gameState: 'waiting',
            questionIndex: 0,
            timeRemaining: 0,
            scores: { [currentUser.id]: 0 },
            lastUpdate: Date.now()
          };

          const updatedRooms = [...availableRooms, newRoom];
          
          set({
            currentRoom: newRoom,
            availableRooms: updatedRooms
          });
          
          // Save to localStorage and notify other tabs
          saveRoomsToStorage(updatedRooms);
        },

        joinRoom: (roomId) => {
          const { currentUser, availableRooms } = get();
          if (!currentUser) return;

          const room = availableRooms.find(r => r.id === roomId);
          if (!room || room.players.length >= room.maxPlayers) return;

          const updatedRoom = {
            ...room,
            players: [...room.players, currentUser],
            scores: { ...room.scores, [currentUser.id]: 0 }
          };

          const updatedRooms = availableRooms.map(r => 
            r.id === roomId ? updatedRoom : r
          );

          set({
            currentRoom: updatedRoom,
            availableRooms: updatedRooms
          });
          
          // Save to localStorage and notify other tabs
          saveRoomsToStorage(updatedRooms);
        },

        leaveRoom: () => {
          const { currentRoom, currentUser, availableRooms } = get();
          if (!currentRoom || !currentUser) return;

          // Remove user from room
          const updatedRoom = {
            ...currentRoom,
            players: currentRoom.players.filter(p => p.id !== currentUser.id)
          };

          let updatedRooms;
          if (updatedRoom.players.length === 0) {
            // Remove empty room
            updatedRooms = availableRooms.filter(r => r.id !== currentRoom.id);
          } else {
            // Update room with remaining players
            updatedRooms = availableRooms.map(r => 
              r.id === currentRoom.id ? updatedRoom : r
            );
          }

          set({ 
            currentRoom: null, 
            currentQuestion: null, 
            playerAnswers: [],
            showResults: false,
            availableRooms: updatedRooms
          });
          
          // Save to localStorage and notify other tabs
          saveRoomsToStorage(updatedRooms);
        },

        startGame: () => {
          const { currentRoom, gameSettings, availableRooms } = get();
          if (!currentRoom) return;

          // Filter questions based on settings
          let filteredQuestions = mockQuestions;
          
          if (gameSettings.difficulty !== 'mixed') {
            filteredQuestions = filteredQuestions.filter(q => q.difficulty === gameSettings.difficulty);
          }
          
          filteredQuestions = filteredQuestions.filter(q => 
            gameSettings.categories.includes(q.category)
          );

          // Shuffle and select questions
          const shuffled = filteredQuestions.sort(() => 0.5 - Math.random());
          const selectedQuestions = shuffled.slice(0, gameSettings.questionsPerGame);

          const updatedRoom = {
            ...currentRoom,
            gameState: 'playing' as GameState,
            questionIndex: 0,
            timeRemaining: gameSettings.timePerQuestion
          };

          const updatedRooms = availableRooms.map(r => 
            r.id === currentRoom.id ? updatedRoom : r
          );

          set({
            currentRoom: updatedRoom,
            currentQuestion: selectedQuestions[0] || null,
            playerAnswers: [],
            availableRooms: updatedRooms
          });
          
          // Save to localStorage and notify other tabs
          saveRoomsToStorage(updatedRooms);
        },

        submitAnswer: (answerIndex, timeSpent) => {
          const { currentUser, currentQuestion, currentRoom, availableRooms } = get();
          if (!currentUser || !currentQuestion || !currentRoom) return;

          const isCorrect = answerIndex === currentQuestion.correctAnswer;
          const timeBonus = Math.max(0, (30 - timeSpent) * 2);
          const points = isCorrect ? currentQuestion.points + timeBonus : 0;

          const answer: PlayerAnswer = {
            playerId: currentUser.id,
            answerIndex,
            timeSpent,
            isCorrect,
            points
          };

          const updatedScores = {
            ...currentRoom.scores,
            [currentUser.id]: (currentRoom.scores[currentUser.id] || 0) + points
          };

          const updatedRoom = {
            ...currentRoom,
            scores: updatedScores
          };

          const updatedRooms = availableRooms.map(r => 
            r.id === currentRoom.id ? updatedRoom : r
          );

          set({
            playerAnswers: [...get().playerAnswers, answer],
            currentRoom: updatedRoom,
            availableRooms: updatedRooms,
            showResults: true
          });
          
          // Save to localStorage and notify other tabs
          saveRoomsToStorage(updatedRooms);
        },

        nextQuestion: () => {
          const { currentRoom, gameSettings, availableRooms } = get();
          if (!currentRoom) return;

          const nextIndex = currentRoom.questionIndex + 1;
          
          if (nextIndex >= gameSettings.questionsPerGame) {
            get().endGame();
            return;
          }

          // Filter and get next question
          let filteredQuestions = mockQuestions;
          if (gameSettings.difficulty !== 'mixed') {
            filteredQuestions = filteredQuestions.filter(q => q.difficulty === gameSettings.difficulty);
          }
          filteredQuestions = filteredQuestions.filter(q => 
            gameSettings.categories.includes(q.category)
          );

          const shuffled = filteredQuestions.sort(() => 0.5 - Math.random());
          const nextQuestion = shuffled[nextIndex % shuffled.length];

          const updatedRoom = {
            ...currentRoom,
            questionIndex: nextIndex,
            timeRemaining: gameSettings.timePerQuestion
          };

          const updatedRooms = availableRooms.map(r => 
            r.id === currentRoom.id ? updatedRoom : r
          );

          set({
            currentRoom: updatedRoom,
            currentQuestion: nextQuestion,
            showResults: false,
            availableRooms: updatedRooms
          });
          
          // Save to localStorage and notify other tabs
          saveRoomsToStorage(updatedRooms);
        },

        endGame: () => {
          const { currentRoom, availableRooms } = get();
          if (!currentRoom) return;

          const updatedRoom = {
            ...currentRoom,
            gameState: 'finished' as GameState
          };

          const updatedRooms = availableRooms.map(r => 
            r.id === currentRoom.id ? updatedRoom : r
          );

          set({
            currentRoom: updatedRoom,
            currentQuestion: null,
            showResults: true,
            availableRooms: updatedRooms
          });
          
          // Save to localStorage and notify other tabs
          saveRoomsToStorage(updatedRooms);
        },

        setGameSettings: (settings) => set(state => ({
          gameSettings: { ...state.gameSettings, ...settings }
        })),

        setError: (error) => set({ error }),
        setLoading: (loading) => set({ isLoading: loading }),

        updateOnlineUsers: () => {
          // Simulate real-time updates by occasionally changing online users
          const { currentUser } = get();
          const newOnlineUsers = generateMockOnlineUsers();
          
          // Always include current user if authenticated
          if (currentUser && !newOnlineUsers.find(u => u.id === currentUser.id)) {
            newOnlineUsers.push(currentUser);
          }
          
          set({ onlineUsers: newOnlineUsers });
          saveOnlineUsersToStorage(newOnlineUsers);
        },

        syncRooms: () => {
          const storedRooms = loadRoomsFromStorage();
          set({ availableRooms: storedRooms });
        }
      }),
      {
        name: 'ecotrivia-game-store',
        partialize: (state) => ({
          currentUser: state.currentUser,
          isAuthenticated: state.isAuthenticated,
          gameSettings: state.gameSettings
        })
      }
    )
  )
);

// Set up cross-tab synchronization
if (typeof window !== 'undefined') {
  // Listen for storage events from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.ROOM_UPDATE) {
      // Sync rooms when another tab updates them
      useGameStore.getState().syncRooms();
    }
  });

  // Periodic sync to ensure consistency
  setInterval(() => {
    useGameStore.getState().syncRooms();
  }, 5000);

  // Cleanup empty rooms periodically
  setInterval(() => {
    const { availableRooms } = useGameStore.getState();
    const activeRooms = availableRooms.filter(room => 
      room.players.length > 0 && 
      (room.gameState === 'waiting' || room.gameState === 'playing')
    );
    
    if (activeRooms.length !== availableRooms.length) {
      saveRoomsToStorage(activeRooms);
      useGameStore.setState({ availableRooms: activeRooms });
    }
  }, 10000);
}
