#!/usr/bin/env npx ts-node --project scripts/tsconfig.json
/**
 * Tango Puzzle Generator
 * ======================
 * - Rates existing puzzles with difficulty 1-7 using a constraint-propagation solver
 * - Generates new unique 6×6 puzzles organised in sets of 7 (difficulty 1→7)
 * - Deduplicates against all existing puzzles
 * - Writes minified JSON to app-data/puzzles.json
 *
 * Run from the repo root:
 *   npm run generate-puzzles
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

const SUN  = '☀️';
const MOON = '🌑';
const OPPOSITE: Record<string, string> = { [SUN]: MOON, [MOON]: SUN };
const SIZE = 6;

type Cell        = typeof SUN | typeof MOON | null;
type Grid        = Cell[][];
type ParsedConstraint = [number, number, number, number, string]; // r1,c1,r2,c2,type

interface RawPuzzle {
  id: number;
  size: number;
  prefilled: Record<string, string>;
  constraints: [string, string, string][];
  difficulty?: number;
}

// ---------------------------------------------------------------------------
// Valid-row precomputation
// ---------------------------------------------------------------------------

function buildValidRows(): string[][] {
  const rows: string[][] = [];
  for (let mask = 0; mask < 64; mask++) {
    const row = Array.from({ length: SIZE }, (_, i) =>
      (mask >> (SIZE - 1 - i)) & 1 ? SUN : MOON
    );
    if (row.filter(v => v === SUN).length !== 3) continue;
    let ok = true;
    for (let i = 0; i < SIZE - 2; i++) {
      if (row[i] === row[i + 1] && row[i + 1] === row[i + 2]) { ok = false; break; }
    }
    if (ok) rows.push(row);
  }
  return rows;
}

const VALID_ROWS = buildValidRows();

// ---------------------------------------------------------------------------
// Solution enumeration
// ---------------------------------------------------------------------------

function enumerateSolutions(): Grid[] {
  const solutions: Grid[] = [];

  function bt(grid: string[][]): void {
    const r = grid.length;

    if (r === SIZE) {
      for (let c = 0; c < SIZE; c++) {
        const col = grid.map(row => row[c]);
        if (col.filter(v => v === SUN).length !== 3) return;
        for (let i = 0; i < SIZE - 2; i++) {
          if (col[i] === col[i + 1] && col[i + 1] === col[i + 2]) return;
        }
      }
      solutions.push(grid.map(row => [...row] as Cell[]));
      return;
    }

    for (const row of VALID_ROWS) {
      let ok = true;
      for (let c = 0; c < SIZE; c++) {
        const partial = [...grid.map(g => g[c]), row[c]];
        const suns  = partial.filter(v => v === SUN).length;
        const moons = partial.filter(v => v === MOON).length;
        const rem   = SIZE - r - 1;
        if (suns > 3 || moons > 3)              { ok = false; break; }
        if (suns + rem < 3 || moons + rem < 3)  { ok = false; break; }
        if (r >= 2 && partial[r] === partial[r - 1] && partial[r - 1] === partial[r - 2]) {
          ok = false; break;
        }
      }
      if (ok) { grid.push(row); bt(grid); grid.pop(); }
    }
  }

  bt([]);
  return solutions;
}

// ---------------------------------------------------------------------------
// Solver (constraint propagation + backtracking)
// ---------------------------------------------------------------------------

function makeGrid(prefilled: Record<string, string>): Grid {
  const grid: Grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (const [key, val] of Object.entries(prefilled)) {
    const [r, c] = key.split(',').map(Number);
    grid[r][c] = val as Cell;
  }
  return grid;
}

function parseConstraints(constraints: [string, string, string][]): ParsedConstraint[] {
  return constraints.map(([a, b, t]) => {
    const [r1, c1] = a.split(',').map(Number);
    const [r2, c2] = b.split(',').map(Number);
    return [r1, c1, r2, c2, t] as ParsedConstraint;
  });
}

function propagateOnce(
  grid: Grid,
  parsed: ParsedConstraint[]
): { grid: Grid; changed: boolean; maxDepth: number } {
  const g: Grid = grid.map(row => [...row]);
  let changed = false;
  let maxDepth = 0;

  // Technique 0: row balance
  for (let r = 0; r < SIZE; r++) {
    const suns  = g[r].filter(v => v === SUN).length;
    const moons = g[r].filter(v => v === MOON).length;
    if (suns === 3)  { for (let c = 0; c < SIZE; c++) if (g[r][c] === null) { g[r][c] = MOON; changed = true; } }
    if (moons === 3) { for (let c = 0; c < SIZE; c++) if (g[r][c] === null) { g[r][c] = SUN;  changed = true; } }
  }

  // Technique 0: column balance
  for (let c = 0; c < SIZE; c++) {
    const col   = g.map(row => row[c]);
    const suns  = col.filter(v => v === SUN).length;
    const moons = col.filter(v => v === MOON).length;
    if (suns === 3)  { for (let r = 0; r < SIZE; r++) if (g[r][c] === null) { g[r][c] = MOON; changed = true; } }
    if (moons === 3) { for (let r = 0; r < SIZE; r++) if (g[r][c] === null) { g[r][c] = SUN;  changed = true; } }
  }

  // Technique 1: consecutive rule (rows)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (c >= 2 && g[r][c - 2] !== null && g[r][c - 2] === g[r][c - 1] && g[r][c] === null) {
        g[r][c] = OPPOSITE[g[r][c - 2]!] as Cell; changed = true; maxDepth = Math.max(maxDepth, 1);
      }
      if (c <= SIZE - 3 && g[r][c + 1] !== null && g[r][c + 1] === g[r][c + 2] && g[r][c] === null) {
        g[r][c] = OPPOSITE[g[r][c + 1]!] as Cell; changed = true; maxDepth = Math.max(maxDepth, 1);
      }
    }
  }

  // Technique 1: consecutive rule (columns)
  for (let c = 0; c < SIZE; c++) {
    for (let r = 0; r < SIZE; r++) {
      if (r >= 2 && g[r - 2][c] !== null && g[r - 2][c] === g[r - 1][c] && g[r][c] === null) {
        g[r][c] = OPPOSITE[g[r - 2][c]!] as Cell; changed = true; maxDepth = Math.max(maxDepth, 1);
      }
      if (r <= SIZE - 3 && g[r + 1][c] !== null && g[r + 1][c] === g[r + 2][c] && g[r][c] === null) {
        g[r][c] = OPPOSITE[g[r + 1][c]!] as Cell; changed = true; maxDepth = Math.max(maxDepth, 1);
      }
    }
  }

  // Technique 2: direct constraint propagation
  for (const [r1, c1, r2, c2, ctype] of parsed) {
    const v1 = g[r1][c1], v2 = g[r2][c2];
    if (ctype === '=') {
      if (v1 !== null && v2 === null) { g[r2][c2] = v1; changed = true; maxDepth = Math.max(maxDepth, 2); }
      if (v2 !== null && v1 === null) { g[r1][c1] = v2; changed = true; maxDepth = Math.max(maxDepth, 2); }
    } else {
      if (v1 !== null && v2 === null) { g[r2][c2] = OPPOSITE[v1] as Cell; changed = true; maxDepth = Math.max(maxDepth, 2); }
      if (v2 !== null && v1 === null) { g[r1][c1] = OPPOSITE[v2] as Cell; changed = true; maxDepth = Math.max(maxDepth, 2); }
    }
  }

  return { grid: g, changed, maxDepth };
}

function propagateFull(
  grid: Grid,
  parsed: ParsedConstraint[]
): { grid: Grid; maxDepth: number; unsolved: number } {
  let maxDepth = 0;
  while (true) {
    const res = propagateOnce(grid, parsed);
    maxDepth = Math.max(maxDepth, res.maxDepth);
    if (!res.changed) break;
    grid = res.grid;
  }
  const unsolved = grid.flat().filter(v => v === null).length;
  return { grid, maxDepth, unsolved };
}

function isConsistent(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    if (grid[r].filter(v => v === SUN).length  > 3) return false;
    if (grid[r].filter(v => v === MOON).length > 3) return false;
    for (let i = 0; i < SIZE - 2; i++) {
      if (grid[r][i] !== null && grid[r][i] === grid[r][i + 1] && grid[r][i + 1] === grid[r][i + 2]) return false;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    const col = grid.map(row => row[c]);
    if (col.filter(v => v === SUN).length  > 3) return false;
    if (col.filter(v => v === MOON).length > 3) return false;
    for (let i = 0; i < SIZE - 2; i++) {
      if (col[i] !== null && col[i] === col[i + 1] && col[i + 1] === col[i + 2]) return false;
    }
  }
  return true;
}

function countSolutions(grid: Grid, parsed: ParsedConstraint[], limit = 2): number {
  let count = 0;

  function bt(g: Grid): void {
    if (count >= limit) return;
    const { grid: ng, unsolved } = propagateFull(g, parsed);
    if (!isConsistent(ng)) return;
    if (unsolved === 0) { count++; return; }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (ng[r][c] === null) {
          for (const val of [SUN, MOON] as Cell[]) {
            const test: Grid = ng.map(row => [...row]);
            test[r][c] = val;
            bt(test);
            if (count >= limit) return;
          }
          return;
        }
      }
    }
  }

  bt(grid.map(row => [...row]));
  return count;
}

function isUniquelySolvable(
  prefilled: Record<string, string>,
  constraints: [string, string, string][]
): boolean {
  const grid   = makeGrid(prefilled);
  const parsed = parseConstraints(constraints);
  return countSolutions(grid, parsed) === 1;
}

// ---------------------------------------------------------------------------
// Difficulty measurement
// ---------------------------------------------------------------------------

function measureDifficulty(
  prefilled: Record<string, string>,
  constraints: [string, string, string][]
): number {
  const grid   = makeGrid(prefilled);
  const parsed = parseConstraints(constraints);
  const { maxDepth, unsolved } = propagateFull(grid.map(r => [...r]), parsed);
  const totalClues = Object.keys(prefilled).length + constraints.length;

  if (unsolved === 0) {
    if (maxDepth === 0) {
      if (totalClues >= 22) return 1;
      if (totalClues >= 17) return 2;
      return 3;
    }
    if (maxDepth === 1) {
      if (totalClues >= 16) return 2;
      if (totalClues >= 11) return 3;
      return 4;
    }
    // maxDepth === 2
    if (totalClues >= 12) return 3;
    if (totalClues >= 8)  return 4;
    return 5;
  }
  // needs backtracking
  if (totalClues >= 14) return 4;
  if (totalClues >= 10) return 5;
  if (totalClues >= 7)  return 6;
  return 7;
}

// ---------------------------------------------------------------------------
// Fingerprint (deduplication)
// ---------------------------------------------------------------------------

function fingerprint(
  prefilled: Record<string, string>,
  constraints: [string, string, string][]
): string {
  const pf = Object.entries(prefilled).sort().map(e => e.join(':')).join('|');
  const cs = [...constraints].sort().map(c => c.join(':')).join('|');
  return `${pf}__${cs}`;
}

// ---------------------------------------------------------------------------
// Puzzle generation
// ---------------------------------------------------------------------------

function allAdjacentConstraints(solution: Grid): [string, string, string][] {
  const cs: [string, string, string][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE - 1; c++) {
      cs.push([`${r},${c}`, `${r},${c + 1}`, solution[r][c] === solution[r][c + 1] ? '=' : 'x']);
    }
  }
  for (let r = 0; r < SIZE - 1; r++) {
    for (let c = 0; c < SIZE; c++) {
      cs.push([`${r},${c}`, `${r + 1},${c}`, solution[r][c] === solution[r + 1][c] ? '=' : 'x']);
    }
  }
  return cs;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sample<T>(arr: T[], n: number): T[] {
  return shuffle([...arr]).slice(0, n);
}

const PREFILL_RANGE: Record<number, [number, number]> = {
  1: [15, 20], 2: [12, 15], 3: [9, 12],
  4: [7, 9],  5: [5, 7],  6: [3, 5], 7: [1, 3],
};

function generatePuzzle(
  solution: Grid,
  targetDifficulty: number,
  existingFps: Set<string>,
  maxAttempts = 80
): { prefilled: Record<string, string>; constraints: [string, string, string][]; difficulty: number } | null {
  const allCells   = Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => [r, c])).flat() as [number, number][];
  const allC       = allAdjacentConstraints(solution);
  const [mn, mx]   = PREFILL_RANGE[targetDifficulty];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nPf      = mn + Math.floor(Math.random() * (mx - mn + 1));
    const cells    = sample(allCells, nPf);
    const prefilled: Record<string, string> = {};
    for (const [r, c] of cells) prefilled[`${r},${c}`] = solution[r][c] as string;

    // Try without constraints first
    if (isUniquelySolvable(prefilled, [])) {
      const fp = fingerprint(prefilled, []);
      if (!existingFps.has(fp)) {
        const diff = measureDifficulty(prefilled, []);
        if (Math.abs(diff - targetDifficulty) <= 1) {
          existingFps.add(fp);
          return { prefilled, constraints: [], difficulty: diff };
        }
      }
      continue;
    }

    // Add constraints one by one until uniquely solvable
    const shuffledC = shuffle([...allC]);
    const used: [string, string, string][] = [];
    for (const con of shuffledC) {
      used.push(con);
      if (isUniquelySolvable(prefilled, used)) {
        const fp = fingerprint(prefilled, used);
        if (!existingFps.has(fp)) {
          const diff = measureDifficulty(prefilled, used);
          if (Math.abs(diff - targetDifficulty) <= 1) {
            existingFps.add(fp);
            return { prefilled, constraints: used, difficulty: diff };
          }
        }
        break;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Difficulty normalisation (percentile-based, guarantees all 7 levels used)
// ---------------------------------------------------------------------------

function hardnessScore(p: RawPuzzle): number {
  const grid   = makeGrid(p.prefilled);
  const parsed = parseConstraints(p.constraints);
  const { maxDepth, unsolved } = propagateFull(grid.map(r => [...r]), parsed);
  const totalClues = Object.keys(p.prefilled).length + p.constraints.length;
  return (36 - totalClues) * 2 + maxDepth * 5 + (unsolved > 0 ? 15 : 0);
}

function normaliseDifficulty(puzzles: RawPuzzle[]): RawPuzzle[] {
  const scores = puzzles.map((p, i) => ({ score: hardnessScore(p), i }));
  scores.sort((a, b) => a.score - b.score);
  const n = scores.length;
  for (let rank = 0; rank < n; rank++) {
    puzzles[scores[rank].i].difficulty = Math.min(Math.floor((rank * 7) / n) + 1, 7);
  }
  return puzzles;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const repoRoot    = path.resolve(__dirname, '..');
  const puzzlesPath = path.join(repoRoot, 'app-data', 'puzzles.json');

  // Load existing puzzles
  const puzzles: RawPuzzle[] = JSON.parse(fs.readFileSync(puzzlesPath, 'utf-8'));
  console.log(`Loaded ${puzzles.length} existing puzzles`);

  // Rate existing puzzles (raw pass – normalised later)
  console.log('Rating existing puzzles …');
  puzzles.forEach((p, i) => {
    if (p.difficulty === undefined) p.difficulty = measureDifficulty(p.prefilled, p.constraints);
    if ((i + 1) % 100 === 0) process.stdout.write(`  ${i + 1}/${puzzles.length} rated\n`);
  });

  // Build dedup fingerprint set
  const existingFps = new Set(puzzles.map(p => fingerprint(p.prefilled, p.constraints)));

  // Enumerate solutions
  console.log('Enumerating all valid 6×6 Tango solution grids …');
  const solutions = enumerateSolutions();
  console.log(`Found ${solutions.length} valid solution grids`);

  // Generate new puzzles in sets of 7
  const TARGET_TOTAL = 1000;
  const needed       = TARGET_TOTAL - puzzles.length;
  console.log(`\nGenerating ${needed} new puzzles (sets of 7, difficulties 1→7) …`);

  const newPuzzles: RawPuzzle[] = [];
  let nextId   = Math.max(...puzzles.map(p => p.id)) + 1;
  let solIdx   = 0;
  let fails    = 0;
  const MAX_FAILS = solutions.length * 2;

  while (newPuzzles.length < needed) {
    const solution = solutions[solIdx % solutions.length];
    solIdx++;
    let gotOne = false;

    for (let td = 1; td <= 7; td++) {
      if (newPuzzles.length >= needed) break;
      const result = generatePuzzle(solution, td, existingFps);
      if (result) {
        newPuzzles.push({ id: nextId++, size: SIZE, ...result });
        gotOne = true;
        if (newPuzzles.length % 50 === 0) process.stdout.write(`  Generated ${newPuzzles.length}/${needed} …\n`);
      }
    }

    if (gotOne) { fails = 0; } else { fails++; }
    if (fails >= MAX_FAILS) {
      process.stderr.write(`Warning: exhausted solution space after ${newPuzzles.length} new puzzles.\n`);
      break;
    }
  }

  // Percentile-normalise difficulty across all puzzles
  const allPuzzles = [...puzzles, ...newPuzzles];
  console.log(`\nNormalising difficulty 1-7 across ${allPuzzles.length} puzzles …`);
  normaliseDifficulty(allPuzzles);

  // Save (minified)
  fs.writeFileSync(puzzlesPath, JSON.stringify(allPuzzles), 'utf-8');

  const dist: Record<number, number> = {};
  for (const p of allPuzzles) dist[p.difficulty!] = (dist[p.difficulty!] ?? 0) + 1;
  console.log(`\nSaved ${allPuzzles.length} puzzles to ${puzzlesPath}`);
  console.log('Final difficulty distribution:', Object.fromEntries(Object.entries(dist).sort()));
}

main();
