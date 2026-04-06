/**
 * Weekly slot difficulty (Try Hard–style): Monday easiest → Sunday hardest.
 * Anchored so puzzle `WEEKLY_DIFFICULTY_ANCHOR_MONDAY_ID` is Monday (difficulty 1).
 */
export const WEEKLY_DIFFICULTY_ANCHOR_MONDAY_ID = 546;

/** Monday = 1 … Sunday = 7 */
export function difficultyFromPuzzleId(
  id: number,
  anchorMondayId: number = WEEKLY_DIFFICULTY_ANCHOR_MONDAY_ID
): number {
  const offset = id - anchorMondayId;
  const day = ((offset % 7) + 7) % 7;
  return day + 1;
}

export function applyWeeklyDifficultyToAll<T extends { id: number; difficulty?: number }>(
  puzzles: T[]
): void {
  for (const p of puzzles) {
    p.difficulty = difficultyFromPuzzleId(p.id);
  }
}
