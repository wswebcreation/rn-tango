import { ManualConstraintsData, ManualPrefilledData } from "../types/processing-types";

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

// Icon removal configuration
// export const ICON_REMOVAL_COLOR = 0x00000000; // Black color to block out the center area
export const ICON_REMOVAL_COLOR = 0xFFFFFFFF; // White color to block out the center area
export const ICON_REMOVAL_PERCENTAGE = 0.6;

// Grid cropping configuration
export const GRID_CORNER_PADDING = 5; 

// Some puzzles are hard to detect the constraints due to different icons, so we can manually add it here
export const MANUALLY_CONSTRAINTS_PUZZLES: ManualConstraintsData = {
    245: [
        ["1,3", "1,4", "x"],
        ["5,3", "5,4", "x"],
        ["1,4", "1,5", "x"], 
        ["5,4", "5,5", "x"], 
        ["2,4", "3,4", "x"], 
        ["3,4", "4,4", "="]
    ],
    260: [
        ["1,1", "2,1", "x"],
        ["2,1", "3,1", "x"],
        ["3,1", "4,1", "x"],
        ["3,1", "3,2", "x"],
        ["3,2", "3,3", "="],
        ["3,3", "4,3", "="],
    ],
    288: [
        ["1,3", "1,4", "x"],
        ["1,4", "1,5", "x"],
        ["1,3", "2,3", "x"],
        ["1,5", "2,5", "="],
        ["3,0", "4,0", "x"],
        ["3,2", "4,2", "="],
        ["4,0", "4,1", "x"],
        ["4,1", "4,2", "="],
    ],
    295: [
        ["0,1", "1,1", "x"],
        ["1,4", "1,5", "="],
        ["4,0", "4,1", "x"],
        ["4,4", "5,4", "x"]
    ],
}

// Some puzzles are hard to detect the prefilled data due to different icons, so we can manually add it here
export const MANUALLY_PREFILLED_PUZZLES: ManualPrefilledData = {
    25: {
        "1,2": "🌑",
        "1,3": "☀️",
        "2,1": "☀️",
        "2,4": "☀️",
        "3,1": "☀️",
        "3,4": "🌑",
        "4,2": "☀️",
        "4,3": "🌑"
    },
    39: {
        "1,1": "🌑",
        "1,2": "🌑",
        "2,1": "☀️",
        "3,3": "🌑",
        "3,4": "☀️",
        "4,3": "🌑"
    },
    67:{
        "0,1": "🌑",
        "1,0": "🌑",
        "1,1": "☀️",
        "1,3": "☀️",
        "1,4": "🌑",
        "2,1": "🌑",
        "2,5": "🌑",
        "3,1": "☀️",
        "3,4": "☀️",
        "4,1": "🌑",
        "4,5": "🌑",
        "5,3": "🌑",
        "5,4": "☀️"
    },
    79: {
        "0,4": "🌑",
        "1,0": "☀️",
        "4,5": "🌑",
        "5,1": "☀️"
    },
    130: {
        "0,0": "🌑",
        "0,1": "☀️",
        "0,2": "☀️",
        "1,1": "☀️",
        "2,0": "☀️",
        "2,1": "🌑",
        "2,2": "🌑"
    },
    152: {
        "2,2": "🌑",
        "2,3": "🌑",
        "3,2": "☀️",
        "3,3": "🌑"
    },
    162: {
        "0,0": "🌑",
        "5,5": "☀️"
    },
    179: {
        "1,0": "🌑",
        "1,1": "☀️",
        "2,0": "🌑",
        "2,1": "🌑",
        "3,4": "🌑",
        "3,5": "☀️",
        "4,4": "☀️",
        "4,5": "🌑"
    },
    260: {
        "1,2": "🌑",
        "1,4": "☀️",
        "2,2": "☀️",
        "2,3": "🌑",
        "2,4": "☀️",
        "3,4": "🌑",
        "4,4": "🌑",
    },
    288: {
        "1,0": "☀️",
        "1,1": "🌑",
        "1,2": "🌑",
        "2,0": "☀️",
        "2,2": "☀️",
        "3,3": "☀️",
        "3,5": "🌑",
        "4,3": "☀️",
        "4,4": "🌑",
        "4,5": "☀️"
    },
}
