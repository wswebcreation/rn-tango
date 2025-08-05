import { Jimp } from "jimp";
import { DEBUG, GRID_SIZE, ICON_REMOVAL_COLOR, ICON_REMOVAL_PERCENTAGE } from "./constants";

/**
 * Gets greyscale value from a pixel (using green channel)
 */
export function getGreyscaleValue(image: any, x: number, y: number): number {
    const pixelColor = image.getPixelColor(x, y);
    return (pixelColor >> 8) & 0xFF; // Green channel for greyscale
}

/**
 * Measures the thickness of a horizontal line
 */
export function measureLineThickness(startX: number, endX: number, startY: number): number {
    // Simple implementation - just return 1 for now
    // Can be enhanced later if thickness detection is needed
    return 1;
}

/**
 * Measures the thickness of a vertical line
 */
export function measureVerticalLineThickness(startY: number, endY: number, startX: number): number {
    // For now, return 1 (can be enhanced later if needed)
    return 1;
} 

export function removeCellIcons(image: typeof Jimp.prototype): typeof Jimp.prototype {
    // Let's remove the moon/sun from the images so we can only focus on the constraints
    // First determine the grids, it's a 6*6 grid, so we can determine the size of a cell
    const cellWidth = Math.floor(image.bitmap.width / GRID_SIZE);
    
    const centerAreaWidth = Math.floor(cellWidth * ICON_REMOVAL_PERCENTAGE);
    if(DEBUG) console.log(`Center area to clear: ${centerAreaWidth}x${centerAreaWidth} pixels`);
    
    const marginX = Math.floor((cellWidth - centerAreaWidth) / 2);
    const marginY = Math.floor((cellWidth - centerAreaWidth) / 2);
    const blockOutColor = ICON_REMOVAL_COLOR;
    
    // Process each cell in the 6x6 grid
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            // Calculate cell boundaries
            const cellStartX = col * cellWidth;
            const cellStartY = row * cellWidth;
            
            // Calculate center area boundaries (with margins preserved)
            const centerStartX = cellStartX + marginX;
            const centerStartY = cellStartY + marginY;
            const centerEndX = centerStartX + centerAreaWidth;
            const centerEndY = centerStartY + centerAreaWidth;
            
            // Fill the center area with white to remove moon/sun icons
            for (let y = centerStartY; y < centerEndY; y++) {
                for (let x = centerStartX; x < centerEndX; x++) {
                    // Ensure we don't go beyond image boundaries
                    if (x < image.bitmap.width && y < image.bitmap.height) {
                        image.setPixelColor(blockOutColor, x, y);
                    }
                }
            }
        }
    }
    
    if(DEBUG) console.log(`✅ Removed icons from ${GRID_SIZE * GRID_SIZE} cells, preserving ${marginX}px horizontal and ${marginY}px vertical borders`);
    
    return image;
}