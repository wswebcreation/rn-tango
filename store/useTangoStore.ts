import { PuzzleState, TangoStore } from '@/types/tango';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const createPuzzleState = (): PuzzleState => ({
  isSolved: false,
  totalTime: 0,
  startTime: null,
  isTimerRunning: false,
});

export const useTangoStore = create<TangoStore>()(
  persist(
    (set, get) => ({
      currentPuzzleId: 1,
      puzzlesState: {},
      solvedPuzzles: [],

      setCurrentPuzzle: (puzzleId: number) => {
        const { puzzlesState } = get();
        
        if (!puzzlesState[puzzleId]) {
          set({
            currentPuzzleId: puzzleId,
            puzzlesState: {
              ...puzzlesState,
              [puzzleId]: createPuzzleState(),
            },
          });
        } else {
          set({ currentPuzzleId: puzzleId });
        }
      },

      startTimer: (puzzleId: number) => {
        const { puzzlesState } = get();
        const currentState = puzzlesState[puzzleId] || createPuzzleState();
        
        if (!currentState.isSolved && !currentState.isTimerRunning) {
          set({
            puzzlesState: {
              ...puzzlesState,
              [puzzleId]: {
                ...currentState,
                startTime: Date.now(),
                isTimerRunning: true,
              },
            },
          });
        }
      },

      stopTimer: (puzzleId: number) => {
        const { puzzlesState } = get();
        const currentState = puzzlesState[puzzleId];
        
        if (currentState && currentState.isTimerRunning) {
          const elapsed = Date.now() - (currentState.startTime || 0);
          set({
            puzzlesState: {
              ...puzzlesState,
              [puzzleId]: {
                ...currentState,
                totalTime: currentState.totalTime + Math.floor(elapsed / 1000),
                startTime: null,
                isTimerRunning: false,
              },
            },
          });
        }
      },

      pauseTimer: (puzzleId: number) => {
        const { puzzlesState } = get();
        const currentState = puzzlesState[puzzleId];
        
        if (currentState && currentState.isTimerRunning) {
          const elapsed = Date.now() - (currentState.startTime || 0);
          const newTotalTime = currentState.totalTime + Math.floor(elapsed / 1000);
          
          set((state) => ({
            puzzlesState: {
              ...state.puzzlesState,
              [puzzleId]: {
                ...currentState,
                totalTime: newTotalTime,
                startTime: null,
                isTimerRunning: false,
              },
            },
          }));
        }
      },

      resumeTimer: (puzzleId: number) => {
        const { puzzlesState } = get();
        const currentState = puzzlesState[puzzleId];
        
        if (currentState && !currentState.isSolved && !currentState.isTimerRunning) {
          set((state) => ({
            puzzlesState: {
              ...state.puzzlesState,
              [puzzleId]: {
                ...currentState,
                startTime: Date.now(),
                isTimerRunning: true,
              },
            },
          }));
        }
      },

      markPuzzleSolved: (puzzleId: number) => {
        const { puzzlesState, solvedPuzzles } = get();
        const currentState = puzzlesState[puzzleId];
        
        if (currentState && !currentState.isSolved) {
          let finalTime = currentState.totalTime;
          if (currentState.isTimerRunning && currentState.startTime) {
            const elapsed = Date.now() - currentState.startTime;
            finalTime += Math.floor(elapsed / 1000);
          }

          set({
            puzzlesState: {
              ...puzzlesState,
              [puzzleId]: {
                ...currentState,
                isSolved: true,
                totalTime: finalTime,
                startTime: null,
                isTimerRunning: false,
              },
            },
            solvedPuzzles: [...solvedPuzzles, puzzleId],
          });
        }
      },

      resetPuzzleState: (puzzleId: number) => {
        const { puzzlesState } = get();
        set({
          puzzlesState: {
            ...puzzlesState,
            [puzzleId]: createPuzzleState(),
          },
        });
      },
    }),
    {
      name: 'tango-puzzle-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
); 