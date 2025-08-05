import { Jimp } from "jimp";
import { DEBUG, DEBUG_SAVE_IMAGES, GRID_CORNER_PADDING, GRID_SIZE, ICON_REMOVAL_COLOR, ICON_REMOVAL_PERCENTAGE } from "./constants";
import { ensureDirectoryExists } from "./file-utils";

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

export interface CropBoundaries {
    x: number;
    y: number;
    width: number;
    height: number;
    rawGridX: number;
    rawGridY: number;
    rawGridWidth: number;
    rawGridHeight: number;
}

/**
 * Calculates crop boundaries with padding for rounded corners
 */
export function calculateCropBoundaries(
    horizontalGrid: any,
    verticalGrid: any,
    imageWidth: number,
    imageHeight: number
): CropBoundaries {
    const topLine = horizontalGrid?.topLine;
    const bottomLine = horizontalGrid?.bottomLine;
    const leftLine = verticalGrid?.leftLine;
    const rightLine = verticalGrid?.rightLine;
    
    // Account for rounded corners: add padding on each side
    const CORNER_PADDING = GRID_CORNER_PADDING;
    const rawGridX = leftLine?.x || 0;
    const rawGridY = topLine?.y || 0;
    const rawGridWidth = (rightLine?.x || 0) - rawGridX;
    const rawGridHeight = (bottomLine?.y || 0) - rawGridY;
    
    // Expand grid boundaries with padding, but stay within image bounds
    const gridX = Math.max(0, rawGridX - CORNER_PADDING); // Extend left to capture left rounded corner
    const gridY = rawGridY; // Keep detected top line position (already accurate)
    const gridWidth = Math.min(imageWidth - gridX, rawGridWidth + (CORNER_PADDING * 2)); // Extend left + right
    const gridHeight = Math.min(imageHeight - gridY, rawGridHeight + CORNER_PADDING); // Extend down only
    
    return {
        x: gridX,
        y: gridY,
        width: gridWidth,
        height: gridHeight,
        rawGridX,
        rawGridY,
        rawGridWidth,
        rawGridHeight
    };
}

export interface GridProcessingFolders {
    gridCroppedImagesFolder: string;
}

/**
 * Processes and saves grid images with cropping
 */
export async function processAndSaveGridImages(
    croppedImage: any,
    cropBoundaries: CropBoundaries,
    fileName: string,
    folders: GridProcessingFolders
): Promise<any> {
    const { gridCroppedImagesFolder } = folders;
    const { x, y, width, height, rawGridX, rawGridY, rawGridWidth, rawGridHeight } = cropBoundaries;
    
    // Apply the crop
    ensureDirectoryExists(gridCroppedImagesFolder);
    
    if (DEBUG) {
        console.log(`📐 Grid crop: ${rawGridX},${rawGridY} ${rawGridWidth}×${rawGridHeight} → ${x},${y} ${width}×${height} (+${GRID_CORNER_PADDING}px padding)`);
    }
    
    const gridCroppedImage = await croppedImage
        .clone()
        .crop({ x, y, w: width, h: height });
    
    if (DEBUG_SAVE_IMAGES) {
        await gridCroppedImage.write(`${gridCroppedImagesFolder}/${fileName}`);
    }
    
    const blockOutImage = removeCellIcons(gridCroppedImage);
    if (DEBUG_SAVE_IMAGES) {
        await blockOutImage.write(`${gridCroppedImagesFolder}/blockOut-${fileName}`);
    }
    
    return gridCroppedImage;
}