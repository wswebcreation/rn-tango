import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  ASYNC_CURRENT_PUZZLE_KEY,
  ASYNC_THEME_KEY,
} from '@/constants/Constants';
import {
  markPuzzleSolvedInDb,
  resetPuzzleStateInDb,
  savePuzzleState,
} from '@/lib/database';
import {
  BoardState,
  CellCoordinate,
  CellValue,
  Move,
  PuzzleState,
  TangoStore,
  ThemePreference,
} from '@/types/tango';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function toDbState(
  puzzleId: number,
  state: PuzzleState,
  bestScore: number | null
) {
  return {
    puzzleId,
    isSolved: state.isSolved,
    totalTime: state.totalTime,
    cells: state.boardState?.cells ?? {},
    moveHistory: state.boardState?.moveHistory ?? [],
    bestScore,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTangoStore = create<TangoStore>()((set, get) => ({
  currentPuzzleId: 1,
  puzzlesState: {},
  solvedPuzzles: [],
  bestScores: {},
  themePreference: 'auto' as ThemePreference,

  // ── Hydration ───────────────────────────────────────────────────────────────
  hydrate: (data) => {
    set({
      currentPuzzleId: data.currentPuzzleId,
      puzzlesState: data.puzzlesState,
      solvedPuzzles: data.solvedPuzzles,
      bestScores: data.bestScores,
      themePreference: data.themePreference,
    });
  },

  // ── Navigation ──────────────────────────────────────────────────────────────
  setCurrentPuzzle: (puzzleId: number) => {
    const { puzzlesState } = get();
    if (!puzzlesState[puzzleId]) {
      set({
        currentPuzzleId: puzzleId,
        puzzlesState: { ...puzzlesState, [puzzleId]: createPuzzleState() },
      });
    } else {
      set({ currentPuzzleId: puzzleId });
    }
    AsyncStorage.setItem(ASYNC_CURRENT_PUZZLE_KEY, String(puzzleId)).catch(console.error);
  },

  goToNextPuzzle: () => {
    const { currentPuzzleId, puzzlesState } = get();
    const nextId = currentPuzzleId + 1;
    if (!puzzlesState[nextId]) {
      set({
        currentPuzzleId: nextId,
        puzzlesState: { ...puzzlesState, [nextId]: createPuzzleState() },
      });
    } else {
      set({ currentPuzzleId: nextId });
    }
    AsyncStorage.setItem(ASYNC_CURRENT_PUZZLE_KEY, String(nextId)).catch(console.error);
  },

  goToPreviousPuzzle: () => {
    const { currentPuzzleId } = get();
    if (currentPuzzleId > 1) {
      const prevId = currentPuzzleId - 1;
      set({ currentPuzzleId: prevId });
      AsyncStorage.setItem(ASYNC_CURRENT_PUZZLE_KEY, String(prevId)).catch(console.error);
    }
  },

  // ── Timer ───────────────────────────────────────────────────────────────────
  startTimer: (puzzleId: number) => {
    const { puzzlesState } = get();
    const currentState = puzzlesState[puzzleId] || createPuzzleState();
    if (!currentState.isSolved && !currentState.isTimerRunning) {
      set({
        puzzlesState: {
          ...puzzlesState,
          [puzzleId]: { ...currentState, startTime: Date.now(), isTimerRunning: true },
        },
      });
      // No DB write: startTime is session-only; only totalTime is persisted
    }
  },

  stopTimer: (puzzleId: number) => {
    const { puzzlesState, bestScores } = get();
    const currentState = puzzlesState[puzzleId];
    if (currentState?.isTimerRunning) {
      const elapsed = Date.now() - (currentState.startTime || 0);
      const newState = {
        ...currentState,
        totalTime: currentState.totalTime + Math.floor(elapsed / 1000),
        startTime: null,
        isTimerRunning: false,
      };
      set({ puzzlesState: { ...puzzlesState, [puzzleId]: newState } });
      savePuzzleState(toDbState(puzzleId, newState, bestScores[puzzleId] ?? null)).catch(console.error);
    }
  },

  pauseTimer: (puzzleId: number) => {
    const { puzzlesState, bestScores } = get();
    const currentState = puzzlesState[puzzleId];
    if (currentState?.isTimerRunning) {
      const elapsed = Date.now() - (currentState.startTime || 0);
      const newTotalTime = currentState.totalTime + Math.floor(elapsed / 1000);
      set(state => ({
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
      const updatedState = get().puzzlesState[puzzleId];
      savePuzzleState(toDbState(puzzleId, updatedState, bestScores[puzzleId] ?? null)).catch(console.error);
    }
  },

  resumeTimer: (puzzleId: number) => {
    const { puzzlesState } = get();
    const currentState = puzzlesState[puzzleId];
    if (currentState && !currentState.isSolved && !currentState.isTimerRunning) {
      set(state => ({
        puzzlesState: {
          ...state.puzzlesState,
          [puzzleId]: { ...currentState, startTime: Date.now(), isTimerRunning: true },
        },
      }));
      // No DB write: only sets session-ephemeral startTime
    }
  },

  // ── Board ───────────────────────────────────────────────────────────────────
  toggleCell: (puzzleId: number, row: number, col: number) => {
    const { puzzlesState, bestScores } = get();
    let currentState = puzzlesState[puzzleId];
    if (!currentState) currentState = createPuzzleState();
    if (currentState.isSolved) return;

    const coordinate: CellCoordinate = `${row},${col}`;
    const currentValue = currentState.boardState?.cells?.[coordinate];

    let newValue: CellValue | undefined;
    if (currentValue === undefined) newValue = '☀️';
    else if (currentValue === '☀️') newValue = '🌑';
    else newValue = undefined;

    const move: Move = { row, col, previousValue: currentValue, newValue, timestamp: Date.now() };
    const boardState = currentState.boardState || createBoardState();
    const cells = boardState.cells || {};
    const moveHistory = boardState.moveHistory || [];

    const autoStart = moveHistory.length === 0 && !currentState.isTimerRunning;
    const newPuzzleState: PuzzleState = {
      ...currentState,
      ...(autoStart ? { startTime: Date.now(), isTimerRunning: true } : {}),
      boardState: {
        ...boardState,
        cells: { ...cells, [coordinate]: newValue },
        moveHistory: [...moveHistory, move],
      },
    };

    set(state => ({
      puzzlesState: { ...state.puzzlesState, [puzzleId]: newPuzzleState },
    }));

    savePuzzleState(toDbState(puzzleId, newPuzzleState, bestScores[puzzleId] ?? null)).catch(console.error);
  },

  undoLastMove: (puzzleId: number) => {
    const { puzzlesState, solvedPuzzles, bestScores } = get();
    const currentState = puzzlesState[puzzleId];
    if (!currentState?.boardState?.moveHistory.length) return;

    const moveHistory = [...currentState.boardState.moveHistory];
    const lastMove = moveHistory.pop()!;
    const coordinate: CellCoordinate = `${lastMove.row},${lastMove.col}`;

    const newPuzzleState: PuzzleState = {
      ...currentState,
      isSolved: false,
      boardState: {
        ...currentState.boardState,
        cells: { ...currentState.boardState.cells, [coordinate]: lastMove.previousValue },
        moveHistory,
        isSolved: false,
      },
    };

    set(state => ({
      puzzlesState: { ...state.puzzlesState, [puzzleId]: newPuzzleState },
      solvedPuzzles: solvedPuzzles.filter(id => id !== puzzleId),
    }));

    savePuzzleState(toDbState(puzzleId, newPuzzleState, bestScores[puzzleId] ?? null)).catch(console.error);
  },

  resetBoard: (puzzleId: number) => {
    const { puzzlesState, solvedPuzzles } = get();
    const currentState = puzzlesState[puzzleId];
    if (!currentState) return;

    const newPuzzleState: PuzzleState = {
      ...currentState,
      isSolved: false,
      totalTime: 0,
      boardState: createBoardState(),
      startTime: null,
      isTimerRunning: false,
    };

    set(state => ({
      puzzlesState: { ...state.puzzlesState, [puzzleId]: newPuzzleState },
      solvedPuzzles: solvedPuzzles.filter(id => id !== puzzleId),
    }));

    resetPuzzleStateInDb(puzzleId).catch(console.error);
  },

  resetPuzzleState: (puzzleId: number) => {
    const { puzzlesState } = get();
    set({ puzzlesState: { ...puzzlesState, [puzzleId]: createPuzzleState() } });
    resetPuzzleStateInDb(puzzleId).catch(console.error);
  },

  markPuzzleSolved: (puzzleId: number) => {
    const { puzzlesState, solvedPuzzles, bestScores } = get();
    const currentState = puzzlesState[puzzleId];
    if (!currentState || currentState.isSolved) return;

    let finalTime = currentState.totalTime;
    if (currentState.isTimerRunning && currentState.startTime) {
      finalTime += Math.floor((Date.now() - currentState.startTime) / 1000);
    }

    const currentBest = bestScores[puzzleId];
    const isNewBest = !currentBest || finalTime < currentBest;
    const newBestScores = isNewBest ? { ...bestScores, [puzzleId]: finalTime } : bestScores;

    set({
      puzzlesState: {
        ...puzzlesState,
        [puzzleId]: {
          ...currentState,
          isSolved: true,
          totalTime: finalTime,
          startTime: null,
          isTimerRunning: false,
          boardState: { ...currentState.boardState, isSolved: true },
        },
      },
      solvedPuzzles: [...solvedPuzzles, puzzleId],
      bestScores: newBestScores,
    });

    markPuzzleSolvedInDb(
      puzzleId,
      finalTime,
      currentState.boardState?.cells ?? {}
    ).catch(console.error);
  },

  // ── Theme ───────────────────────────────────────────────────────────────────
  setThemePreference: (preference: ThemePreference) => {
    set({ themePreference: preference });
    AsyncStorage.setItem(ASYNC_THEME_KEY, preference).catch(console.error);
  },
}));
