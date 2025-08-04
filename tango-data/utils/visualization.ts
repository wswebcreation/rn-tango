import { HorizontalGridDetection, VerticalGridDetection } from '../types/grid-types';
import {
    CONSTRAINT_DETECTION_HALF_SIZE,
    CONSTRAINT_DETECTION_SIZE,
    GRID_LINES_COUNT,
    GRID_SIZE,
    MIN_DETECTION_AREA_SIZE
} from './constraint-config';
import { ensureDirectoryExists } from './file-utils';

const DEBUG = false;
const DEBUG_SAVE_IMAGES = true;

/**
 * Draws the detected grid lines on the image and saves it
 */
export async function drawGridLinesAndSave(
    image: any, 
    horizontalGrid: HorizontalGridDetection | null, 
    verticalGrid: VerticalGridDetection | null, 
    puzzleNumber: number,
    gridDetectedImagesFolder: string
): Promise<void> {
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
    ensureDirectoryExists(gridDetectedImagesFolder);
    
    // Save the image with detected lines
    const outputFileName = `tango-detected-${puzzleNumber.toString().padStart(3, '0')}.png`;
    const outputPath = `${gridDetectedImagesFolder}/${outputFileName}`;
    
    if (DEBUG_SAVE_IMAGES) await imageWithLines.write(outputPath);
    if (DEBUG) console.log(`✅ Successfully saved image with detected lines: ${outputPath}`);
}

/**
 * Draws green blocks on the grid borders where constraint detection is checking
 */
export async function drawConstraintDetectionAreas(
    image: any,
    horizontalGrid: any,
    verticalGrid: any,
    puzzleNumber: number,
    constraintsImagesFolder: string
): Promise<void> {
    // Create a copy of the image to draw on
    const imageWithAreas = image.clone();
    
    // Define colors
    const brightGreen = 0x00FF00FF; // Bright green for constraint areas
    const lightGreen = 0x90EE90FF; // Light green for fill
    
    // Calculate grid cell dimensions
    const gridWidth = verticalGrid.gridWidth;
    const gridHeight = horizontalGrid.gridHeight;
    const cellWidth = gridWidth / GRID_SIZE;
    const cellHeight = gridHeight / GRID_SIZE;
    
    // Get image dimensions for boundary checking
    const imageWidth = image.bitmap.width;
    const imageHeight = image.bitmap.height;
    
    let areasDrawn = 0;
    
    // Check vertical grid lines (between adjacent columns)
    for (let col = 0; col < GRID_LINES_COUNT; col++) { // Vertical lines between columns
        for (let row = 0; row < GRID_SIZE; row++) { // All rows
            const gridLineX = (col + 1) * cellWidth; // Position of vertical grid line
            const cellY = row * cellHeight;
            const centerY = cellY + cellHeight / 2; // Center of the cell vertically
            
            // Detection box centered on the grid line
            const cropX = Math.max(0, Math.min(gridLineX - CONSTRAINT_DETECTION_HALF_SIZE, imageWidth - CONSTRAINT_DETECTION_SIZE));
            const cropY = Math.max(0, Math.min(centerY - CONSTRAINT_DETECTION_HALF_SIZE, imageHeight - CONSTRAINT_DETECTION_SIZE));
            const cropW = Math.min(CONSTRAINT_DETECTION_SIZE, imageWidth - cropX);
            const cropH = Math.min(CONSTRAINT_DETECTION_SIZE, imageHeight - cropY);
            
            if (cropW >= MIN_DETECTION_AREA_SIZE && cropH >= MIN_DETECTION_AREA_SIZE) {
                drawRectangle(imageWithAreas, cropX, cropY, cropW, cropH, brightGreen, lightGreen);
                areasDrawn++;
            }
        }
    }
    
    // Check horizontal grid lines (between adjacent rows)
    for (let row = 0; row < GRID_LINES_COUNT; row++) { // Horizontal lines between rows
        for (let col = 0; col < GRID_SIZE; col++) { // All columns
            const cellX = col * cellWidth;
            const centerX = cellX + cellWidth / 2; // Center of the cell horizontally
            const gridLineY = (row + 1) * cellHeight; // Position of horizontal grid line
            
            // Detection box centered on the grid line
            const cropX = Math.max(0, Math.min(centerX - CONSTRAINT_DETECTION_HALF_SIZE, imageWidth - CONSTRAINT_DETECTION_SIZE));
            const cropY = Math.max(0, Math.min(gridLineY - CONSTRAINT_DETECTION_HALF_SIZE, imageHeight - CONSTRAINT_DETECTION_SIZE));
            const cropW = Math.min(CONSTRAINT_DETECTION_SIZE, imageWidth - cropX);
            const cropH = Math.min(CONSTRAINT_DETECTION_SIZE, imageHeight - cropY);
            
            if (cropW >= MIN_DETECTION_AREA_SIZE && cropH >= MIN_DETECTION_AREA_SIZE) {
                drawRectangle(imageWithAreas, cropX, cropY, cropW, cropH, brightGreen, lightGreen);
                areasDrawn++;
            }
        }
    }
    
    // Save the image with constraint detection areas
    const outputFileName = `tango-constraints-areas-${puzzleNumber.toString().padStart(3, '0')}.png`;
    const outputPath = `${constraintsImagesFolder}/${outputFileName}`;
    
    if (DEBUG_SAVE_IMAGES) await imageWithAreas.write(outputPath);
    console.log(`✅ Drew ${areasDrawn} constraint detection areas: ${outputPath}`);
}

/**
 * Helper function to draw a rectangle with border and fill
 */
function drawRectangle(
    image: any,
    x: number,
    y: number,
    width: number,
    height: number,
    borderColor: number,
    fillColor: number
): void {
    // Draw border
    for (let i = 0; i < width; i++) {
        // Top border
        if (y >= 0 && y < image.bitmap.height && x + i >= 0 && x + i < image.bitmap.width) {
            image.setPixelColor(borderColor, x + i, y);
        }
        // Bottom border
        if (y + height - 1 >= 0 && y + height - 1 < image.bitmap.height && x + i >= 0 && x + i < image.bitmap.width) {
            image.setPixelColor(borderColor, x + i, y + height - 1);
        }
    }
    
    for (let i = 0; i < height; i++) {
        // Left border
        if (x >= 0 && x < image.bitmap.width && y + i >= 0 && y + i < image.bitmap.height) {
            image.setPixelColor(borderColor, x, y + i);
        }
        // Right border
        if (x + width - 1 >= 0 && x + width - 1 < image.bitmap.width && y + i >= 0 && y + i < image.bitmap.height) {
            image.setPixelColor(borderColor, x + width - 1, y + i);
        }
    }
    
    // Fill interior with semi-transparent color (every few pixels to avoid completely obscuring the content)
    for (let i = 2; i < width - 2; i += 3) {
        for (let j = 2; j < height - 2; j += 3) {
            if (x + i >= 0 && x + i < image.bitmap.width && y + j >= 0 && y + j < image.bitmap.height) {
                image.setPixelColor(fillColor, x + i, y + j);
            }
        }
    }
}

/**
 * Draws orange borders on detected symbols in the constraint areas image
 */
export async function drawDetectedSymbolsOnAreasImage(
    detectedAreas: { x: number, y: number, w: number, h: number, symbol: string }[],
    puzzleNumber: number,
    constraintsImagesFolder: string
): Promise<void> {
    // Load the existing constraint areas image
    const areasImagePath = `${constraintsImagesFolder}/tango-constraints-areas-${puzzleNumber.toString().padStart(3, '0')}.png`;
    
    try {
        const { Jimp } = require('jimp');
        const existingImage = await Jimp.read(areasImagePath);
        const orange = 0xFF8C00FF; // Orange color
        
        // Draw orange borders on all detected areas
        for (const area of detectedAreas) {
            // Draw thick orange border (3 pixels wide)
            for (let thickness = 0; thickness < 3; thickness++) {
                // Top and bottom borders
                for (let x = area.x; x < area.x + area.w; x++) {
                    if (x >= 0 && x < existingImage.bitmap.width) {
                        // Top border
                        const topY = area.y + thickness;
                        if (topY >= 0 && topY < existingImage.bitmap.height) {
                            existingImage.setPixelColor(orange, x, topY);
                        }
                        // Bottom border
                        const bottomY = area.y + area.h - 1 - thickness;
                        if (bottomY >= 0 && bottomY < existingImage.bitmap.height) {
                            existingImage.setPixelColor(orange, x, bottomY);
                        }
                    }
                }
                
                // Left and right borders
                for (let y = area.y; y < area.y + area.h; y++) {
                    if (y >= 0 && y < existingImage.bitmap.height) {
                        // Left border
                        const leftX = area.x + thickness;
                        if (leftX >= 0 && leftX < existingImage.bitmap.width) {
                            existingImage.setPixelColor(orange, leftX, y);
                        }
                        // Right border
                        const rightX = area.x + area.w - 1 - thickness;
                        if (rightX >= 0 && rightX < existingImage.bitmap.width) {
                            existingImage.setPixelColor(orange, rightX, y);
                        }
                    }
                }
            }
        }
        
        // Save the updated image
        await existingImage.write(areasImagePath);
        console.log(`🧡 Added orange borders for ${detectedAreas.length} detected symbols: ${areasImagePath}`);
        
    } catch (error) {
        console.error('Error drawing detected symbols on areas image:', error);
    }
} 