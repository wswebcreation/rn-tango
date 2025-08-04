/**
 * Configuration constants for constraint detection
 * Change these values to adjust the detection area size
 */

// Size of the detection area (can be changed to 40, 60, etc.)
export const CONSTRAINT_DETECTION_SIZE = 30;

// Half size for centering calculations
export const CONSTRAINT_DETECTION_HALF_SIZE = CONSTRAINT_DETECTION_SIZE / 2;

// Minimum size threshold for valid detection areas
export const MIN_DETECTION_AREA_SIZE = 20;

// Grid configuration
export const GRID_SIZE = 6; // 6x6 grid
export const GRID_LINES_COUNT = GRID_SIZE - 1; // 5 lines between 6 rows/columns