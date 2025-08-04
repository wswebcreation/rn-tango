export interface Constraint {
    cell1: string; // Format: "row,col"
    cell2: string; // Format: "row,col"
    symbol: 'x' | '=';
}

export interface ConstraintDetectionResult {
    constraints: Constraint[];
    success: boolean;
    error?: string;
} 