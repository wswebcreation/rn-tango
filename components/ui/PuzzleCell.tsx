import { Colors } from '@/constants/Colors';
import { PuzzleCellProps } from '@/types/tango';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const PuzzleCell = ({ 
  value, 
  style, 
  onPress,
  hasError = false
}: PuzzleCellProps) => {
  const cellWidth = typeof style.width === 'number' ? style.width : 50;
  const cellHeight = typeof style.height === 'number' ? style.height : 50;
  const cellSize = Math.min(cellWidth, cellHeight);  
  const valueFontSize = Math.max(12, cellSize * 0.5);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'visible',
        },
        style
      ]}
    >
      {value && (
        <Text style={[styles.cellValue, { fontSize: valueFontSize }]}>
          {value}
        </Text>
      )}
      
      {hasError && (
        <View style={[styles.errorOverlay, { width: cellWidth, height: cellHeight }]}>
          <View style={[styles.diagonalLine, styles.diagonalTopLeftToBottomRight, { width: (cellWidth - 8) * 1.4 }]} />
          <View style={[styles.diagonalLine, styles.diagonalTopRightToBottomLeft, { width: (cellWidth - 8) * 1.4 }]} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cellValue: {
    color: Colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagonalLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: Colors.error,
    top: '50%',
    left: '50%',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
  },
  diagonalTopLeftToBottomRight: {
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }, { rotate: '45deg' }],
  },
  diagonalTopRightToBottomLeft: {
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }, { rotate: '-45deg' }],
  },
});