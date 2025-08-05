// Size of the detection area (can be changed to 40, 60, etc.)
export const CONSTRAINT_DETECTION_SIZE = 30;

// Half size for centering calculations
export const CONSTRAINT_DETECTION_HALF_SIZE = CONSTRAINT_DETECTION_SIZE / 2;

// Minimum size threshold for valid detection areas
export const MIN_DETECTION_AREA_SIZE = 20;

// Grid configuration
export const GRID_SIZE = 6; // 6x6 grid
export const GRID_LINES_COUNT = GRID_SIZE - 1; // 5 lines between 6 rows/columns

// Debug flags
export const DEBUG = false;
export const DEBUG_SAVE_IMAGES = true;

// OCR flags
export const OCR = false;

// Icon removal configuration
// export const ICON_REMOVAL_COLOR = 0x00000000; // Black color to block out the center area
export const ICON_REMOVAL_COLOR = 0xFFFFFFFF; // White color to block out the center area
export const ICON_REMOVAL_PERCENTAGE = 0.6;

// Grid cropping configuration
export const GRID_CORNER_PADDING = 5; 