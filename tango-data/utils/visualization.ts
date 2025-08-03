import { HorizontalGridDetection, VerticalGridDetection } from '../types/grid-types';
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