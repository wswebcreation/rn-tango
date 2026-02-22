import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ASYNC_CURRENT_PUZZLE_KEY, ASYNC_THEME_KEY } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { initDatabase, loadAllPuzzleStates, runMigrationIfNeeded } from '@/lib/database';
import { useTangoStore } from '@/store/useTangoStore';
import { PuzzleState, ThemePreference } from '@/types/tango';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [appReady, setAppReady] = useState(false);
  const hydrate = useTangoStore(state => state.hydrate);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDatabase();
        await runMigrationIfNeeded();

        const dbStates = await loadAllPuzzleStates();

        const [rawCurrentId, rawTheme] = await Promise.all([
          AsyncStorage.getItem(ASYNC_CURRENT_PUZZLE_KEY),
          AsyncStorage.getItem(ASYNC_THEME_KEY),
        ]);

        const puzzlesState: Record<number, PuzzleState> = {};
        const solvedPuzzles: number[] = [];
        const bestScores: Record<number, number> = {};

        for (const row of dbStates) {
          puzzlesState[row.puzzleId] = {
            isSolved: row.isSolved,
            totalTime: row.totalTime,
            startTime: null,
            isTimerRunning: false,
            boardState: {
              cells: row.cells,
              moveHistory: row.moveHistory,
              isSolved: row.isSolved,
            },
          };
          if (row.isSolved) solvedPuzzles.push(row.puzzleId);
          if (row.bestScore !== null) bestScores[row.puzzleId] = row.bestScore;
        }

        hydrate({
          currentPuzzleId: rawCurrentId ? parseInt(rawCurrentId, 10) : 1,
          themePreference: (rawTheme as ThemePreference) ?? 'auto',
          puzzlesState,
          solvedPuzzles,
          bestScores,
        });
      } catch (error) {
        console.error('[_layout] App initialization failed:', error);
        // Proceed with store defaults — better than crashing
      } finally {
        setAppReady(true);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (loaded && appReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, appReady]);

  if (!loaded || !appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
