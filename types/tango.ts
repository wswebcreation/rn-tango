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
