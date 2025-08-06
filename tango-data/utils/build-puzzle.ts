import { CellCoordinate, CellValue, Puzzle } from "../types/shared-types";

export interface ValidationResult {
    success: boolean;
    puzzle?: Puzzle;
    error?: string;
    details?: string[];
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
    
    console.log(`🧩 Puzzle solvability validated: balanced prefilled distribution`);
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