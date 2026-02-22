import AsyncStorage from '@react-native-async-storage/async-storage';

import fallbackPuzzles from '@/constants/fallbackPuzzles.json';
import {
  REMOTE_PUZZLES_URL,
  REMOTE_VERSION_URL,
  UPDATED_KEY,
  VERSION_KEY,
} from '@/constants/Constants';
import { importPuzzles } from '@/lib/database';
import { Puzzle } from '@/types/tango';

// ── Callback system ───────────────────────────────────────────────────────────

let onPuzzlesResetCallback: (() => void) | null = null;
let onPuzzlesUpdatedCallbacks: (() => void)[] = [];

export function setOnPuzzlesResetCallback(callback: (() => void) | null) {
  onPuzzlesResetCallback = callback;
}

export function addOnPuzzlesUpdatedCallback(callback: () => void) {
  onPuzzlesUpdatedCallbacks.push(callback);
}

export function removeOnPuzzlesUpdatedCallback(callback: () => void) {
  onPuzzlesUpdatedCallbacks = onPuzzlesUpdatedCallbacks.filter(cb => cb !== callback);
}

// ── Remote sync ───────────────────────────────────────────────────────────────

export async function fetchAndStorePuzzles(): Promise<void> {
  try {
    const versionResponse = await fetch(REMOTE_VERSION_URL);
    const { version: remoteVersion } = await versionResponse.json();
    const localVersionString = await AsyncStorage.getItem(VERSION_KEY);
    const localVersion = localVersionString ? parseInt(localVersionString, 10) : 0;

    if (remoteVersion > localVersion) {
      console.log('[puzzleManager] New puzzles found, downloading...');

      const puzzlesResponse = await fetch(REMOTE_PUZZLES_URL);
      const puzzlesData: Puzzle[] = await puzzlesResponse.json();

      await importPuzzles(puzzlesData);

      await AsyncStorage.setItem(VERSION_KEY, String(remoteVersion));
      await AsyncStorage.setItem(UPDATED_KEY, new Date().toISOString());
      console.log('[puzzleManager] New puzzles downloaded and saved to SQLite.');

      onPuzzlesUpdatedCallbacks.forEach(cb => cb());
    } else {
      console.log('[puzzleManager] Puzzles are already up to date.');
    }
  } catch (error) {
    console.error('[puzzleManager] Failed to fetch puzzles:', error);
  }
}

export async function resetToFallbackPuzzles(): Promise<void> {
  try {
    await importPuzzles(fallbackPuzzles as Puzzle[]);
    await AsyncStorage.removeItem(VERSION_KEY);
    await AsyncStorage.removeItem(UPDATED_KEY);
    console.log('[puzzleManager] Reset to fallback puzzles.');

    if (onPuzzlesResetCallback) onPuzzlesResetCallback();
    onPuzzlesUpdatedCallbacks.forEach(cb => cb());
  } catch (error) {
    console.error('[puzzleManager] Failed to reset puzzles:', error);
    throw error;
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

export async function getLastUpdated(): Promise<string | null> {
  return AsyncStorage.getItem(UPDATED_KEY);
}

export async function fetchRemoteVersion(): Promise<number> {
  const response = await fetch(REMOTE_VERSION_URL);
  const { version } = await response.json();
  return version;
}

export async function loadLocalVersion(): Promise<number> {
  const localVersionString = await AsyncStorage.getItem(VERSION_KEY);
  return localVersionString ? parseInt(localVersionString, 10) : 0;
}
