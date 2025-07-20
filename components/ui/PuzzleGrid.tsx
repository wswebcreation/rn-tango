import React, { useRef } from 'react';
import { View } from 'react-native';
import { PuzzleCell } from './PuzzleCell';

export type CellMeta = {
  color: string;
  style: any;
};

type PuzzleGridProps = {
  board: any;
  cellStates: any;
  onCellPress: (row: number, col: number) => void;
  isSolved: boolean;
  regionErrors?: Set<string>;
};

export const PuzzleGrid = ({ board, cellStates, onCellPress, isSolved, regionErrors }: PuzzleGridProps) => {
  const gridRef = useRef<View>(null);

  return (
      <View ref={gridRef}>
        {board.map((row:any, rowIndex:any) => (
          <View key={rowIndex} style={{ flexDirection: 'row' }}>
            {row.map((cell:any, colIndex:any) => {
              const key = `${rowIndex},${colIndex}`;
              const hasError = regionErrors?.has(key) ?? false;
              
              return (
                <PuzzleCell
                  key={key}
                  row={rowIndex}
                  col={colIndex}
                  state={cellStates[key] ?? ''}
                  color={cell.color}
                  borderStyle={cell.style}
                  hasError={hasError}
                  onPress={() => {
                    if (!isSolved) {
                      onCellPress(rowIndex, colIndex);
                    }
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
  );
};