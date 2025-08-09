import { useTheme } from '@/hooks/useTheme';
import { ConstraintTextProps } from '@/types/tango';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

export const ConstraintText = ({
  constraints,
  row,
  col,
  cellWidth,
  cellHeight,
  constraintFontSize,
  constraintHeightWidth,
}: ConstraintTextProps) => {
  const { colors } = useTheme();
  
  if (!constraints || constraints.length === 0) return null;

  const styles = StyleSheet.create({
    constraint: {
      position: 'absolute',
      color: colors.text,
      backgroundColor: colors.blueBg,
      zIndex: 999,
      elevation: 10,
      textAlign: 'center',
    },
  });

  return (
    <>
      {constraints.map((constraint, index) => {
        if (!constraint) return null;

        const dynamicStyle = {
          fontSize: constraintFontSize,
          height: constraintHeightWidth,
          width: constraintHeightWidth,
        };

        if (constraint.direction === 'down') {
          const positionStyle = {
            top: (row + 1) * cellHeight - constraintHeightWidth / 2,
            left: col * cellWidth + cellWidth / 2 - constraintHeightWidth / 2,
          };
          
          return (
            <Text key={`constraint-${index}`} style={[styles.constraint, dynamicStyle, positionStyle]}>
              {constraint.value}
            </Text>
          );
        } else if (constraint.direction === 'right') {
          const positionStyle = {
            top: row * cellHeight + cellHeight / 2 - constraintHeightWidth / 2,
            left: (col + 1) * cellWidth - constraintHeightWidth / 2,
          };
          
          return (
            <Text key={`constraint-${index}`} style={[styles.constraint, dynamicStyle, positionStyle]}>
              {constraint.value}
            </Text>
          );
        }

        return null;
      })}
    </>
  );
};