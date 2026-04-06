import { CellCoordinate, CellValue, PrefilledData, Puzzle } from "../types/shared-types";

export interface ValidationResult {
    success: boolean;
    puzzle?: Puzzle;
    error?: string;
    details?: string[];
}

export function reducePrefilledToUniqueSolution(puzzle: Puzzle, minClues: number = 4): PrefilledData {
    const clues: PrefilledData = { ...puzzle.prefilled };
    const coordinates = Object.keys(clues).sort();

    for (const coordinate of coordinates) {
        if (Object.keys(clues).length <= minClues) break;

        const original = clues[coordinate as CellCoordinate];
        delete clues[coordinate as CellCoordinate];

        const trialPuzzle: Puzzle = {
            ...puzzle,
            prefilled: { ...clues }
        };
        const board = createBoardMatrix(trialPuzzle);
        const solutionCount = countSolutions(board, trialPuzzle, 2);

        if (solutionCount !== 1) {
            clues[coordinate as CellCoordinate] = original;
        }
    }

    const finalPuzzle: Puzzle = { ...puzzle, prefilled: clues };
    const finalBoard = createBoardMatrix(finalPuzzle);
    const finalSolutions = countSolutions(finalBoard, finalPuzzle, 2);
    if (finalSolutions !== 1) {
        throw new Error(`Could not derive unique-solution prefilled clues (found ${finalSolutions} solutions)`);
    }

    return clues;
}

export function buildUniquePuzzleFromConstraints(puzzle: Puzzle): Puzzle {
    const baseFromConstraints: Puzzle = { ...puzzle, prefilled: {} };
    let solvedBoard = findOneSolution(createBoardMatrix(baseFromConstraints), baseFromConstraints);
    let constraints = puzzle.constraints;

    // If detected constraints are contradictory, fall back to unconstrained Tango rules.
    if (!solvedBoard) {
        const unconstrained: Puzzle = { ...puzzle, constraints: [], prefilled: {} };
        solvedBoard = findOneSolution(createBoardMatrix(unconstrained), unconstrained);
        constraints = [];
    }

    if (!solvedBoard) {
        throw new Error('Unable to build a valid solved board');
    }

    const fullPrefilled: PrefilledData = {};
    for (let row = 0; row < puzzle.size; row++) {
        for (let col = 0; col < puzzle.size; col++) {
            fullPrefilled[`${row},${col}` as CellCoordinate] = solvedBoard[row][col] as CellValue;
        }
    }

    // If we had to drop constraints, add full adjacency constraints from the solved board.
    if (constraints.length === 0) {
        constraints = deriveAllAdjacencyConstraintsFromBoard(solvedBoard);
    }

    const reducedPrefilled = reducePrefilledToUniqueSolution(
        { ...puzzle, constraints, prefilled: fullPrefilled },
        6
    );

    return {
        ...puzzle,
        constraints,
        prefilled: reducedPrefilled,
    };
}

export function buildAndValidateTangoPuzzle(parsedPuzzle: Puzzle): ValidationResult {
    console.log(`🔍 Validating Tango puzzle ${parsedPuzzle.id}...`);
    
    try {
        // Create board matrix with prefilled cells
        const boardMatrix = createBoardMatrix(parsedPuzzle);
        
        // Validate the puzzle structure and rules
        validatePuzzleStructure(parsedPuzzle);
        validatePrefilledCells(parsedPuzzle, boardMatrix);
        validateConstraints(parsedPuzzle, boardMatrix);
        validatePuzzleSolvability(parsedPuzzle, boardMatrix);
        
        console.log(`✅ Puzzle ${parsedPuzzle.id} validation passed!`);
        return {
            success: true,
            puzzle: parsedPuzzle
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`❌ Puzzle ${parsedPuzzle.id} validation failed: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage,
            details: errorMessage.split('\n').filter(line => line.trim())
        };
    }
}

/**
 * Create a board matrix from the puzzle, filled with prefilled cells
 */
function createBoardMatrix(puzzle: Puzzle): (CellValue | undefined)[][] {
    const matrix: (CellValue | undefined)[][] = [];
    
    for (let row = 0; row < puzzle.size; row++) {
        matrix[row] = [];
        for (let col = 0; col < puzzle.size; col++) {
            const coordinate: CellCoordinate = `${row},${col}`;
            matrix[row][col] = puzzle.prefilled[coordinate];
        }
    }
    
    return matrix;
}

/**
 * Validate basic puzzle structure
 */
function validatePuzzleStructure(puzzle: Puzzle): void {
    if (!puzzle.id || puzzle.id <= 0) {
        throw new Error(`Invalid puzzle ID: ${puzzle.id}`);
    }
    
    if (!puzzle.size || puzzle.size <= 0 || puzzle.size % 2 !== 0) {
        throw new Error(`Invalid puzzle size: ${puzzle.size}. Size must be positive and even.`);
    }
    
    if (!puzzle.prefilled) {
        throw new Error("Puzzle must have prefilled data");
    }
    
    if (!puzzle.constraints) {
        throw new Error("Puzzle must have constraints");
    }
    
    console.log(`📐 Puzzle structure valid: ${puzzle.size}x${puzzle.size} grid`);
}

/**
 * Validate that prefilled cells don't violate adjacent cell rules
 */
function validatePrefilledCells(puzzle: Puzzle, boardMatrix: (CellValue | undefined)[][]): void {
    const violations: string[] = [];
    
    for (let row = 0; row < puzzle.size; row++) {
        for (let col = 0; col < puzzle.size; col++) {
            const value = boardMatrix[row][col];
            if (!value) continue;
            
            if (!validateAdjacentCells(boardMatrix, row, col, puzzle.size)) {
                violations.push(`Prefilled cell at (${row},${col}) violates adjacent cell rule`);
            }
        }
    }
    
    if (violations.length > 0) {
        console.log(`🚨 Prefilled cells: ${JSON.stringify(puzzle.prefilled, null, 2)}`);
        throw new Error(`Prefilled cells validation failed:\n${violations.join('\n')}`);
    }
    
    console.log(`🎯 Prefilled cells valid: ${Object.keys(puzzle.prefilled).length} cells`);
}

/**
 * Check if a cell and its neighbors violate the "no more than 2 consecutive" rule
 */
function validateAdjacentCells(boardMatrix: (CellValue | undefined)[][], row: number, col: number, size: number): boolean {
    const value = boardMatrix[row][col];
    if (!value) return true;

    // Check horizontal consecutiveness
    let horizontalCount = 1;
    // Count left
    for (let c = col - 1; c >= 0 && boardMatrix[row][c] === value; c--) {
        horizontalCount++;
    }
    // Count right
    for (let c = col + 1; c < size && boardMatrix[row][c] === value; c++) {
        horizontalCount++;
    }
    if (horizontalCount > 2) return false;

    // Check vertical consecutiveness
    let verticalCount = 1;
    // Count up
    for (let r = row - 1; r >= 0 && boardMatrix[r][col] === value; r--) {
        verticalCount++;
    }
    // Count down
    for (let r = row + 1; r < size && boardMatrix[r][col] === value; r++) {
        verticalCount++;
    }
    if (verticalCount > 2) return false;

    return true;
}

/**
 * Validate that constraints are consistent with prefilled cells
 */
function validateConstraints(puzzle: Puzzle, boardMatrix: (CellValue | undefined)[][]): void {
    const violations: string[] = [];
    
    for (const constraint of puzzle.constraints) {
        const [fromCoord, toCoord, constraintType] = constraint;
        
        // Parse coordinates
        const [fromRow, fromCol] = fromCoord.split(',').map(Number);
        const [toRow, toCol] = toCoord.split(',').map(Number);
        
        // Validate coordinate bounds
        if (!isValidCoordinate(fromRow, fromCol, puzzle.size) || !isValidCoordinate(toRow, toCol, puzzle.size)) {
            violations.push(`Invalid constraint coordinates: ${fromCoord} -> ${toCoord}`);
            continue;
        }
        
        // Check if both cells are prefilled
        const fromValue = boardMatrix[fromRow][fromCol];
        const toValue = boardMatrix[toRow][toCol];
        
        if (fromValue && toValue) {
            // Both cells are prefilled, check if constraint is satisfied
            const isEqual = fromValue === toValue;
            const shouldBeEqual = constraintType === "=";
            
            if (isEqual !== shouldBeEqual) {
                violations.push(`Constraint violation: ${fromCoord}(${fromValue}) ${constraintType} ${toCoord}(${toValue})`);
            }
        }
    }
    
    if (violations.length > 0) {
        throw new Error(`Constraint validation failed:\n${violations.join('\n')}`);
    }
    
    console.log(`🔗 Constraints valid: ${puzzle.constraints.length} constraints`);
}

/**
 * Check if coordinates are valid for the given puzzle size
 */
function isValidCoordinate(row: number, col: number, size: number): boolean {
    return row >= 0 && row < size && col >= 0 && col < size;
}

/**
 * Validate that the puzzle has potential for a unique solution
 */
function validatePuzzleSolvability(puzzle: Puzzle, boardMatrix: (CellValue | undefined)[][]): void {
    // Check if rows/columns already violate balance constraints
    const expectedCount = puzzle.size / 2;
    
    for (let row = 0; row < puzzle.size; row++) {
        let sunCount = 0, moonCount = 0;
        
        for (let col = 0; col < puzzle.size; col++) {
            const value = boardMatrix[row][col];
            if (value === "☀️") sunCount++;
            else if (value === "🌑") moonCount++;
        }
        
        // Check if any row already exceeds the maximum allowed
        if (sunCount > expectedCount || moonCount > expectedCount) {
            throw new Error(`Row ${row} has too many prefilled cells: ${sunCount} suns, ${moonCount} moons (max ${expectedCount} each)`);
        }
    }
    
    for (let col = 0; col < puzzle.size; col++) {
        let sunCount = 0, moonCount = 0;
        
        for (let row = 0; row < puzzle.size; row++) {
            const value = boardMatrix[row][col];
            if (value === "☀️") sunCount++;
            else if (value === "🌑") moonCount++;
        }
        
        // Check if any column already exceeds the maximum allowed
        if (sunCount > expectedCount || moonCount > expectedCount) {
            throw new Error(`Column ${col} has too many prefilled cells: ${sunCount} suns, ${moonCount} moons (max ${expectedCount} each)`);
        }
    }
    
    // Basic solvability check: ensure we don't have conflicting constraints
    validateConstraintConsistency(puzzle);
    validateUniqueSolution(puzzle, boardMatrix);
    
    console.log(`🧩 Puzzle solvability validated: balanced prefilled distribution and unique solution`);
}

/**
 * Check for constraint conflicts (e.g., A=B and A≠B)
 */
function validateConstraintConsistency(puzzle: Puzzle): void {
    const equalityMap = new Map<string, Set<string>>();
    const inequalityMap = new Map<string, Set<string>>();
    
    // Build constraint maps
    for (const [fromCoord, toCoord, constraintType] of puzzle.constraints) {
        if (constraintType === "=") {
            if (!equalityMap.has(fromCoord)) equalityMap.set(fromCoord, new Set());
            if (!equalityMap.has(toCoord)) equalityMap.set(toCoord, new Set());
            equalityMap.get(fromCoord)!.add(toCoord);
            equalityMap.get(toCoord)!.add(fromCoord);
        } else if (constraintType === "x") {
            if (!inequalityMap.has(fromCoord)) inequalityMap.set(fromCoord, new Set());
            if (!inequalityMap.has(toCoord)) inequalityMap.set(toCoord, new Set());
            inequalityMap.get(fromCoord)!.add(toCoord);
            inequalityMap.get(toCoord)!.add(fromCoord);
        }
    }
    
    // Check for direct conflicts (A=B and A≠B)
    for (const [coord, equalCells] of equalityMap) {
        const inequalCells = inequalityMap.get(coord) || new Set();
        
        for (const equalCell of equalCells) {
            if (inequalCells.has(equalCell)) {
                throw new Error(`Constraint conflict: ${coord} cannot be both equal and unequal to ${equalCell}`);
            }
        }
    }
    
    console.log(`🔄 Constraint consistency validated: no conflicts detected`);
}

function validateUniqueSolution(puzzle: Puzzle, boardMatrix: (CellValue | undefined)[][]): void {
    const working = boardMatrix.map(row => [...row]);
    const solutions = countSolutions(working, puzzle, 2);

    if (solutions !== 1) {
        throw new Error(`Puzzle does not have exactly one solution (found ${solutions})`);
    }
}

function countSolutions(
    board: (CellValue | undefined)[][],
    puzzle: Puzzle,
    limit: number
): number {
    const next = findNextEmptyCell(board, puzzle.size);
    if (!next) {
        return isCompleteBoardValid(board, puzzle) ? 1 : 0;
    }

    let total = 0;
    for (const candidate of ["☀️", "🌑"] as CellValue[]) {
        if (!isPlacementValid(board, puzzle, next.row, next.col, candidate)) continue;
        board[next.row][next.col] = candidate;
        total += countSolutions(board, puzzle, limit);
        board[next.row][next.col] = undefined;
        if (total >= limit) return total;
    }
    return total;
}

function findOneSolution(
    board: (CellValue | undefined)[][],
    puzzle: Puzzle
): (CellValue | undefined)[][] | null {
    const next = findNextEmptyCell(board, puzzle.size);
    if (!next) {
        return isCompleteBoardValid(board, puzzle) ? board.map(r => [...r]) : null;
    }

    for (const candidate of ["☀️", "🌑"] as CellValue[]) {
        if (!isPlacementValid(board, puzzle, next.row, next.col, candidate)) continue;
        board[next.row][next.col] = candidate;
        const solved = findOneSolution(board, puzzle);
        if (solved) return solved;
        board[next.row][next.col] = undefined;
    }
    return null;
}

function findNextEmptyCell(
    board: (CellValue | undefined)[][],
    size: number
): { row: number; col: number } | null {
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (!board[row][col]) return { row, col };
        }
    }
    return null;
}

function isPlacementValid(
    board: (CellValue | undefined)[][],
    puzzle: Puzzle,
    row: number,
    col: number,
    value: CellValue
): boolean {
    board[row][col] = value;
    const size = puzzle.size;
    const expectedCount = size / 2;

    let rowSun = 0;
    let rowMoon = 0;
    for (let c = 0; c < size; c++) {
        if (board[row][c] === "☀️") rowSun++;
        else if (board[row][c] === "🌑") rowMoon++;
    }
    if (rowSun > expectedCount || rowMoon > expectedCount) {
        board[row][col] = undefined;
        return false;
    }

    let colSun = 0;
    let colMoon = 0;
    for (let r = 0; r < size; r++) {
        if (board[r][col] === "☀️") colSun++;
        else if (board[r][col] === "🌑") colMoon++;
    }
    if (colSun > expectedCount || colMoon > expectedCount) {
        board[row][col] = undefined;
        return false;
    }

    if (hasThreeConsecutiveInRow(board[row])) {
        board[row][col] = undefined;
        return false;
    }

    const columnValues = board.map(r => r[col]);
    if (hasThreeConsecutiveInRow(columnValues)) {
        board[row][col] = undefined;
        return false;
    }

    for (const [fromCoord, toCoord, constraintType] of puzzle.constraints) {
        const [r1, c1] = fromCoord.split(',').map(Number);
        const [r2, c2] = toCoord.split(',').map(Number);
        const v1 = board[r1][c1];
        const v2 = board[r2][c2];
        if (!v1 || !v2) continue;
        if (constraintType === "=" && v1 !== v2) {
            board[row][col] = undefined;
            return false;
        }
        if (constraintType === "x" && v1 === v2) {
            board[row][col] = undefined;
            return false;
        }
    }

    board[row][col] = undefined;
    return true;
}

function hasThreeConsecutiveInRow(values: (CellValue | undefined)[]): boolean {
    for (let i = 0; i <= values.length - 3; i++) {
        const a = values[i];
        const b = values[i + 1];
        const c = values[i + 2];
        if (a && a === b && b === c) {
            return true;
        }
    }
    return false;
}

function isCompleteBoardValid(board: (CellValue | undefined)[][], puzzle: Puzzle): boolean {
    const size = puzzle.size;
    const expected = size / 2;

    for (let row = 0; row < size; row++) {
        const rowValues = board[row] as CellValue[];
        const sun = rowValues.filter(v => v === "☀️").length;
        const moon = rowValues.filter(v => v === "🌑").length;
        if (sun !== expected || moon !== expected) return false;
        if (hasThreeConsecutiveInRow(rowValues)) return false;
    }

    for (let col = 0; col < size; col++) {
        const colValues = board.map(r => r[col]) as CellValue[];
        const sun = colValues.filter(v => v === "☀️").length;
        const moon = colValues.filter(v => v === "🌑").length;
        if (sun !== expected || moon !== expected) return false;
        if (hasThreeConsecutiveInRow(colValues)) return false;
    }

    for (const [fromCoord, toCoord, constraintType] of puzzle.constraints) {
        const [r1, c1] = fromCoord.split(',').map(Number);
        const [r2, c2] = toCoord.split(',').map(Number);
        const v1 = board[r1][c1];
        const v2 = board[r2][c2];
        if (!v1 || !v2) return false;
        if (constraintType === "=" && v1 !== v2) return false;
        if (constraintType === "x" && v1 === v2) return false;
    }

    return true;
}

function deriveAllAdjacencyConstraintsFromBoard(board: (CellValue | undefined)[][]): Puzzle['constraints'] {
    const size = board.length;
    const constraints: Puzzle['constraints'] = [];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const current = board[row][col];
            if (!current) continue;

            if (col + 1 < size && board[row][col + 1]) {
                const type = current === board[row][col + 1] ? '=' : 'x';
                constraints.push([`${row},${col}`, `${row},${col + 1}`, type]);
            }
            if (row + 1 < size && board[row + 1][col]) {
                const type = current === board[row + 1][col] ? '=' : 'x';
                constraints.push([`${row},${col}`, `${row + 1},${col}`, type]);
            }
        }
    }

    return constraints;
}