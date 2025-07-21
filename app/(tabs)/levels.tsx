import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { usePuzzles } from '@/hooks/usePuzzles';
import { useTangoStore } from '@/store/useTangoStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatTime = (seconds: number): string => {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const LevelsScreen = () => {
  const { puzzles, loading } = usePuzzles();
  const { setCurrentPuzzle, solvedPuzzles, puzzlesState, currentPuzzleId } = useTangoStore();
  const router = useRouter();

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

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.blueBg,
    flex: 1,
  },
  title: {
    color: Colors.text,
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
    backgroundColor: Colors.active,
    borderColor: Colors.active,
  },
  lockedLevel: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
  },
  solved: {
    backgroundColor: Colors.active,
    borderColor: Colors.active,
  },
  levelText: {
    color: Colors.activeText,
    textAlign: 'left',
  },
});

export default LevelsScreen;
