import { GridLine } from '../types/grid-types';
import { DEBUG } from '../utils/constants';
import { getGreyscaleValue, measureVerticalLineThickness } from '../utils/image-utils';

/**
 * Simplified: Only detect the left vertical line (fallback approach)
 */
export function detectLeftVerticalLine(image: any): GridLine | null {
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
                const thickness = measureVerticalLineThickness();
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