export type CellCoordinate = `${number},${number}`;
export type CellValue = "☀️" | "🌑";
export type ConstraintType = "=" | "x";

export type Constraint = [CellCoordinate, CellCoordinate, ConstraintType];

export interface Puzzle {
  id: number;
  size: number;
  prefilled: Record<CellCoordinate, CellValue>;
  constraints: Constraint[];
}

export type PuzzleLevel = Puzzle[];
export type PuzzleCollection = PuzzleLevel[];
