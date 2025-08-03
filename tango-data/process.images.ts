// import { intToRGBA, rgbaToInt } from "@jimp/utils";
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { Jimp } from 'jimp';
import { remote } from 'webdriverio';
import getData from '/Users/wimselles/Git/games/tango/node_modules/@wdio/ocr-service/dist/utils/getData.js';

// Debug flag - set to true to enable detailed logging
const DEBUG = false;
const OCR = false;
const processedImagesFolder = './tango-data/processed-images';
const croppedImagesFolder = `${processedImagesFolder}/1. cropped`;
const ocrImagesFolder = `${processedImagesFolder}/2a. ocr`;
const undoDetectionFailedImagesFolder = `${processedImagesFolder}/2b. undo-detection-failed`;
const greyImagesFolder = `${processedImagesFolder}/3. grey`;
const gridDetectedImagesFolder = `${processedImagesFolder}/4a. grid-detected`;
const gridFailedImagesFolder = `${processedImagesFolder}/4b. grid-failed`;  
const gridCroppedImagesFolder = `${processedImagesFolder}/5. grid-cropped`;

// Helper function to ensure directory exists
function ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Logs:
 * - with OCR and debugging enabled: ~ 105 seconds
 * - with OCR: no real change
 * - without OCR: ~ 35 seconds
 */

const files = [
    './tango-data/thumbnails/tango-001.png',
    './tango-data/thumbnails/tango-002.png',
    './tango-data/thumbnails/tango-003.png',
    './tango-data/thumbnails/tango-004.png',
    './tango-data/thumbnails/tango-005.png',
    './tango-data/thumbnails/tango-006.png',
    './tango-data/thumbnails/tango-007.png',
    './tango-data/thumbnails/tango-008.png',
    './tango-data/thumbnails/tango-009.png',
    './tango-data/thumbnails/tango-010.png',
    // The bad images where undo can't be found
    // Not 100% correct: 27, 196, 
];

// const files = readdirSync('tango-data/thumbnails/').map(file => `tango-data/thumbnails/${file}`);


interface HorizontalGridDetection {
    topLine: {
        y: number;
        startX: number;
        endX: number;
        width: number;
    } | null;
    bottomLine: {
        y: number;
        startX: number;
        endX: number;
        width: number;
    } | null;
    gridHeight: number | null;
}

interface VerticalGridDetection {
    leftLine: {
        x: number;
        startY: number;
        endY: number;
        height: number;
    } | null;
    rightLine: {
        x: number;
        startY: number;
        endY: number;
        height: number;
    } | null;
    gridWidth: number | null;
}

/**
 * Gets greyscale value from a pixel (using green channel)
 */
function getGreyscaleValue(image: any, x: number, y: number): number {
    const pixelColor = image.getPixelColor(x, y);
    return (pixelColor >> 8) & 0xFF; // Green channel for greyscale
}

/**
 * Simplified: Only detect the top horizontal line (primary approach)
 */
function detectTopHorizontalLine(image: any): any {
    const { width, height } = image.bitmap;
    
    // Grid line color range
    const MIN_GRID_COLOR = 230;
    const MAX_GRID_COLOR = 254;
    const MIN_LINE_WIDTH = Math.floor(width * 0.5); // 50% of image width
    const MAX_LINE_THICKNESS = 5;
    const SEARCH_AREA_HEIGHT = Math.floor(height * 0.25); // Search top 25%
    
    // Look for top line in first 25% of image
    for (let y = 3; y < SEARCH_AREA_HEIGHT; y++) {
        let lineStartX = -1;
        let lineEndX = -1;
        let consecutiveNonGridPixels = 0;
        const MAX_GAP = 15;
        
        for (let x = 0; x < width; x++) {
            const greyValue = getGreyscaleValue(image, x, y);
            const isGridColor = greyValue >= MIN_GRID_COLOR && greyValue <= MAX_GRID_COLOR;
            
            if (isGridColor) {
                if (lineStartX === -1) {
                    // Check for isolated pixel pattern (image 013 case)
                    let thickCount = 0;
                    for (let checkX = x; checkX < width && thickCount < 20; checkX++) {
                        const checkGrey = getGreyscaleValue(image, checkX, y);
                        if (checkGrey >= MIN_GRID_COLOR && checkGrey <= MAX_GRID_COLOR) {
                            thickCount++;
                        } else {
                            break;
                        }
                    }
                    
                    // Pattern: isolated pixel + gap + substantial grid
                    if (thickCount <= 3) {
                        let gapStart = x + thickCount;
                        let gapSize = 0;
                        
                        for (let checkX = gapStart; checkX < width && gapSize < 20; checkX++) {
                            const checkGrey = getGreyscaleValue(image, checkX, y);
                            if (checkGrey < MIN_GRID_COLOR || checkGrey > MAX_GRID_COLOR) {
                                gapSize++;
                            } else {
                                break;
                            }
                        }
                        
                        if (gapSize >= 5) {
                            let gridRestartX = gapStart + gapSize;
                            let substantialCount = 0;
                            
                            for (let checkX = gridRestartX; checkX < width && substantialCount < 10; checkX++) {
                                const checkGrey = getGreyscaleValue(image, checkX, y);
                                if (checkGrey >= MIN_GRID_COLOR && checkGrey <= MAX_GRID_COLOR) {
                                    substantialCount++;
                                } else {
                                    break;
                                }
                            }
                            
                            if (substantialCount >= 3) {
                                lineStartX = gridRestartX;
                                if (DEBUG) console.log(`🔍 Found isolated pixel pattern: ${thickCount}px at x=${x}, gap=${gapSize}px, substantial grid ${substantialCount}px at x=${gridRestartX}`);
                            }
                        }
                    }
                    
                    if (lineStartX === -1) {
                        lineStartX = x; // Normal case
                    }
                }
                lineEndX = x;
                consecutiveNonGridPixels = 0;
            } else {
                if (lineStartX !== -1) {
                    consecutiveNonGridPixels++;
                    if (consecutiveNonGridPixels >= MAX_GAP) {
                        break;
                    }
                }
            }
        }
        
        if (lineStartX !== -1) {
            const lineWidth = lineEndX - lineStartX + 1;
            const isFullWidth = lineStartX === 0 && lineEndX === width - 1;
            
            if (lineWidth >= MIN_LINE_WIDTH && !isFullWidth) {
                const thickness = measureLineThickness(lineStartX, lineEndX, y);
                if (thickness <= MAX_LINE_THICKNESS) {
                    if (DEBUG) console.log(`✅ Found top horizontal line: y=${y}, x=${lineStartX}-${lineEndX}, width=${lineWidth}px, thickness=${thickness}px`);
                    return {
                        y: y,
                        startX: lineStartX,
                        endX: lineEndX,
                        width: lineWidth,
                        thickness: thickness
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * Measures the thickness of a horizontal line
 */
function measureLineThickness(startX: number, endX: number, startY: number): number {
    // Simple implementation - just return 1 for now
    // Can be enhanced later if thickness detection is needed
    return 1;
}

/**
 * Creates complete horizontal grid from just the top line using square geometry  
 */
function createSquareGridFromTopLine(topLine: any): HorizontalGridDetection {
    const gridWidth = topLine.endX - topLine.startX;
    const gridHeight = gridWidth; // Square grid!
    const bottomY = topLine.y + gridHeight;
    
    if (DEBUG) console.log(`📐 Creating square grid from top line: width=${gridWidth}, bottomY=${topLine.y}+${gridHeight}=${bottomY}`);
    
    return {
        topLine: {
            y: topLine.y,
            startX: topLine.startX,
            endX: topLine.endX,
            width: topLine.width
        },
        bottomLine: {
            y: bottomY,
            startX: topLine.startX,
            endX: topLine.endX,
            width: topLine.width
        },
        gridHeight: gridHeight
    };
}

/**
 * Simplified: Only detect the left vertical line (fallback approach)
 */
function detectLeftVerticalLine(image: any): any {
    const { width, height } = image.bitmap;
    
    // Grid line color range
    const MIN_GRID_COLOR = 230;
    const MAX_GRID_COLOR = 254;
    const MIN_LINE_HEIGHT = Math.floor(height * 0.5); // 50% of image height
    const MAX_LINE_THICKNESS = 5;
    const SEARCH_AREA_WIDTH = Math.floor(width * 0.25); // Search left 25%
    
    // Look for left line in first 25% of image width
    for (let x = 3; x < SEARCH_AREA_WIDTH; x++) {
        let lineStartY = -1;
        let lineEndY = -1;
        let consecutiveNonGridPixels = 0;
        const MAX_GAP = 15;
        
        for (let y = 0; y < height; y++) {
            const greyValue = getGreyscaleValue(image, x, y);
            const isGridColor = greyValue >= MIN_GRID_COLOR && greyValue <= MAX_GRID_COLOR;
            
            if (isGridColor) {
                if (lineStartY === -1) {
                    lineStartY = y; // Start of line
                }
                lineEndY = y; // Extend line
                consecutiveNonGridPixels = 0;
            } else {
                if (lineStartY !== -1) {
                    consecutiveNonGridPixels++;
                    if (consecutiveNonGridPixels >= MAX_GAP) {
                        break;
                    }
                }
            }
        }
        
        if (lineStartY !== -1) {
            const lineHeight = lineEndY - lineStartY + 1;
            const isFullHeight = lineStartY === 0 && lineEndY === height - 1;
            
            if (lineHeight >= MIN_LINE_HEIGHT && !isFullHeight) {
                const thickness = measureVerticalLineThickness(lineStartY, lineEndY, x);
                if (thickness <= MAX_LINE_THICKNESS) {
                    if (DEBUG) console.log(`✅ Found left vertical line: x=${x}, y=${lineStartY}-${lineEndY}, height=${lineHeight}px, thickness=${thickness}px`);
                    return {
                        x: x,
                        startY: lineStartY,
                        endY: lineEndY,
                        height: lineHeight,
                        thickness: thickness
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * Creates complete vertical grid from just the left line using square geometry
 */
function createSquareGridFromLeftLine(leftLine: any): VerticalGridDetection {
    const gridHeight = leftLine.endY - leftLine.startY;
    const gridWidth = gridHeight; // Square grid!
    const rightX = leftLine.x + gridWidth;
    
    if (DEBUG) console.log(`📐 Creating square grid from left line: height=${gridHeight}, rightX=${leftLine.x}+${gridWidth}=${rightX}`);
    
    return {
        leftLine: {
            x: leftLine.x,
            startY: leftLine.startY,
            endY: leftLine.endY,
            height: leftLine.height
        },
        rightLine: {
            x: rightX,
            startY: leftLine.startY,
            endY: leftLine.endY,
            height: leftLine.height
        },
        gridWidth: gridWidth
    };
}

/**
 * Measures the thickness of a vertical line
 */
function measureVerticalLineThickness(startY: number, endY: number, startX: number): number {
    // For now, return 1 (can be enhanced later if needed)
    return 1;
}

/**
 * Old complex horizontal detection (keeping for reference but not used)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function detectHorizontalGridLines_OLD(image: any): HorizontalGridDetection | null {
    const { width, height } = image.bitmap;
    
    // Grid line color range (expanded to include all variations: #ededed to #fbfbfb and beyond)
    const MIN_GRID_COLOR = 230; // Include darker greys like #e6e6e6 (230)
    const MAX_GRID_COLOR = 254; // Include #fbfbfb (251) and lighter variations, but exclude pure white (255)
    
    // Size requirements
    const MIN_LINE_WIDTH = Math.floor(width * 0.5); // 50% of image width
    const MAX_LINE_THICKNESS = 5;
    const SEARCH_AREA_HEIGHT = Math.floor(height * 0.25); // 25% of image height
    
    /**
     * Detects a horizontal line in a specific area
     */
    function findHorizontalLine(startY: number, endY: number, searchDirection: 'down' | 'up'): any {
        // Skip edges to avoid detecting image borders
        const EDGE_SKIP = 3;
        const adjustedStartY = searchDirection === 'down' ? startY + EDGE_SKIP : startY;
        const adjustedEndY = searchDirection === 'up' ? endY - EDGE_SKIP : endY;
        
        const yRange = searchDirection === 'down' 
            ? Array.from({ length: adjustedEndY - adjustedStartY }, (_, i) => adjustedStartY + i)
            : Array.from({ length: adjustedEndY - adjustedStartY }, (_, i) => adjustedEndY - 1 - i);
            
        for (const y of yRange) {
            // Scan left to right to find complete grid line
            let lineStartX = -1;
            let lineEndX = -1;
            let consecutiveNonGridPixels = 0;
            const MAX_GAP = 15; // Stop extending line after 15 consecutive non-grid pixels
            
            for (let x = 0; x < width; x++) {
                const greyValue = getGreyscaleValue(image, x, y);
                const isGridColor = greyValue >= MIN_GRID_COLOR && greyValue <= MAX_GRID_COLOR;
                
                if (isGridColor) {
                    if (lineStartX === -1) {
                        // Check if this might be a thick background area followed by actual grid (image 013 pattern)
                        let thickCount = 0;
                        // let hasWhiteGap = false;
                        let actualGridStart = -1;
                        
                        // Count consecutive grid pixels from this position
                        for (let checkX = x; checkX < width && thickCount < 20; checkX++) {
                            const checkGrey = getGreyscaleValue(image, checkX, y);
                            if (checkGrey >= MIN_GRID_COLOR && checkGrey <= MAX_GRID_COLOR) {
                                thickCount++;
                            } else {
                                break;
                            }
                        }
                        
                        // Check for pattern: isolated grid pixel + gap + substantial grid line (image 013 case)
                        if (thickCount <= 3) { // If we only found 1-3 grid pixels, look for gap + substantial grid
                            // Look for gap after this small grid area
                            let gapStart = x + thickCount;
                            let gapSize = 0;
                            
                            // Count the gap size
                            for (let checkX = gapStart; checkX < width && gapSize < 20; checkX++) {
                                const checkGrey = getGreyscaleValue(image, checkX, y);
                                if (checkGrey < MIN_GRID_COLOR || checkGrey > MAX_GRID_COLOR) {
                                    gapSize++;
                                } else {
                                    break; // Found grid color again
                                }
                            }
                            
                            // If there's a significant gap (5+ pixels), look for substantial grid after it
                            if (gapSize >= 5) {
                                let gridRestartX = gapStart + gapSize;
                                let substantialCount = 0;
                                
                                // Count consecutive grid pixels after the gap
                                for (let checkX = gridRestartX; checkX < width && substantialCount < 10; checkX++) {
                                    const checkGrey = getGreyscaleValue(image, checkX, y);
                                    if (checkGrey >= MIN_GRID_COLOR && checkGrey <= MAX_GRID_COLOR) {
                                        substantialCount++;
                                    } else {
                                        break;
                                    }
                                }
                                
                                // If we found substantial grid (3+ pixels) after the gap, use that as start
                                if (substantialCount >= 3) {
                                    actualGridStart = gridRestartX;
                                    if (DEBUG) console.log(`🔍 Found isolated pixel pattern: ${thickCount}px at x=${x}, gap=${gapSize}px, substantial grid ${substantialCount}px at x=${gridRestartX}`);
                                }
                            }
                        }
                        
                        // If we found the image 013 pattern, use the actual grid start
                        if (actualGridStart !== -1) {
                            lineStartX = actualGridStart;
                            if (DEBUG) console.log(`🔧 Detected background pattern, skipping from x=${x} to actual grid at x=${actualGridStart}`);
                        } else {
                            lineStartX = x; // Normal case
                        }
                    }
                    lineEndX = x; // Extend line
                    consecutiveNonGridPixels = 0; // Reset gap counter
                } else {
                    // Non-grid pixel
                    if (lineStartX !== -1) {
                        // We're in a line, count the gap
                        consecutiveNonGridPixels++;
                        
                        if (consecutiveNonGridPixels >= MAX_GAP) {
                            // Gap too large, end the line
                            break;
                        }
                    }
                }
            }
            
            // Check if we found a valid line
            if (lineStartX !== -1) {
                const lineWidth = lineEndX - lineStartX + 1;
                const isFullWidth = lineStartX === 0 && lineEndX === width - 1;
                
                if (lineWidth >= MIN_LINE_WIDTH && !isFullWidth) {
                    const thickness = measureLineThickness(lineStartX, lineEndX, y);
                    if (thickness <= MAX_LINE_THICKNESS) {
                        if (DEBUG) console.log(`✅ Found valid horizontal line: y=${y}, x=${lineStartX}-${lineEndX}, width=${lineWidth}px, thickness=${thickness}px`);
                        return {
                            y: y,
                            startX: lineStartX,
                            endX: lineEndX,
                            width: lineWidth,
                            thickness: thickness
                        };
                    }
                }
            }
        }
        return null;
    }
    
    /**
     * Measures the thickness of a horizontal line
     */
    function measureLineThickness(startX: number, endX: number, startY: number): number {
        let thickness = 1;
        
        // Check downward from the line
        for (let dy = 1; dy < MAX_LINE_THICKNESS && startY + dy < height; dy++) {
            let gridPixelsInRow = 0;
            for (let x = startX; x <= endX; x++) {
                const greyValue = getGreyscaleValue(image, x, startY + dy);
                if (greyValue >= MIN_GRID_COLOR && greyValue <= MAX_GRID_COLOR) {
                    gridPixelsInRow++;
                }
            }
            
            // If most of the row is grid color, it's part of the line
            if (gridPixelsInRow >= (endX - startX + 1) * 0.8) {
                thickness++;
            } else {
                break;
            }
        }
        
        return thickness;
    }
    
    if (DEBUG) console.log(`🔍 Starting grid line search:`);
    
    // Find top line (search in first 25% of image)
    const topLine = findHorizontalLine(0, SEARCH_AREA_HEIGHT, 'down');
    
    // Find bottom line (search in last 25% of image, from bottom up)
    const bottomLine = findHorizontalLine(height - SEARCH_AREA_HEIGHT, height, 'up');
    
    // Validate grid lines
    if (topLine && bottomLine) {
        const widthDifference = Math.abs(topLine.width - bottomLine.width);
        const maxAllowedDifference = Math.min(topLine.width, bottomLine.width) * 0.1; // 10% tolerance
        
        if (widthDifference <= maxAllowedDifference) {
            const gridHeight = bottomLine.y - topLine.y;
            
            if (DEBUG) console.log(`Found matching horizontal grid lines: top at y=${topLine.y} (${topLine.width}px), bottom at y=${bottomLine.y} (${bottomLine.width}px), height=${gridHeight}px`);
            
            // For square grid, calculate bottom line from top line geometry
            const gridWidth = topLine.endX - topLine.startX;
            const squareGridHeight = gridWidth; // Perfect square
            const calculatedBottomY = topLine.y + squareGridHeight;
            
            if (DEBUG) console.log(`📐 Square grid: using calculated bottom line Y=${calculatedBottomY} (top=${topLine.y} + width=${gridWidth})`);
            
            return {
                topLine: {
                    y: topLine.y,
                    startX: topLine.startX,
                    endX: topLine.endX,
                    width: topLine.width
                },
                bottomLine: {
                    y: calculatedBottomY,
                    startX: topLine.startX,
                    endX: topLine.endX,
                    width: topLine.width
                },
                gridHeight: squareGridHeight
            };
        }
    }
    
    return null;
}

/**
 * Detects vertical grid lines according to specifications
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function detectVerticalGridLines(image: any): VerticalGridDetection | null {
    const { width, height } = image.bitmap;
    
    // Grid line color range (expanded to include all variations: #ededed to #fbfbfb and beyond)
    const MIN_GRID_COLOR = 230;
    const MAX_GRID_COLOR = 254;
    
    // Size requirements
    const MIN_LINE_HEIGHT = Math.floor(height * 0.5); // 50% of image height
    const MAX_LINE_THICKNESS = 5;
    const SEARCH_AREA_WIDTH = Math.floor(width * 0.25); // 25% of image width

    /**
     * Detects a vertical line in a specific area
     */
    function findVerticalLine(startX: number, endX: number, searchDirection: 'right' | 'left'): any {
        // Skip edges to avoid detecting image borders
        const EDGE_SKIP = 3;
        const adjustedStartX = searchDirection === 'right' ? startX + EDGE_SKIP : startX;
        const adjustedEndX = searchDirection === 'left' ? endX - EDGE_SKIP : endX;
        
        const xRange = searchDirection === 'right' 
            ? Array.from({ length: adjustedEndX - adjustedStartX }, (_, i) => adjustedStartX + i)
            : Array.from({ length: adjustedEndX - adjustedStartX }, (_, i) => adjustedEndX - 1 - i);
            
        for (const x of xRange) {
            // Scan top to bottom to find complete grid line
            let lineStartY = -1;
            let lineEndY = -1;
            let consecutiveNonGridPixels = 0;
            const MAX_GAP = 15; // Stop extending line after 15 consecutive non-grid pixels
            
            for (let y = 0; y < height; y++) {
                const greyValue = getGreyscaleValue(image, x, y);
                const isGridColor = greyValue >= MIN_GRID_COLOR && greyValue <= MAX_GRID_COLOR;
                
                if (isGridColor) {
                    if (lineStartY === -1) {
                        lineStartY = y; // Start of line
                    }
                    lineEndY = y; // Extend line
                    consecutiveNonGridPixels = 0; // Reset gap counter
                } else {
                    // Non-grid pixel
                    if (lineStartY !== -1) {
                        // We're in a line, count the gap
                        consecutiveNonGridPixels++;
                        
                        if (consecutiveNonGridPixels >= MAX_GAP) {
                            // Gap too large, end the line
                            break;
                        }
                    }
                }
            }
            
            // Check if we found a valid line
            if (lineStartY !== -1) {
                const lineHeight = lineEndY - lineStartY + 1;
                const isFullHeight = lineStartY === 0 && lineEndY === height - 1;
                
                if (lineHeight >= MIN_LINE_HEIGHT && !isFullHeight) {
                    const thickness = measureVerticalLineThickness(lineStartY, lineEndY, x);
                    if (thickness <= MAX_LINE_THICKNESS) {
                        if (DEBUG) console.log(`✅ Found valid vertical line: x=${x}, y=${lineStartY}-${lineEndY}, height=${lineHeight}px, thickness=${thickness}px`);
                        return {
                            x: x,
                            startY: lineStartY,
                            endY: lineEndY,
                            height: lineHeight,
                            thickness: thickness
                        };
                    }
                }
            }
        }
        return null;
    }
    
    /**
     * Measures the thickness of a vertical line
     */
    function measureVerticalLineThickness(startY: number, endY: number, startX: number): number {
        let thickness = 1;
        
        // Check rightward from the line
        for (let dx = 1; dx < MAX_LINE_THICKNESS && startX + dx < width; dx++) {
            let gridPixelsInColumn = 0;
            for (let y = startY; y <= endY; y++) {
                const greyValue = getGreyscaleValue(image, startX + dx, y);
                if (greyValue >= MIN_GRID_COLOR && greyValue <= MAX_GRID_COLOR) {
                    gridPixelsInColumn++;
                }
            }
            
            // If most of the column is grid color, it's part of the line
            if (gridPixelsInColumn >= (endY - startY + 1) * 0.8) {
                thickness++;
            } else {
                break;
            }
        }
        
        return thickness;
    }
    
    if (DEBUG) console.log(`🔍 Starting vertical grid line search:`);
    
    // Find left line (search in first 25% of image)
    const leftLine = findVerticalLine(0, SEARCH_AREA_WIDTH, 'right');
    
    // Find right line (search in last 25% of image, from right to left)
    const rightLine = findVerticalLine(width - SEARCH_AREA_WIDTH, width, 'left');
    
    // Validate grid lines
    if (leftLine && rightLine) {
        const heightDifference = Math.abs(leftLine.height - rightLine.height);
        const maxAllowedDifference = Math.min(leftLine.height, rightLine.height) * 0.1; // 10% tolerance
        
        if (heightDifference <= maxAllowedDifference) {
            const gridWidth = rightLine.x - leftLine.x;
            
            if (DEBUG) console.log(`Found matching vertical grid lines: left at x=${leftLine.x} (${leftLine.height}px), right at x=${rightLine.x} (${rightLine.height}px), width=${gridWidth}px`);
            
            return {
                leftLine: {
                    x: leftLine.x,
                    startY: leftLine.startY,
                    endY: leftLine.endY,
                    height: leftLine.height
                },
                rightLine: {
                    x: rightLine.x,
                    startY: rightLine.startY,
                    endY: rightLine.endY,
                    height: rightLine.height
                },
                gridWidth: gridWidth
            };
        }
    }
    
    return null;
}

/**
 * Derives vertical grid lines from horizontal grid lines (for square grids)
 */
function deriveVerticalFromHorizontal(horizontalGrid: HorizontalGridDetection): VerticalGridDetection | null {
    if (!horizontalGrid.topLine) {
        return null;
    }
    
    const { topLine } = horizontalGrid;
    
    // Pure geometric square grid calculation from top line
    const gridWidth = topLine.endX - topLine.startX;
    const gridHeight = gridWidth; // Square grid!
    const bottomY = topLine.y + gridHeight;
    
    if (DEBUG) console.log(`📐 Square grid calculation: width=${gridWidth}, height=${gridHeight}, bottomY=${topLine.y}+${gridHeight}=${bottomY}`);
    
    return {
        leftLine: {
            x: topLine.startX,
            startY: topLine.y,
            endY: bottomY,
            height: gridHeight
        },
        rightLine: {
            x: topLine.endX,
            startY: topLine.y,
            endY: bottomY,
            height: gridHeight
        },
        gridWidth: gridWidth
    };
}

/**
 * Derives horizontal grid lines from vertical grid lines (for square grids)
 */
function deriveHorizontalFromVertical(verticalGrid: VerticalGridDetection): HorizontalGridDetection | null {
    if (!verticalGrid.leftLine || !verticalGrid.rightLine) {
        return null;
    }
    
    const { leftLine, rightLine } = verticalGrid;
    
    // Use the vertical line endpoints to define horizontal lines
    const leftX = leftLine.x;
    const rightX = rightLine.x;
    const topY = Math.min(leftLine.startY, rightLine.startY);
    const bottomY = Math.max(leftLine.endY, rightLine.endY);
    const width = rightX - leftX;
    
    return {
        topLine: {
            y: topY,
            startX: leftX,
            endX: rightX,
            width: width
        },
        bottomLine: {
            y: bottomY,
            startX: leftX,
            endX: rightX,
            width: width
        },
        gridHeight: bottomY - topY
    };
}

/**
 * Draws the detected grid lines on the image and saves it
 */
async function drawGridLinesAndSave(image: any, horizontalGrid: HorizontalGridDetection | null, verticalGrid: VerticalGridDetection | null, puzzleNumber: number): Promise<void> {
    // Create a copy of the image to draw on
    const imageWithLines = image.clone();
    
    // Define transparent green color (RGBA: green with 50% opacity)
    const transparentGreen = 0x00FF0080; // Green with 128 alpha (50% transparency)
    
    // Draw horizontal lines if detected
    if (horizontalGrid?.topLine) {
        const { y, startX, endX } = horizontalGrid.topLine;
        for (let x = startX; x <= endX; x++) {
            imageWithLines.setPixelColor(transparentGreen, x, y);
            // Draw a slightly thicker line (2 pixels) for better visibility
            if (y + 1 < imageWithLines.bitmap.height) {
                imageWithLines.setPixelColor(transparentGreen, x, y + 1);
            }
        }
                 if (DEBUG) console.log(`Drew top line at y=${y} from x=${startX} to x=${endX}`);
    }
    
    if (horizontalGrid?.bottomLine) {
        const { y, startX, endX } = horizontalGrid.bottomLine;
        for (let x = startX; x <= endX; x++) {
            imageWithLines.setPixelColor(transparentGreen, x, y);
            // Draw a slightly thicker line (2 pixels) for better visibility
            if (y - 1 >= 0) {
                imageWithLines.setPixelColor(transparentGreen, x, y - 1);
            }
        }
                 if (DEBUG) console.log(`Drew bottom line at y=${y} from x=${startX} to x=${endX}`);
    }
    
    // Draw vertical lines if detected
    if (verticalGrid?.leftLine) {
        const { x, startY, endY } = verticalGrid.leftLine;
        for (let y = startY; y <= endY; y++) {
            imageWithLines.setPixelColor(transparentGreen, x, y);
            // Draw a slightly thicker line (2 pixels) for better visibility
            if (x + 1 < imageWithLines.bitmap.width) {
                imageWithLines.setPixelColor(transparentGreen, x + 1, y);
            }
        }
        if (DEBUG) console.log(`Drew left line at x=${x} from y=${startY} to y=${endY}`);
    }
    
    if (verticalGrid?.rightLine) {
        const { x, startY, endY } = verticalGrid.rightLine;
        for (let y = startY; y <= endY; y++) {
            imageWithLines.setPixelColor(transparentGreen, x, y);
            // Draw a slightly thicker line (2 pixels) for better visibility
            if (x - 1 >= 0) {
                imageWithLines.setPixelColor(transparentGreen, x - 1, y);
            }
        }
        if (DEBUG) console.log(`Drew right line at x=${x} from y=${startY} to y=${endY}`);
    }
    
    // Ensure the detected folder exists
    const detectedFolder = gridDetectedImagesFolder;
    ensureDirectoryExists(detectedFolder);
    
    // Save the image with detected lines
    const outputFileName = `tango-detected-${puzzleNumber.toString().padStart(3, '0')}.png`;
    const outputPath = `${detectedFolder}/${outputFileName}`;
    
    if (DEBUG) await imageWithLines.write(outputPath);
    if (DEBUG) console.log(`✅ Successfully saved image with detected lines: ${outputPath}`);
}

async function processImages(): Promise<void> {
    const startTime = Date.now();
    const puzzleNumbersToSkip = [27, 196];
    let processedImages = 0;
    for (const file of files) {
        const fileName = file.split('/').pop();
        const puzzleNumber = parseInt(fileName!.split('-')[1].split('.')[0]);
        let croppedImage = null;
        let greyImage = null;
        let gridCroppedImage = null;

        if (!puzzleNumbersToSkip.includes(puzzleNumber)) {
            try {
                // 1. Start with cropping the image based on default bounds
                ensureDirectoryExists(croppedImagesFolder);

                console.log('\n🔎 Processing', fileName);
    
                const image = await Jimp.read(file);
                const { width, height } = image.bitmap;
                croppedImage = image.crop({
                    x: width * 0.3,
                    y: height * 0.13,
                    w: width * 0.4,
                    h: height * 0.8
                });
            
                if (DEBUG) await croppedImage.write(`${croppedImagesFolder}/${fileName}`);
            
                if (OCR) {
                    // 2. Use the @wdio/ocr module to get the Undo text bounds and crop the image from there
                    ensureDirectoryExists(ocrImagesFolder);
                    const browser = await remote({ capabilities: { browserName: 'stub' }, automationProtocol: './protocol-stub.js' })
                    const options = {
                        contrast: 0.25,
                        isTesseractAvailable: true,
                        language: 'eng',
                        ocrImagesPath: ocrImagesFolder,
                        haystack: {
                            x: 0,
                            y: croppedImage.bitmap.height * 0.5,
                            width: croppedImage.bitmap.width,
                            height: croppedImage.bitmap.height,
                        },
                        cliFile: readFileSync(`${croppedImagesFolder}/${fileName}`).toString('base64')
                    }
            
                    try {
                        const { words } = await getData(browser, options)
                        const undoWord = words.find(word => /undo|unde/i.test(word.text));
                        if (undoWord) {
                            const { top, bottom } = undoWord.bbox;
                            croppedImage.crop({
                                x: 0,
                                y: 0,
                                w: croppedImage.bitmap.width,
                                h: top - (bottom - top)
                            })
                            if (DEBUG) await croppedImage.write(`${croppedImagesFolder}/${fileName}`)
                        } else {
                            console.log(`❌ No '/undo|unde/i' word found for puzzle ${puzzleNumber}`);
                            ensureDirectoryExists(undoDetectionFailedImagesFolder);
                            if (DEBUG) await croppedImage.write(`${undoDetectionFailedImagesFolder}/${fileName}`);
                        }
                    } catch (ocrError) {
                        console.error(`❌ OCR processing failed for ${fileName}:`, ocrError);
                    }
                }

                // 3. Convert the cropped image to greyscale and save it
                ensureDirectoryExists(greyImagesFolder);
                greyImage = croppedImage
                    .clone()
                    .greyscale()
                    .contrast(0.1);
            
                if (DEBUG) await greyImage.write(`${greyImagesFolder}/${fileName}`);
            
                // Simple approach: detect ONE reference line, calculate everything else geometrically
                let horizontalGrid = null;
                let verticalGrid = null;
            
                // 1. Try to detect top horizontal line (primary approach)
                const topLine = detectTopHorizontalLine(greyImage);
                if (topLine) {
                    if (DEBUG) console.log(`✅ Found top line, calculating square grid geometrically`);
                    horizontalGrid = createSquareGridFromTopLine(topLine);
                    verticalGrid = deriveVerticalFromHorizontal(horizontalGrid);
                } else {
                    // 2. Fallback: try to detect left vertical line
                    if (DEBUG) console.log(`🔄 Top line failed, trying left vertical line fallback`);
                    const leftLine = detectLeftVerticalLine(greyImage);
                    if (leftLine) {
                        if (DEBUG) console.log(`✅ Found left line, calculating square grid geometrically`);
                        verticalGrid = createSquareGridFromLeftLine(leftLine);
                        horizontalGrid = deriveHorizontalFromVertical(verticalGrid);
                    }
                }
            
                if (horizontalGrid || verticalGrid) {
                    console.log(`✅ Grid detected for: ${fileName}.\n`);
                    if (horizontalGrid) {
                        if (DEBUG) console.log(`  Horizontal:`, horizontalGrid);
                    }
                    if (verticalGrid) {
                        if (DEBUG) console.log(`  Vertical:`, verticalGrid);
                    }
                    await drawGridLinesAndSave(greyImage, horizontalGrid, verticalGrid, puzzleNumber);
                    
                    // 5. Crop the image based on the detected grid lines
                    ensureDirectoryExists(gridCroppedImagesFolder);
                    const topLine = horizontalGrid?.topLine;
                    const bottomLine = horizontalGrid?.bottomLine;
                    const leftLine = verticalGrid?.leftLine;
                    const rightLine = verticalGrid?.rightLine;
                    const gridWidth = (rightLine?.x || 0) - (leftLine?.x || 0);
                    const gridHeight = (bottomLine?.y || 0) - (topLine?.y || 0);
                    const gridX = leftLine?.x || 0;
                    const gridY = topLine?.y || 0;
                    gridCroppedImage = await croppedImage
                        .clone()
                        .crop({ x: gridX, y: gridY, w: gridWidth, h: gridHeight })
                    if (DEBUG) await gridCroppedImage.write(`${gridCroppedImagesFolder}/${fileName}`);
                    processedImages++;
                } else {
                
                    // Save failed detection to grid-failed folder
                    const failedFolder = gridFailedImagesFolder;
                    ensureDirectoryExists(failedFolder);
                    if (DEBUG) await greyImage.write(`${failedFolder}/${fileName}`);
                    console.log(`❌ Saved failed detection: ${failedFolder}/${fileName}`);
                }
            
            } catch (error) {
                console.error(`Failed to process ${file}:`, error);
                console.log(`Continuing with next image...`);
            }
        }
    }
    const endTime = Date.now();

    console.log(`\n🏁 Process completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`✅ Processed ${processedImages} images`);
}

if (require.main === module) {
    processImages().catch(error => { if (DEBUG) console.error(error); });
}