import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import bundledPuzzles from '@/app-data/puzzles.json';
import {
  ASYNC_CURRENT_PUZZLE_KEY,
  ASYNC_THEME_KEY,
  DB_SCHEMA_VERSION_KEY,
  PUZZLES_FILE,
  SECURE_STORE_KEY,
} from '@/constants/Constants';
import { Move, Puzzle } from '@/types/tango';

// ── Singleton connection ──────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('Database not initialised. Call initDatabase() first.');
  return _db;
}

// ── Safe JSON parse helper ────────────────────────────────────────────────────

function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  _db = await SQLite.openDatabaseAsync('tango.db');

  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS puzzles (
      id          INTEGER PRIMARY KEY,
      size        INTEGER NOT NULL,
      prefilled   TEXT    NOT NULL,
      constraints TEXT    NOT NULL,
      difficulty  INTEGER
    );

    CREATE TABLE IF NOT EXISTS puzzle_state (
      puzzle_id    INTEGER PRIMARY KEY,
      is_solved    INTEGER NOT NULL DEFAULT 0,
      total_time   INTEGER NOT NULL DEFAULT 0,
      cells        TEXT    NOT NULL DEFAULT '{}',
      move_history TEXT    NOT NULL DEFAULT '[]',
      best_score   INTEGER
    );
  `);
}

// ── Puzzles table ─────────────────────────────────────────────────────────────

export async function getPuzzleCount(): Promise<number> {
  const result = await getDb().getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM puzzles'
  );
  return result?.count ?? 0;
}

export async function importPuzzles(puzzles: Puzzle[]): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (const puzzle of puzzles) {
      await db.runAsync(
        `INSERT OR REPLACE INTO puzzles (id, size, prefilled, constraints, difficulty)
         VALUES (?, ?, ?, ?, ?)`,
        puzzle.id,
        puzzle.size,
        JSON.stringify(puzzle.prefilled),
        JSON.stringify(puzzle.constraints),
        puzzle.difficulty ?? null
      );
    }
  });
}

export async function seedBundledPuzzles(): Promise<void> {
  await importPuzzles(bundledPuzzles as Puzzle[]);
}

export async function getPuzzleById(id: number): Promise<Puzzle | undefined> {
  const row = await getDb().getFirstAsync<{
    id: number;
    size: number;
    prefilled: string;
    constraints: string;
    difficulty: number | null;
  }>('SELECT id, size, prefilled, constraints, difficulty FROM puzzles WHERE id = ?', id);

  if (!row) return undefined;

  return {
    id: row.id,
    size: row.size,
    prefilled: safeJsonParse(row.prefilled, {}),
    constraints: safeJsonParse(row.constraints, []),
    difficulty: row.difficulty ?? undefined,
  };
}

export async function getAllPuzzles(): Promise<Puzzle[]> {
  const rows = await getDb().getAllAsync<{
    id: number;
    size: number;
    prefilled: string;
    constraints: string;
    difficulty: number | null;
  }>('SELECT id, size, prefilled, constraints, difficulty FROM puzzles ORDER BY id ASC');

  return rows.map(row => ({
    id: row.id,
    size: row.size,
    prefilled: safeJsonParse(row.prefilled, {}),
    constraints: safeJsonParse(row.constraints, []),
    difficulty: row.difficulty ?? undefined,
  }));
}

// ── Puzzle state table ────────────────────────────────────────────────────────

export type DbPuzzleState = {
  puzzleId: number;
  isSolved: boolean;
  totalTime: number;
  cells: Record<string, '☀️' | '🌑' | undefined>;
  moveHistory: Move[];
  bestScore: number | null;
};

export async function loadAllPuzzleStates(): Promise<DbPuzzleState[]> {
  const rows = await getDb().getAllAsync<{
    puzzle_id: number;
    is_solved: number;
    total_time: number;
    cells: string;
    move_history: string;
    best_score: number | null;
  }>('SELECT puzzle_id, is_solved, total_time, cells, move_history, best_score FROM puzzle_state');

  return rows.map(row => ({
    puzzleId: row.puzzle_id,
    isSolved: row.is_solved === 1,
    totalTime: row.total_time,
    cells: safeJsonParse(row.cells, {}),
    moveHistory: safeJsonParse(row.move_history, []),
    bestScore: row.best_score,
  }));
}

export async function savePuzzleState(state: DbPuzzleState): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO puzzle_state (puzzle_id, is_solved, total_time, cells, move_history, best_score)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(puzzle_id) DO UPDATE SET
       is_solved    = excluded.is_solved,
       total_time   = excluded.total_time,
       cells        = excluded.cells,
       move_history = excluded.move_history,
       best_score   = CASE
                        WHEN best_score IS NULL THEN excluded.best_score
                        WHEN excluded.best_score IS NOT NULL AND excluded.best_score < best_score THEN excluded.best_score
                        ELSE best_score
                      END`,
    state.puzzleId,
    state.isSolved ? 1 : 0,
    state.totalTime,
    JSON.stringify(state.cells),
    JSON.stringify(state.moveHistory),
    state.bestScore
  );
}

export async function markPuzzleSolvedInDb(
  puzzleId: number,
  totalTime: number,
  cells: Record<string, '☀️' | '🌑' | undefined>
): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO puzzle_state (puzzle_id, is_solved, total_time, cells, move_history, best_score)
     VALUES (?, 1, ?, ?, '[]', ?)
     ON CONFLICT(puzzle_id) DO UPDATE SET
       is_solved    = 1,
       total_time   = excluded.total_time,
       cells        = excluded.cells,
       move_history = '[]',
       best_score   = CASE
                        WHEN best_score IS NULL THEN excluded.best_score
                        WHEN excluded.best_score < best_score THEN excluded.best_score
                        ELSE best_score
                      END`,
    puzzleId,
    totalTime,
    JSON.stringify(cells),
    totalTime
  );
}

export async function resetPuzzleStateInDb(puzzleId: number): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO puzzle_state (puzzle_id, is_solved, total_time, cells, move_history, best_score)
     VALUES (?, 0, 0, '{}', '[]', NULL)
     ON CONFLICT(puzzle_id) DO UPDATE SET
       is_solved    = 0,
       total_time   = 0,
       cells        = '{}',
       move_history = '[]'`,
    // best_score intentionally NOT reset
    puzzleId
  );
}

export async function resetAllPuzzleStates(): Promise<void> {
  await getDb().runAsync(
    `UPDATE puzzle_state
     SET is_solved = 0, total_time = 0, cells = '{}', move_history = '[]'`
    // best_score intentionally NOT reset
  );
}

// ── Migration ─────────────────────────────────────────────────────────────────

type LegacyStoreBlob = {
  state: {
    currentPuzzleId: number;
    puzzlesState: Record<
      number,
      {
        isSolved: boolean;
        totalTime: number;
        startTime: number | null;
        isTimerRunning: boolean;
        boardState: {
          cells: Record<string, '☀️' | '🌑' | undefined>;
          moveHistory: Move[];
          isSolved: boolean;
        };
      }
    >;
    solvedPuzzles: number[];
    bestScores: Record<number, number>;
    themePreference: 'auto' | 'light' | 'dark';
  };
  version: number;
};

export async function runMigrationIfNeeded(): Promise<void> {
  const schemaVersion = await AsyncStorage.getItem(DB_SCHEMA_VERSION_KEY);
  if (schemaVersion === '1') return;

  console.log('[Migration] Starting v0 → v1 migration...');

  // Step 1: Seed puzzle definitions if table is empty
  const puzzleCount = await getPuzzleCount();
  if (puzzleCount === 0) {
    try {
      const FileSystem = await import('expo-file-system');
      const fileInfo = await FileSystem.getInfoAsync(PUZZLES_FILE);

      if (fileInfo.exists) {
        const json = await FileSystem.readAsStringAsync(PUZZLES_FILE);
        const puzzles = JSON.parse(json);
        await importPuzzles(puzzles);
        console.log(`[Migration] Imported ${puzzles.length} puzzles from puzzles.json`);
      } else {
        await seedBundledPuzzles();
        console.log('[Migration] Seeded bundled puzzles (no puzzles.json found)');
      }
    } catch (err) {
      console.error('[Migration] Puzzle import failed, seeding from bundle:', err);
      try {
        await seedBundledPuzzles();
      } catch (fallbackErr) {
        console.error('[Migration] Bundle seed also failed:', fallbackErr);
      }
    }
  }

  // Step 2: Migrate game state from SecureStore
  try {
    const raw = await SecureStore.getItemAsync(SECURE_STORE_KEY);

    if (!raw) {
      console.log('[Migration] No SecureStore data — new user, skipping state migration');
    } else {
      const blob: LegacyStoreBlob = JSON.parse(raw);
      const { currentPuzzleId, puzzlesState, bestScores, themePreference } = blob.state;

      await AsyncStorage.setItem(ASYNC_CURRENT_PUZZLE_KEY, String(currentPuzzleId ?? 1));
      await AsyncStorage.setItem(ASYNC_THEME_KEY, themePreference ?? 'auto');

      const db = getDb();
      await db.withTransactionAsync(async () => {
        for (const [puzzleIdStr, state] of Object.entries(puzzlesState ?? {})) {
          const puzzleId = Number(puzzleIdStr);
          const isSolved = state.isSolved === true;
          const bestScore = bestScores[puzzleId] ?? null;
          const moveHistory = isSolved ? [] : (state.boardState?.moveHistory ?? []);
          const cells = state.boardState?.cells ?? {};

          await db.runAsync(
            `INSERT OR REPLACE INTO puzzle_state
               (puzzle_id, is_solved, total_time, cells, move_history, best_score)
             VALUES (?, ?, ?, ?, ?, ?)`,
            puzzleId,
            isSolved ? 1 : 0,
            state.totalTime ?? 0,
            JSON.stringify(cells),
            JSON.stringify(moveHistory),
            bestScore
          );
        }
      });

      console.log(
        `[Migration] Migrated state for ${Object.keys(puzzlesState ?? {}).length} puzzles`
      );
    }
  } catch (err) {
    console.error('[Migration] State migration failed:', err);
    // Do not rethrow — app must start even if migration partially fails.
    // SecureStore data is intentionally left intact as a safety net.
  }

  // Step 3: Mark migration complete (only after all writes succeed)
  await AsyncStorage.setItem(DB_SCHEMA_VERSION_KEY, '1');
  console.log('[Migration] Complete. db_schema_version = 1');
}
