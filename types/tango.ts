import { ViewStyle } from 'react-native';

export type CellCoordinate = `${number},${number}`;
export type CellValue = "☀️" | "🌑";
export type ConstraintType = "=" | "x";
export type Direction = "right" | "down";

export type Constraint = [CellCoordinate, CellCoordinate, ConstraintType];

export type CellConstraint = {
  direction: Direction;
  value: ConstraintType;
} | null;

export type CellData = {
  color: string;
  style: any;
  value: CellValue | undefined;
  constraints: CellConstraint[];
  hasError?: boolean;
};

export interface Puzzle {
  id: number;
  size: number;
  prefilled: Record<CellCoordinate, CellValue>;
  constraints: Constraint[];
}

export type PuzzleLevel = Puzzle[];
export type PuzzleCollection = PuzzleLevel[];

export type PuzzleCellProps = {
  row: number;
  col: number;
  value: CellValue | undefined;
  style: ViewStyle;
  onPress: () => void;
  hasError?: boolean;
};

export type PuzzleGridProps = {
  board: CellData[][];
  onCellPress: (row: number, col: number) => void;
};

export type ConstraintItem = {
  constraints: CellConstraint[];
  row: number;
  col: number;
  cellWidth: number;
  cellHeight: number;
};

export type ConstraintTextProps = {
  constraints: CellConstraint[]; 
  row: number;
  col: number;
  cellWidth: number;
  cellHeight: number;
  constraintFontSize: number;
  constraintHeightWidth: number;
};

export type Move = {
  row: number;
  col: number;
  previousValue: CellValue | undefined;
  newValue: CellValue | undefined;
  timestamp: number;
};

export type BoardState = {
  cells: Record<CellCoordinate, CellValue | undefined>;
  moveHistory: Move[];
  isSolved: boolean;
};

export type PuzzleState = {
  isSolved: boolean;
  totalTime: number;
  startTime: number | null;
  isTimerRunning: boolean;
  boardState: BoardState;
};

export type ThemePreference = 'auto' | 'light' | 'dark';

export type TangoStore = {
  currentPuzzleId: number;
  puzzlesState: Record<number, PuzzleState>;
  solvedPuzzles: number[];
  themePreference: ThemePreference;
  
  // Timer Actions
  setCurrentPuzzle: (puzzleId: number) => void;
  startTimer: (puzzleId: number) => void;
  stopTimer: (puzzleId: number) => void;
  pauseTimer: (puzzleId: number) => void;
  resumeTimer: (puzzleId: number) => void;
  markPuzzleSolved: (puzzleId: number) => void;
  resetPuzzleState: (puzzleId: number) => void;
  
  // Board Actions
  toggleCell: (puzzleId: number, row: number, col: number) => void;
  undoLastMove: (puzzleId: number) => void;
  resetBoard: (puzzleId: number) => void;
  goToNextPuzzle: () => void;
  goToPreviousPuzzle: () => void;
  
  // Theme Actions
  setThemePreference: (preference: ThemePreference) => void;
};
