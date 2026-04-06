#!/usr/bin/env npx ts-node --project scripts/tsconfig.json
/**
 * Recompute difficulty 1–7 for every puzzle from weekly slots (Mon → Sun).
 * See tango-data/utils/weekly-difficulty.ts for the anchor id.
 */
import * as fs from 'fs';
import * as path from 'path';
import { applyWeeklyDifficultyToAll } from '../tango-data/utils/weekly-difficulty';

function main(): void {
  const repoRoot = path.resolve(__dirname, '..');
  const puzzlesPath = path.join(repoRoot, 'app-data', 'puzzles.json');
  const puzzles: { id: number; difficulty?: number }[] = JSON.parse(
    fs.readFileSync(puzzlesPath, 'utf-8')
  );
  applyWeeklyDifficultyToAll(puzzles);
  fs.writeFileSync(puzzlesPath, JSON.stringify(puzzles), 'utf-8');
  const dist: Record<number, number> = {};
  for (const p of puzzles) dist[p.difficulty!] = (dist[p.difficulty!] ?? 0) + 1;
  console.log(`Updated ${puzzles.length} puzzles in ${puzzlesPath}`);
  console.log('Difficulty distribution:', Object.fromEntries(Object.entries(dist).sort()));
}

main();
