import { useTheme } from '@/hooks/useTheme';
import { ConstraintItem, PuzzleGridProps } from '@/types/tango';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ConstraintText } from './ConstraintText';
import { PuzzleCell } from './PuzzleCell';

export const PuzzleGrid = ({ board, onCellPress }: PuzzleGridProps) => {
  const { colors } = useTheme();
  const cellWidth = typeof board[0]?.[0]?.style?.width === 'number' ? board[0][0].style.width : 50;
  const cellHeight = typeof board[0]?.[0]?.style?.height === 'number' ? board[0][0].style.height : 50;
  const cellSize = Math.min(cellWidth, cellHeight);
  const constraintFontSize = Math.max(8, cellSize * 0.3);
  const constraintHeightWidth = Math.max(20, cellSize * 0.35);
  
  const constraints: ConstraintItem[] = [];
  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell.constraints && cell.constraints.length > 0) {
        constraints.push({
          constraints: cell.constraints,
          row: rowIndex,
          col: colIndex,
          cellWidth,
          cellHeight,
        });
      }
    });
  });

  const styles = StyleSheet.create({
    gridContainer: {
      borderWidth: 2,
      borderColor: colors.line,
      overflow: 'visible',
    },
    row: {
      flexDirection: 'row',
      overflow: 'visible',
    },
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
          constraints={item.constraints}
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