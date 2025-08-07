import { useTangoStore } from '@/store/useTangoStore';
import { CellConstraint, CellCoordinate, CellValue, Constraint, Direction, Puzzle } from '@/types/tango';
import { useEffect, useMemo, useRef, useState } from 'react';

export function usePuzzleLogic(puzzle: Puzzle | undefined, puzzleId: number) {
  const { puzzlesState, toggleCell, undoLastMove, resetBoard, markPuzzleSolved } = useTangoStore();
  const puzzleState = puzzlesState[puzzleId];
  const boardState = puzzleState?.boardState || { cells: {}, moveHistory: [], isSolved: false };

  const [delayedErrors, setDelayedErrors] = useState<Set<string>>(new Set());
  const errorTimeouts = useRef<Map<string, number>>(new Map());

  const boardMatrix = useMemo(() => {
    if (!puzzle) return [];
    
    const matrix: (CellValue | undefined)[][] = [];
    for (let row = 0; row < puzzle.size; row++) {
      matrix[row] = [];
      for (let col = 0; col < puzzle.size; col++) {
        const coordinate: CellCoordinate = `${row},${col}`;
        matrix[row][col] = puzzle.prefilled[coordinate] || boardState.cells[coordinate];
      }
    }
    return matrix;
  }, [puzzle, boardState.cells]);

  const validateAdjacentCells = (row: number, col: number): boolean => {
    const value = boardMatrix[row][col];
    if (!value) return true;

    let horizontalCount = 1;
    for (let c = col - 1; c >= 0 && boardMatrix[row][c] === value; c--) {
      horizontalCount++;
    }
    for (let c = col + 1; c < puzzle!.size && boardMatrix[row][c] === value; c++) {
      horizontalCount++;
    }
    if (horizontalCount > 2) return false;

    let verticalCount = 1;
    for (let r = row - 1; r >= 0 && boardMatrix[r][col] === value; r--) {
      verticalCount++;
    }
    for (let r = row + 1; r < puzzle!.size && boardMatrix[r][col] === value; r++) {
      verticalCount++;
    }
    if (verticalCount > 2) return false;

    return true;
  };

  const validateRowColumnBalance = (): boolean => {
    if (!puzzle) return true;

    for (let row = 0; row < puzzle.size; row++) {
      let suns = 0;
      let moons = 0;
      
      for (let col = 0; col < puzzle.size; col++) {
        const value = boardMatrix[row][col];
        if (value === "☀️") suns++;
        else if (value === "🌑") moons++;
      }
      
      if (suns !== moons) return false;
    }

    for (let col = 0; col < puzzle.size; col++) {
      let suns = 0;
      let moons = 0;
      
      for (let row = 0; row < puzzle.size; row++) {
        const value = boardMatrix[row][col];
        if (value === "☀️") suns++;
        else if (value === "🌑") moons++;
      }
      
      if (suns !== moons) return false;
    }

    return true;
  };

  const validateConstraints = (): boolean => {
    if (!puzzle) return true;

    for (const constraint of puzzle.constraints) {
      const [coord1, coord2, constraintType] = constraint;
      const [row1, col1] = coord1.split(',').map(Number);
      const [row2, col2] = coord2.split(',').map(Number);

      const value1 = boardMatrix[row1][col1];
      const value2 = boardMatrix[row2][col2];

      if (!value1 || !value2) continue;

      if (constraintType === "=") {
        if (value1 !== value2) return false;
      } else if (constraintType === "x") {
        if (value1 === value2) return false;
      }
    }

    return true;
  };

  const validateBoard = (): { isValid: boolean; errors: string[] } => {
    if (!puzzle) return { isValid: true, errors: [] };

    const errors: string[] = [];

    for (let row = 0; row < puzzle.size; row++) {
      for (let col = 0; col < puzzle.size; col++) {
        if (!validateAdjacentCells(row, col)) {
          errors.push(`Too many consecutive ${boardMatrix[row][col]}s at row ${row + 1}, col ${col + 1}`);
        }
      }
    }

    if (!validateRowColumnBalance()) {
      errors.push("Rows and columns must have equal numbers of suns and moons");
    }

    if (!validateConstraints()) {
      errors.push("Constraint violations detected");
    }

    return { isValid: errors.length === 0, errors };
  };

  const isPuzzleComplete = useMemo(() => {
    if (!puzzle) return false;

    for (let row = 0; row < puzzle.size; row++) {
      for (let col = 0; col < puzzle.size; col++) {
        if (!boardMatrix[row][col]) return false;
      }
    }

    for (let row = 0; row < puzzle.size; row++) {
      for (let col = 0; col < puzzle.size; col++) {
        const value = boardMatrix[row][col];
        if (!value) continue;

        let horizontalCount = 1;
        for (let c = col - 1; c >= 0 && boardMatrix[row][c] === value; c--) {
          horizontalCount++;
        }
        for (let c = col + 1; c < puzzle.size && boardMatrix[row][c] === value; c++) {
          horizontalCount++;
        }
        if (horizontalCount > 2) return false;

        let verticalCount = 1;
        for (let r = row - 1; r >= 0 && boardMatrix[r][col] === value; r--) {
          verticalCount++;
        }
        for (let r = row + 1; r < puzzle.size && boardMatrix[r][col] === value; r++) {
          verticalCount++;
        }
        if (verticalCount > 2) return false;
      }
    }

    for (let row = 0; row < puzzle.size; row++) {
      let suns = 0, moons = 0;
      for (let col = 0; col < puzzle.size; col++) {
        const value = boardMatrix[row][col];
        if (value === "☀️") suns++;
        else if (value === "🌑") moons++;
      }
      if (suns !== moons) return false;
    }

    for (let col = 0; col < puzzle.size; col++) {
      let suns = 0, moons = 0;
      for (let row = 0; row < puzzle.size; row++) {
        const value = boardMatrix[row][col];
        if (value === "☀️") suns++;
        else if (value === "🌑") moons++;
      }
      if (suns !== moons) return false;
    }

    for (const constraint of puzzle.constraints) {
      const [coord1, coord2, constraintType] = constraint;
      const [row1, col1] = coord1.split(',').map(Number);
      const [row2, col2] = coord2.split(',').map(Number);

      const value1 = boardMatrix[row1][col1];
      const value2 = boardMatrix[row2][col2];

      if (!value1 || !value2) continue;

      if (constraintType === "=" && value1 !== value2) return false;
      if (constraintType === "x" && value1 === value2) return false;
    }

    return true;
  }, [puzzle, boardMatrix]);

  useEffect(() => {
    if (isPuzzleComplete && puzzleState && !puzzleState.isSolved) {
      markPuzzleSolved(puzzleId);
    }
  }, [isPuzzleComplete, puzzleState, markPuzzleSolved, puzzleId]);

  const handleCellPress = (row: number, col: number) => {
    if (!puzzle) return;
    
    const coordinate: CellCoordinate = `${row},${col}`;
    
    if (coordinate in puzzle.prefilled) return;
    
    if (puzzleState?.isSolved) return;

    toggleCell(puzzleId, row, col);
  };

  const getCellValue = (row: number, col: number): CellValue | undefined => {
    if (!puzzle) return undefined;
    
    const coordinate: CellCoordinate = `${row},${col}`;
    return puzzle.prefilled[coordinate] || boardState.cells[coordinate];
  };

  const getCellConstraints = (row: number, col: number): CellConstraint[] => {
    if (!puzzle) return [];
    
    const coordinate: CellCoordinate = `${row},${col}`;
    const constraints = puzzle.constraints.filter((constraint: Constraint) => {
      return constraint[0] === coordinate || constraint[1] === coordinate;
    });

    if (constraints.length === 0) return [];
    
    // For each constraint, determine if THIS cell should display it
    const constraintsToShow = constraints.filter(constraint => {
      const [cell1Row, cell1Col] = constraint[0].split(',').map(Number);
      const [cell2Row, cell2Col] = constraint[1].split(',').map(Number);
      
      let displayCell: CellCoordinate;
      
      if (cell1Row === cell2Row) {
        // Horizontal constraint - display on the leftmost cell
        displayCell = cell1Col < cell2Col ? constraint[0] : constraint[1];
      } else {
        // Vertical constraint - display on the topmost cell
        displayCell = cell1Row < cell2Row ? constraint[0] : constraint[1];
      }
      
      // Only show constraint if this cell is the designated display cell
      return coordinate === displayCell;
    });
    
    // Convert to CellConstraint format
    return constraintsToShow.map(constraint => {
      const [cell1Row, cell1Col] = constraint[0].split(',').map(Number);
      const [cell2Row, cell2Col] = constraint[1].split(',').map(Number);
      const direction: Direction = cell1Row === cell2Row ? 'right' : 'down';
      
      return {
        direction,
        value: constraint[2]
      };
    });
  };

  const immediateErrors = useMemo(() => {
    if (!puzzle) return new Set<string>();
    
    const errors = new Set<string>();
    const checkAdjacentCells = (row: number, col: number): boolean => {
      const value = boardMatrix[row][col];
      if (!value) return true;

      let horizontalCount = 1;
      for (let c = col - 1; c >= 0 && boardMatrix[row][c] === value; c--) {
        horizontalCount++;
      }
      for (let c = col + 1; c < puzzle.size && boardMatrix[row][c] === value; c++) {
        horizontalCount++;
      }
      if (horizontalCount > 2) return false;

      let verticalCount = 1;
      for (let r = row - 1; r >= 0 && boardMatrix[r][col] === value; r--) {
        verticalCount++;
      }
      for (let r = row + 1; r < puzzle.size && boardMatrix[r][col] === value; r++) {
        verticalCount++;
      }
      if (verticalCount > 2) return false;

      return true;
    };

    for (let row = 0; row < puzzle.size; row++) {
      for (let col = 0; col < puzzle.size; col++) {
        const coordinate: CellCoordinate = `${row},${col}`;
        const value = boardMatrix[row][col];
        
        if (!value) continue;
        
        const rowComplete = boardMatrix[row].every(cell => cell !== undefined);
        const colComplete = boardMatrix.every(rowArray => rowArray[col] !== undefined);

        if (rowComplete || colComplete) {
          if (!checkAdjacentCells(row, col)) {
            errors.add(coordinate);
          }

          if (rowComplete) {
            const suns = boardMatrix[row].filter(cell => cell === "☀️").length;
            const moons = boardMatrix[row].filter(cell => cell === "🌑").length;
            if (suns !== moons) {
              for (let c = 0; c < puzzle.size; c++) {
                if (boardMatrix[row][c]) {
                  errors.add(`${row},${c}`);
                }
              }
            }
          }

          if (colComplete) {
            const suns = boardMatrix.map(rowArray => rowArray[col]).filter(cell => cell === "☀️").length;
            const moons = boardMatrix.map(rowArray => rowArray[col]).filter(cell => cell === "🌑").length;
            if (suns !== moons) {
              for (let r = 0; r < puzzle.size; r++) {
                if (boardMatrix[r][col]) {
                  errors.add(`${r},${col}`);
                }
              }
            }
          }

          for (const constraint of puzzle.constraints) {
            const [coord1, coord2, constraintType] = constraint;
            const [row1, col1] = coord1.split(',').map(Number);
            const [row2, col2] = coord2.split(',').map(Number);

            const value1 = boardMatrix[row1][col1];
            const value2 = boardMatrix[row2][col2];

            if (value1 && value2) {
              if (constraintType === "=" && value1 !== value2) {
                errors.add(coord1);
                errors.add(coord2);
              } else if (constraintType === "x" && value1 === value2) {
                errors.add(coord1);
                errors.add(coord2);
              }
            }
          }
        }
      }
    }

    return errors;
  }, [puzzle, boardMatrix]);

  useEffect(() => {
    const currentTimeouts = errorTimeouts.current;
    
    currentTimeouts.forEach((timeout, coordinate) => {
      if (!immediateErrors.has(coordinate)) {
        clearTimeout(timeout);
        currentTimeouts.delete(coordinate);
      }
    });

    setDelayedErrors(prev => {
      const next = new Set<string>();
      prev.forEach(coordinate => {
        if (immediateErrors.has(coordinate)) {
          next.add(coordinate);
        }
      });
      return next;
    });

    immediateErrors.forEach(coordinate => {
      if (!currentTimeouts.has(coordinate)) {
        setDelayedErrors(prev => {
          if (prev.has(coordinate)) {
            return prev;
          }
          
          const timeout = setTimeout(() => {
            setDelayedErrors(current => new Set(current).add(coordinate));
            currentTimeouts.delete(coordinate);
          }, 2000);
          currentTimeouts.set(coordinate, timeout);
          
          return prev;
        });
      }
    });

    return () => {
      currentTimeouts.forEach(timeout => clearTimeout(timeout));
      currentTimeouts.clear();
    };
  }, [immediateErrors]);

  const getCellErrors = delayedErrors;

  const hasCellError = (row: number, col: number): boolean => {
    const coordinate: CellCoordinate = `${row},${col}`;
    return getCellErrors.has(coordinate);
  };

  return {
    boardMatrix,
    boardState,
    handleCellPress,
    getCellValue,
    getCellConstraints,
    undoLastMove: () => undoLastMove(puzzleId),
    resetBoard: () => resetBoard(puzzleId),
    validateBoard,
    isPuzzleComplete,
    canUndo: boardState.moveHistory.length > 0,
    hasCellError,
  };
} 