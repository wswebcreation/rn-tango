import { Colors } from '@/constants/Colors';
import { CellConstraint, CellValue } from '@/types/tango';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

type PuzzleCellProps = {
  row: number;
  col: number;
  value: CellValue | undefined;
  color: string;
  style: ViewStyle;
  constraint: CellConstraint;
  onPress: () => void;
};

export const PuzzleCell = ({ 
  value, 
  color, 
  style, 
  constraint, 
  onPress 
}: PuzzleCellProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        style
      ]}
    >
      {value && <Text style={styles.cellValue}>{value}</Text>}
      {constraint && (
        <Text style={styles.constraintText}>
          {constraint.direction} {constraint.value}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cellValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  constraintText: {
    fontSize: 12,
    color: Colors.text,
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
});