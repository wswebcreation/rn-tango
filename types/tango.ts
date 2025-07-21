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
  constraint: CellConstraint;
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
};

export type PuzzleGridProps = {
  board: CellData[][];
  onCellPress: (row: number, col: number) => void;
};

export type ConstraintItem = {
  constraint: CellConstraint;
  row: number;
  col: number;
  cellWidth: number;
  cellHeight: number;
};

export type ConstraintTextProps = {
  constraint: CellConstraint;
  row: number;
  col: number;
  cellWidth: number;
  cellHeight: number;
  constraintFontSize: number;
  constraintHeightWidth: number;
};
