import { Colors } from '@/constants/Colors';
import { ConstraintItem, PuzzleGridProps } from '@/types/tango';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ConstraintText } from './ConstraintText';
import { PuzzleCell } from './PuzzleCell';

export const PuzzleGrid = ({ board, onCellPress }: PuzzleGridProps) => {
  const cellWidth = typeof board[0]?.[0]?.style?.width === 'number' ? board[0][0].style.width : 50;
  const cellHeight = typeof board[0]?.[0]?.style?.height === 'number' ? board[0][0].style.height : 50;
  const cellSize = Math.min(cellWidth, cellHeight);
  const constraintFontSize = Math.max(8, cellSize * 0.3);
  const constraintHeightWidth = Math.max(20, cellSize * 0.35);
  
  const constraints: ConstraintItem[] = [];
  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell.constraint) {
        constraints.push({
          constraint: cell.constraint,
          row: rowIndex,
          col: colIndex,
          cellWidth,
          cellHeight,
        });
      }
    });
  });

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
              style={cell.style}
              onPress={() => onCellPress(rowIndex, colIndex)}
              hasError={cell.hasError}
            />
          ))}
        </View>
      ))}
      
      {constraints.map((item, index) => (
        <ConstraintText
          key={`constraint-${index}`}
          constraint={item.constraint}
          row={item.row}
          col={item.col}
          cellWidth={item.cellWidth}
          cellHeight={item.cellHeight}
          constraintFontSize={constraintFontSize}
          constraintHeightWidth={constraintHeightWidth}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    borderWidth: 2,
    borderColor: Colors.line,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    overflow: 'visible',
  },
});