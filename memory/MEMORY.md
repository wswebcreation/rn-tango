# Tango Project Memory

## Puzzle Data
- `app-data/puzzles.json` — 1000 puzzles, all 6×6
- Difficulty 1-7, ~143 puzzles per level (percentile-normalised)
- IDs 1-502: original LinkedIn puzzles; IDs 503-1001: generated
- Run `npm run generate-puzzles` to add more (targets 1000 total, increments if called again)

## Generator
- `scripts/generate-puzzles.ts` — TypeScript script, run via `npm run generate-puzzles`
- Uses `ts-node` with `scripts/tsconfig.json` (CommonJS, standalone from the app)
- Enumerates 11,222 valid 6×6 solution grids via backtracking
- Rates puzzles with solver depth + clue count, then normalises to 1-7 by percentile
- Deduplicates by fingerprint (sorted prefilled + sorted constraints)

## App Architecture (post-SQLite migration)
- React Native / Expo SDK 53, iOS only, Expo Router, TypeScript
- **Storage**: SQLite (`lib/database.ts`) for puzzle definitions + game state
  - `puzzles` table — read-only after import; updated via `importPuzzles()` on remote sync
  - `puzzle_state` table — one row per puzzle; targeted upserts on every action
  - `currentPuzzleId` + `themePreference` in AsyncStorage (small scalars)
  - `db_schema_version` in AsyncStorage — tracks one-time migration completion
- **Zustand** (`store/useTangoStore.ts`) — purely in-memory, NO persist middleware
  - Hydrated from SQLite at startup via `hydrate()` action called in `_layout.tsx`
  - SQLite writes are async fire-and-forget side effects in mutating actions
  - `startTimer` / `resumeTimer` do NOT write to DB (session-ephemeral `startTime`)
  - `pauseTimer` / `stopTimer` / `toggleCell` / `markPuzzleSolved` etc. DO write to DB
- **Migration** (`runMigrationIfNeeded` in `lib/database.ts`):
  - Runs once on first launch after update
  - Reads legacy SecureStore key `tango-puzzle-storage` and writes to SQLite
  - SecureStore data intentionally NOT deleted (safety net)

## Key Files
- `lib/database.ts` — all SQLite operations + migration logic
- `lib/puzzleStorage.ts` — public API unchanged; internals now use SQLite
- `lib/puzzleManager.ts` — remote sync writes to SQLite via `importPuzzles()`
- `store/useTangoStore.ts` — in-memory Zustand, hydrated at startup
- `app/_layout.tsx` — startup: initDatabase → runMigrationIfNeeded → hydrate
- `app/(tabs)/settings.tsx` — "Reset App State" calls `resetAllPuzzleStates()` from database.ts
- `types/tango.ts` — `TangoStore` has `hydrate()` action
- `constants/Constants.ts` — includes DB_SCHEMA_VERSION_KEY, SECURE_STORE_KEY, ASYNC_CURRENT_PUZZLE_KEY, ASYNC_THEME_KEY
