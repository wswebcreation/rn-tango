import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, View } from 'react-native';
import { CellState } from '@/store/useQueensStore';
import { Colors } from '@/constants/Colors';

type PuzzleCellProps = {
  row: number;
  col: number;
  state: CellState;
  color: string;
  borderStyle: ViewStyle;
  hasError: boolean;
  onPress: () => void;
};

export const PuzzleCell = ({ state, color, borderStyle, hasError, onPress }: PuzzleCellProps) => {
  const errorStyle = hasError && state === 'Q' ? {
    borderColor: '#FF0000',
    borderWidth: 3,
  } : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: color,
        ...borderStyle,
        ...errorStyle,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {hasError && state === 'Q' && (
        <>
          {/* Red diagonal lines */}
          <View style={[styles.diagonal, styles.diagonalTopLeft]} />
          <View style={[styles.diagonal, styles.diagonalTopRight]} />
          {/* Red transparent overlay */}
          <View style={styles.errorOverlay} />
        </>
      )}
      {state === 'Q' && <Text style={[styles.queen, hasError && styles.errorQueen]}>👑</Text>}
      {state === 'X' && <Text style={styles.x}>✕</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  queen: {
    fontSize: 24,
    zIndex: 2,
  },
  errorQueen: {
  },
  x: {
    fontSize: 12,
    color: Colors.black,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    zIndex: 1,
  },
  diagonal: {
    position: 'absolute',
    backgroundColor: '#FF0000',
    zIndex: 1,
  },
  diagonalTopLeft: {
    width: '141%', // sqrt(2) * 100% to cover diagonal
    height: 2,
    top: '50%',
    left: '50%',
    transform: [
      { translateX: '-50%' },
      { translateY: -1 },
      { rotate: '45deg' },
    ],
  },
  diagonalTopRight: {
    width: '141%', // sqrt(2) * 100% to cover diagonal
    height: 2,
    top: '50%',
    left: '50%',
    transform: [
      { translateX: '-50%' },
      { translateY: -1 },
      { rotate: '-45deg' },
    ],
  },
});