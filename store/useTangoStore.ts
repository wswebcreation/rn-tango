import { BoardState, CellCoordinate, CellValue, Move, PuzzleState, TangoStore } from '@/types/tango';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const createBoardState = (): BoardState => ({
  cells: {},
  moveHistory: [],
  isSolved: false,
});

const createPuzzleState = (): PuzzleState => ({
  isSolved: false,
  totalTime: 0,
  startTime: null,
  isTimerRunning: false,
  boardState: createBoardState(),
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
                boardState: {
                  ...currentState.boardState,
                  isSolved: true,
                },
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

      toggleCell: (puzzleId: number, row: number, col: number) => {
        const { puzzlesState } = get();
        let currentState = puzzlesState[puzzleId];
        
        if (!currentState) {
          currentState = createPuzzleState();
        }
        
        if (currentState.isSolved) return;

        const coordinate: CellCoordinate = `${row},${col}`;
        const currentValue = currentState.boardState?.cells?.[coordinate];
        
        let newValue: CellValue | undefined;
        if (currentValue === undefined) {
          newValue = "☀️";
        } else if (currentValue === "☀️") {
          newValue = "🌑";
        } else {
          newValue = undefined;
        }

        const move: Move = {
          row,
          col,
          previousValue: currentValue,
          newValue,
          timestamp: Date.now(),
        };

        const boardState = currentState.boardState || createBoardState();
        const cells = boardState.cells || {};
        const moveHistory = boardState.moveHistory || [];

        if (moveHistory.length === 0 && !currentState.isTimerRunning) {
          set((state) => ({
            puzzlesState: {
              ...state.puzzlesState,
              [puzzleId]: {
                ...currentState,
                startTime: Date.now(),
                isTimerRunning: true,
                boardState: {
                  ...boardState,
                  cells: {
                    ...cells,
                    [coordinate]: newValue,
                  },
                  moveHistory: [...moveHistory, move],
                },
              },
            },
          }));
        } else {
          set((state) => ({
            puzzlesState: {
              ...state.puzzlesState,
              [puzzleId]: {
                ...currentState,
                boardState: {
                  ...boardState,
                  cells: {
                    ...cells,
                    [coordinate]: newValue,
                  },
                  moveHistory: [...moveHistory, move],
                },
              },
            },
          }));
        }
      },

      undoLastMove: (puzzleId: number) => {
        const { puzzlesState, solvedPuzzles } = get();
        const currentState = puzzlesState[puzzleId];
        
        if (!currentState || !currentState.boardState || currentState.boardState.moveHistory.length === 0) return;

        const moveHistory = [...currentState.boardState.moveHistory];
        const lastMove = moveHistory.pop()!;
        const coordinate: CellCoordinate = `${lastMove.row},${lastMove.col}`;

        set((state) => ({
          puzzlesState: {
            ...state.puzzlesState,
            [puzzleId]: {
              ...currentState,
              isSolved: false,
              boardState: {
                ...currentState.boardState,
                cells: {
                  ...currentState.boardState.cells,
                  [coordinate]: lastMove.previousValue,
                },
                moveHistory,
                isSolved: false,
              },
            },
          },
          solvedPuzzles: solvedPuzzles.filter(id => id !== puzzleId),
        }));
      },

      resetBoard: (puzzleId: number) => {
        const { puzzlesState, solvedPuzzles } = get();
        const currentState = puzzlesState[puzzleId];
        
        if (!currentState) return;

        set((state) => ({
          puzzlesState: {
            ...state.puzzlesState,
            [puzzleId]: {
              ...currentState,
              isSolved: false,
              boardState: createBoardState(),
              startTime: null,
              isTimerRunning: false,
            },
          },
          solvedPuzzles: solvedPuzzles.filter(id => id !== puzzleId),
        }));
      },

      goToNextPuzzle: () => {
        const { currentPuzzleId } = get();
        set({ currentPuzzleId: currentPuzzleId + 1 });
      },

      goToPreviousPuzzle: () => {
        const { currentPuzzleId } = get();
        if (currentPuzzleId > 1) {
          set({ currentPuzzleId: currentPuzzleId - 1 });
        }
      },
    }),
    {
      name: 'tango-puzzle-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
); 