import { Colors } from '@/constants/Colors';
import { PuzzleCellProps } from '@/types/tango';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export const PuzzleCell = ({ 
  value, 
  style, 
  onPress 
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cellValue: {
    fontWeight: 'bold',
    color: Colors.text,
  },
});