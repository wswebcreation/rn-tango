import AsyncStorage from '@react-native-async-storage/async-storage';

import bundledPuzzles from '@/app-data/puzzles.json';
import { REMOTE_PUZZLES_URL, REMOTE_VERSION_URL, VERSION_KEY } from '@/constants/Constants';
import {
  getAllPuzzles,
  getPuzzleById as dbGetPuzzleById,
  getPuzzleCount,
  seedBundledPuzzles,
} from '@/lib/database';
import { Puzzle } from '@/types/tango';

export async function loadLocalPuzzles(): Promise<Puzzle[]> {
  try {
    return await getAllPuzzles();
  } catch (error) {
    console.error('[puzzleStorage] loadLocalPuzzles failed:', error);
    return bundledPuzzles as Puzzle[];
  }
}

export async function getPuzzleById(puzzleId: number): Promise<Puzzle | undefined> {
  try {
    return await dbGetPuzzleById(puzzleId);
  } catch (error) {
    console.error('[puzzleStorage] getPuzzleById failed:', error);
    return undefined;
  }
}

export async function initializePuzzlesIfNeeded(): Promise<boolean> {
  try {
    const count = await getPuzzleCount();
    if (count === 0) {
      await seedBundledPuzzles();
      console.log('[puzzleStorage] Seeded bundled puzzles');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[puzzleStorage] initializePuzzlesIfNeeded failed:', error);
    return false;
  }
}

export async function loadLocalVersion(): Promise<number> {
  const version = await AsyncStorage.getItem(VERSION_KEY);
  return version ? Number(version) : 0;
}

export async function saveVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(VERSION_KEY, String(version));
}

export async function fetchRemoteVersion(): Promise<number> {
  const res = await fetch(REMOTE_VERSION_URL);
  const data = await res.json();
  return data.version;
}

export async function fetchRemotePuzzles(): Promise<Puzzle[]> {
  const res = await fetch(REMOTE_PUZZLES_URL);
  return res.json();
}
