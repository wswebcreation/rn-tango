import * as FileSystem from 'expo-file-system';

export const PUZZLES_PATH = `${FileSystem.documentDirectory}puzzles.json`;
export const PUZZLE_FILE = `${FileSystem.documentDirectory}puzzles.json`;
export const REMOTE_VERSION_URL = 'https://raw.githubusercontent.com/wswebcreation/rn-tango/refs/heads/main/app-data/version.json';
export const REMOTE_PUZZLES_URL = 'https://raw.githubusercontent.com/wswebcreation/rn-tango/refs/heads/main/app-data/puzzles.json';
export const VERSION_KEY = 'puzzles_version';