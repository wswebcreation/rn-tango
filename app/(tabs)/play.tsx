import { Button } from '@/components/ui/Button';
import { PuzzleGrid } from '@/components/ui/PuzzleGrid';
import { usePuzzle } from '@/hooks/usePuzzle';
import { usePuzzleLogic } from '@/hooks/usePuzzleLogic';
import { usePuzzleTimer } from '@/hooks/usePuzzleTimer';
import { useTheme } from '@/hooks/useTheme';
import { addOnPuzzlesUpdatedCallback, removeOnPuzzlesUpdatedCallback } from '@/lib/puzzleManager';
import { useTangoStore } from '@/store/useTangoStore';
import { CellData } from '@/types/tango';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PuzzleBoard = () => {
  const {
    currentPuzzleId,
    puzzlesState,
    bestScores,
    goToNextPuzzle,
    goToPreviousPuzzle,
  } = useTangoStore();
  
  const { colors } = useTheme();
  const { puzzle, loading, refreshPuzzle } = usePuzzle(currentPuzzleId);
  
  useEffect(() => {
    addOnPuzzlesUpdatedCallback(refreshPuzzle);
    
    return () => {
      removeOnPuzzlesUpdatedCallback(refreshPuzzle);
    };
  }, [refreshPuzzle]);

  const screenWidth = Dimensions.get('window').width;
  const padding = 10;
  const boardSize = puzzle?.size ?? 8;
  const cellSize = Math.floor((screenWidth - padding * 2) / boardSize);
  const isSolved = puzzlesState[currentPuzzleId]?.isSolved ?? false;
  const elapsed = usePuzzleTimer(currentPuzzleId, isSolved);

  const {
    handleCellPress,
    getCellValue,
    getCellConstraints,
    undoLastMove,
    resetBoard,
    canUndo,
    hasCellError,
  } = usePuzzleLogic(puzzle, currentPuzzleId);

  const formatTime = (seconds: number) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const styles = StyleSheet.create({
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24
    },
    container: {
      alignItems: 'center',
      backgroundColor: colors.blueBg,
      flex: 1,
      justifyContent: 'center'
    },
    nextButton: {
      marginTop: 24,
      width: '83%',
    },
    solvedButton: {
      backgroundColor: colors.active,
      borderColor: colors.active,
    },
    solvedButtonText: {
      color: colors.activeText
    },
    overlay: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    header: {
      fontSize: 36,
      color: colors.text,
    },
    row: {
      flexDirection: 'row'
    },
    solved: {
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderRadius: 8,
      color: colors.black,
      fontSize: 24,
      fontWeight: 'bold',
      padding: 12
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      position: 'relative',
      width: '100%'
    },
    bestScore: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      position: 'absolute',
      left: 12,
      bottom: 0,
    },
    timer: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '600'
    },
    difficultyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 12,
    },
    difficultyDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
  });

  const solvedButtonClass = isSolved ? styles.solvedButton : {};
  const solvedButtonTextClass = isSolved ? styles.solvedButtonText : {};
  
  if (loading || !puzzle) {
    return (
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>Loading levels...</Text>
        </SafeAreaView>
      );
  }

  const size = puzzle.size;
  const board: CellData[][] = Array.from({ length: size }, (_, rowIndex) =>
    Array.from({ length: size }, (_, colIndex) => {
      const key = `${rowIndex},${colIndex}`;
      const isPrefilled = key in puzzle.prefilled;
      const color = isPrefilled ? colors.preFilled : colors.blueBg;
      
      const constraintHints = getCellConstraints(rowIndex, colIndex);

      return {
        color,
        style: {
          width: cellSize,
          height: cellSize,
          borderWidth: 2,
          borderColor: colors.line,
          backgroundColor: color
        },
        value: getCellValue(rowIndex, colIndex),
        constraints: constraintHints,
        hasError: hasCellError(rowIndex, colIndex),
      };
    })
  );

  const difficultyColors = ['#4ade80', '#a3e635', '#facc15', '#fb923c', '#f87171', '#e879f9', '#818cf8'];
  const difficultyLabels = ['', 'Easy', 'Moderate', 'Medium', 'Challenging', 'Hard', 'Very Hard', 'Expert'];
  const difficulty = puzzle.difficulty ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>🌑/☀️</Text>
      <Text style={styles.title}>Tango #{currentPuzzleId}</Text>
      {difficulty > 0 && (
        <View style={styles.difficultyRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.difficultyDot,
                { backgroundColor: i < difficulty ? difficultyColors[difficulty - 1] : colors.inactive },
              ]}
            />
          ))}
          <Text style={[styles.bestScore, { position: 'relative', left: 0, bottom: 0, marginLeft: 6 }]}>
            {difficultyLabels[difficulty]}
          </Text>
        </View>
      )}
      <View style={styles.scoreContainer}>
        {bestScores[currentPuzzleId] && (
          <Text style={styles.bestScore}>🏆 {formatTime(bestScores[currentPuzzleId])}</Text>
        )}
        <Text style={styles.timer}>⏱️ {formatTime(elapsed)}</Text>
      </View>
      <PuzzleGrid 
        board={board}
        onCellPress={handleCellPress}
      />

      {isSolved && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.solved}>Puzzle solved!</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          label="↩️ Undo"
          onPress={undoLastMove}
          disabled={!canUndo}
        />
        <Button
          label="🔄 Reset"
          onPress={resetBoard}
        />
      </View>

      <Button
        containerStyle={[styles.nextButton, solvedButtonClass ]}
        textStyle={solvedButtonTextClass}
        label={isSolved ? '🎊 Next puzzle 🎊' : '← Previous puzzle'}
        onPress={isSolved ? goToNextPuzzle : goToPreviousPuzzle}
      />
    </SafeAreaView>
  );
};

export default PuzzleBoard;