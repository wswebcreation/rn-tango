import { Button } from '@/components/ui/Button';
import { usePuzzles } from '@/hooks/usePuzzles';
import { useTheme } from '@/hooks/useTheme';
import { addOnPuzzlesUpdatedCallback, removeOnPuzzlesUpdatedCallback } from '@/lib/puzzleManager';
import { useTangoStore } from '@/store/useTangoStore';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatTime = (seconds: number): string => {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const LevelsScreen = () => {
  const { puzzles, loading, refreshPuzzles } = usePuzzles();
  const { setCurrentPuzzle, solvedPuzzles, puzzlesState, currentPuzzleId } = useTangoStore();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    addOnPuzzlesUpdatedCallback(refreshPuzzles);
    
    return () => {
      removeOnPuzzlesUpdatedCallback(refreshPuzzles);
    };
  }, [refreshPuzzles]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.blueBg,
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 20,
    },
    list: {
      padding: 20,
    },
    levelButton: {
      marginBottom: 12,
      width: '100%',
      alignItems: 'flex-start',
    },
    currentLevel: {
      backgroundColor: colors.active,
      borderColor: colors.active,
    },
    lockedLevel: {
      backgroundColor: colors.inactive,
      borderColor: colors.inactive,
    },
    solved: {
      backgroundColor: colors.active,
      borderColor: colors.active,
    },
    levelText: {
      color: colors.activeText,
      textAlign: 'left',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Loading levels...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Choose a level</Text>
      <FlatList
        data={puzzles}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isSolved = solvedPuzzles.includes(item.id);
          const isCurrent = currentPuzzleId === item.id;
          const previousId = puzzles[index - 1]?.id;
          const previousSolved = index === 0 || solvedPuzzles.includes(previousId);
          const locked = !previousSolved;
          const puzzleState = puzzlesState[item.id];
          const totalTime = puzzleState?.totalTime ?? 0;
          const hasTime = totalTime > 0 || isSolved;
          const timeDisplay = hasTime ? ` (${formatTime(totalTime)})` : '';
          const statusIcon = isSolved ? '🎉' : hasTime ? '⏱️' : '';
          const labelText = `#${item.id} ${statusIcon}${timeDisplay}${locked ? ' 🔒' : ''}`;

          return (
            <Button
              label={labelText}
              disabled={locked}
              containerStyle={[
                styles.levelButton,
                isCurrent && styles.currentLevel,
                locked && styles.lockedLevel,
                isSolved && styles.solved,
              ]}
              onPress={() => {
                setCurrentPuzzle(item.id);
                router.push('/play');
              }}
              textStyle={styles.levelText}
            />
          );
        }}
      />
    </SafeAreaView>
  );
};

export default LevelsScreen;
