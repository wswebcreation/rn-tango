import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { useQueensStore } from '@/store/useQueensStore';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { usePuzzles } from '@/hooks/usePuzzles';
import { useRouter } from 'expo-router';

const formatTime = (seconds: number): string => {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};
const LevelsScreen = () => {
  const { puzzles, loading } = usePuzzles();
  // const { setCurrentPuzzle, solvedPuzzles, currentPuzzleId, puzzlesState } = useQueensStore();
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
          // const isSolved = solvedPuzzles.includes(item.id);
          const isSolved = false;
          // const isCurrent = currentPuzzleId === item.id;
          const isCurrent = false;
          const previousId = puzzles[index - 1]?.id;
          // const previousSolved = index === 0 || solvedPuzzles.includes(previousId);
          const previousSolved = index === 0 || false;
          const locked = !previousSolved;
          // const totalTime = puzzlesState[item.id]?.totalTime ?? 0;
          const totalTime = 0;
          const labelText = `#${item.id} ${isSolved ? `🎉 (${formatTime(totalTime)})` : locked ? '🔒' : ''}`

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
                  // setCurrentPuzzle(item.id);
                  // router.push('/play');
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
    flex: 1,
    backgroundColor: Colors.blueBg,
    padding: 20
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16
  },
  list: {
    paddingBottom: 100
  },
  levelButton: {
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 12,
    // backgroundColor: Colors.purple,
    borderRadius: 8,
    width: '100%',
    borderWidth: 0,
  },
  currentLevel: {
    // backgroundColor: Colors.deepPurple,
  },
  lockedLevel: {
    backgroundColor: Colors.inactive,
  },
  levelText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'normal',
  },
  solved: {
    // backgroundColor: Colors.deepPurple,
  }
});

export default LevelsScreen;
