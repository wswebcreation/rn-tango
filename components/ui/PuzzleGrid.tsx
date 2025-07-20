import { Colors } from '@/constants/Colors';
import { CellData } from '@/types/tango';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PuzzleCell } from './PuzzleCell';

type PuzzleGridProps = {
  board: CellData[][];
  onCellPress: (row: number, col: number) => void;
};

export const PuzzleGrid = ({ board, onCellPress }: PuzzleGridProps) => {
  return (
    <View style={styles.gridContainer}>
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((cell, colIndex) => (
            <PuzzleCell
              key={`${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              value={cell.value}
              color={cell.color}
              style={cell.style}
              constraint={cell.constraint}
              onPress={() => onCellPress(rowIndex, colIndex)}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    borderWidth: 2,
    borderColor: Colors.line,
  },
  row: {
    flexDirection: 'row',
  },
});