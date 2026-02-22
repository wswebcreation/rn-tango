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

## App Architecture
- React Native / Expo (iOS only), Expo Router, Zustand for state
- Puzzle data loaded from `FileSystem.documentDirectory/puzzles.json` (downloaded from GitHub) or fallback
- Game state persisted via **expo-secure-store** (iOS Keychain — survives app reinstall)
  - Hybrid storage: reads SecureStore first, falls back to AsyncStorage for one-time migration
- Store key: `tango-puzzle-storage`

## Key Files
- `types/tango.ts` — `Puzzle` interface has `difficulty?: number`
- `store/useTangoStore.ts` — Zustand + SecureStore hybrid storage
- `app/(tabs)/play.tsx` — shows difficulty dots + label below puzzle title
- `app/(tabs)/levels.tsx` — shows difficulty dots on the right of each level button
- `lib/puzzleStorage.ts` — file system I/O + remote sync
- `constants/Constants.ts` — remote puzzle/version URLs
