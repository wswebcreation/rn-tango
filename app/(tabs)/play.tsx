import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { useQueensStore } from '@/store/useQueensStore';
import { PuzzleGrid } from '@/components/ui/PuzzleGrid';
import { Colors } from '@/constants/Colors';
// import { usePuzzleLogic } from '@/hooks/usePuzzleLogic';
import { usePuzzle } from '@/hooks/usePuzzle';
// import { usePuzzleSolvedStatus } from '@/hooks/usePuzzleSolvedStatus';
// import { usePuzzleTimer } from '@/hooks/usePuzzleTimer';

import { Button } from '@/components/ui/Button';
import { CellData, Constraint, Direction } from '@/types/tango';

const PuzzleBoard = () => {
  // const {
  //   clearBoard,
  //   currentPuzzleId,
  //   goToNextPuzzle,
  //   goToPreviousPuzzle,
  //   puzzlesState,
  //   undoLastMove
  // } = useQueensStore();
  const goToNextPuzzle = () => {};
  const goToPreviousPuzzle = () => { };
  const toggleCell = () => { };
  // const { puzzle, loading } = usePuzzle(currentPuzzleId);
  const { puzzle, loading } = usePuzzle(1);
  const screenWidth = Dimensions.get('window').width;
  const padding = 10;
  const boardSize = puzzle?.size ?? 8;
  const cellSize = Math.floor((screenWidth - padding * 2) / boardSize);
  // const isSolved = puzzlesState[currentPuzzleId]?.isSolved ?? false;
  const isSolved = false;
  // const { toggleCell, swipeCell, startSwipeBatch, endSwipeBatch, cellStates, regionErrors } = usePuzzleLogic(puzzle, currentPuzzleId);
  // const elapsed = usePuzzleTimer(currentPuzzleId, isSolved);
  // usePuzzleSolvedStatus(puzzle, isSolved);

  const formatTime = (seconds: number) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  // const solvedButtonClass = isSolved ? styles.solvedButton : {};
  const solvedButtonClass = {};
  // const solvedButtonTextClass = isSolved ? styles.solvedButtonText : {};
  const solvedButtonTextClass = {};
  
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
      const color = isPrefilled ? Colors.preFilled : Colors.blueBg;
      
      const constraintHint = (() => {
        const constraint = puzzle.constraints.find((constraint: Constraint) => {
          return constraint[0] === key;
        });

        if (!constraint) return null;
        
        const [cell1Row] = constraint[0].split(',').map(Number);
        const [cell2Row] = constraint[1].split(',').map(Number);
        const direction: Direction = cell1Row === cell2Row ? 'right' : 'down';
        
        return {
          direction,
          value: constraint[2]
        };
      })();

      return {
        color,
        style: {
          width: cellSize,
          height: cellSize,
          borderWidth: 2,
          borderColor: Colors.line,
          backgroundColor: color
        },
        value: puzzle.prefilled[`${rowIndex},${colIndex}`],
        constraint: constraintHint
      };
    })
  );

  const handleCellPress = (row: number, col: number) => {
    // Handle cell press logic here
    console.log(`Cell pressed: ${row}, ${col}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>🌑/☀️</Text>
      <Text style={styles.title}>Tango #{/*currentPuzzleId*/}</Text>
      <Text style={styles.timer}>⏱️ {/*formatTime(elapsed)*/}</Text>

      <PuzzleGrid 
        board={board}
        onCellPress={handleCellPress}
      />

      {/* {isSolved && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.solved}>Puzzle solved!</Text>
        </View>
      )} */}

      <View style={styles.buttonContainer}>
        <Button
          label="↩️ Undo"
          onPress={() => {
            // undoLastMove(puzzle.id);
          }}
        />
        <Button
          label="🔄 Reset"
          onPress={() => {
            // clearBoard(puzzle.id);
          }}
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

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24
  },
  container: {
    alignItems: 'center',
    backgroundColor: Colors.blueBg,
    flex: 1,
    justifyContent: 'center'
  },
  nextButton: {
    marginTop: 24,
    width: '83%',
  },
  solvedButton: {
    backgroundColor: Colors.active,
    borderColor: Colors.active,
  },
  solvedButtonText: {
    color: Colors.white
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  header: {
    fontSize: 36,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row'
  },
  solved: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    color: Colors.black,
    fontSize: 24,
    fontWeight: 'bold',
    padding: 12
  },
  timer: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16
  },
});

export default PuzzleBoard;