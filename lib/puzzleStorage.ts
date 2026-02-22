import { PUZZLES_PATH, REMOTE_PUZZLES_URL, REMOTE_VERSION_URL, VERSION_KEY } from '@/constants/Constants';
import bundledPuzzles from '@/app-data/puzzles.json';
import { Puzzle } from '@/types/tango';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export async function loadLocalPuzzles() {
  try {
    const data = await FileSystem.readAsStringAsync(PUZZLES_PATH);

    return JSON.parse(data);
  } catch {
    // Fall back to the full puzzle set bundled with the app
    return bundledPuzzles;
  }
}

export async function savePuzzlesLocally(puzzlesJson: any) {
  await FileSystem.writeAsStringAsync(PUZZLES_PATH, JSON.stringify(puzzlesJson));
}

export async function loadLocalVersion(): Promise<number> {
  const version = await AsyncStorage.getItem(VERSION_KEY);
  return version ? Number(version) : 0;
}

export async function saveVersion(version: number) {
  await AsyncStorage.setItem(VERSION_KEY, String(version));
}

export async function fetchRemoteVersion(): Promise<number> {
  const res = await fetch(REMOTE_VERSION_URL);
  const data = await res.json();
  return data.version;
}

export async function fetchRemotePuzzles() {
  const res = await fetch(REMOTE_PUZZLES_URL);
  const data = await res.json();
  return data;
}

export async function initializePuzzlesIfNeeded (): Promise<boolean>  {
  try {
    const existingPuzzles = await loadLocalPuzzles();

    if (!existingPuzzles || existingPuzzles.length === 0) {
      await savePuzzlesLocally(bundledPuzzles);
      console.log('Initialized with bundled puzzles');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error initializing puzzles:', error);
    try {
      await savePuzzlesLocally(bundledPuzzles);
      return true;
    } catch (fallbackError) {
      console.error('Failed to load bundled puzzles:', fallbackError);
      return false;
    }
  }
};

export async function getPuzzleById(puzzleId: number): Promise<Puzzle | undefined> {
  try {
    const puzzles = await loadLocalPuzzles();

    return puzzles.find((puzzle: any) => puzzle.id === puzzleId);
  } catch (error) {
    console.error('Failed to get puzzle by ID:', error);
    
    return undefined;
  }
}
