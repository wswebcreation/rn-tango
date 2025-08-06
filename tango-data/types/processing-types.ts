import { Puzzle } from './shared-types';

export interface ExistingPuzzlesData {
  puzzles: Puzzle[];
  existingIds: Set<number>;
}

export interface ProcessingFilters {
  filesToProcess: string[];
  skippedCount: number;
}

export interface PuzzleMergeResult {
  allPuzzles: Puzzle[];
  hasNewPuzzles: boolean;
}

export type ManualPrefilledData = Record<number, Record<string, string>>;

export type ManualConstraintsData = Record<number, [string, string, string][]>;