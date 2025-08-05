import { GridLine } from '../types/grid-types';
import { getGreyscaleValue, measureLineThickness } from '../utils/image-utils';

const DEBUG = false;

/**
 * Simplified: Only detect the top horizontal line (primary approach)
 */
export function detectTopHorizontalLine(image: any): GridLine | null {
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
                const thickness = measureLineThickness();
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