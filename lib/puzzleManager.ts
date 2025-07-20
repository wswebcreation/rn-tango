import { PUZZLES_FILE, REMOTE_PUZZLES_URL, REMOTE_VERSION_URL, UPDATED_KEY, VERSION_KEY } from '@/constants/Constants';
import fallbackPuzzles from '@/constants/fallbackPuzzles.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export async function loadPuzzles() {
  try {
    const file = await FileSystem.readAsStringAsync(PUZZLES_FILE);
    const data = JSON.parse(file);
    return data;
  } catch {
    return fallbackPuzzles;
  }
}

export async function fetchAndStorePuzzles() {
  try {
    const versionResponse = await fetch(REMOTE_VERSION_URL);
    const { version: remoteVersion } = await versionResponse.json();
    const localVersionString = await AsyncStorage.getItem(VERSION_KEY);
    const localVersion = localVersionString ? parseInt(localVersionString, 10) : 0;

    if (remoteVersion > localVersion) {
      console.log('⬇️ New puzzles found, downloading...');

      // Only now download full puzzles
      const puzzlesResponse = await fetch(REMOTE_PUZZLES_URL);
      const puzzlesData = await puzzlesResponse.json();

      await FileSystem.writeAsStringAsync(PUZZLES_FILE, JSON.stringify(puzzlesData));
      await AsyncStorage.setItem(VERSION_KEY, String(remoteVersion));
      await AsyncStorage.setItem(UPDATED_KEY, new Date().toISOString());
      console.log('✅ New puzzles downloaded and saved.');
    } else {
      console.log('ℹ️ Puzzles are already up to date.');
    }
  } catch (error) {
    console.error('❌ Failed to fetch puzzles:', error);
  }
}

export async function getLastUpdated() {
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
