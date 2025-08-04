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



/**
 * Draws orange borders on detected symbols on the constraints image
 */
export async function drawDetectedSymbolsOnAreasImage(
    detectedAreas: { x: number, y: number, w: number, h: number, symbol: string }[],
    puzzleNumber: number,
    constraintsImagesFolder: string
): Promise<void> {
    // Load the base constraints image (the greyscale constraints image)
    const constraintsImagePath = `${constraintsImagesFolder}/tango-${puzzleNumber.toString().padStart(3, '0')}.png`;
    const outputImagePath = `${constraintsImagesFolder}/tango-constraints-areas-${puzzleNumber.toString().padStart(3, '0')}.png`;
    
    try {
        const { Jimp } = await import('jimp');
        const baseImage = await Jimp.read(constraintsImagePath);
        const orange = 0xFF8C00FF; // Orange color
        
        // Draw orange borders on all detected areas
        for (const area of detectedAreas) {
            // Draw thick orange border (3 pixels wide)
            for (let thickness = 0; thickness < 3; thickness++) {
                // Top and bottom borders
                for (let x = area.x; x < area.x + area.w; x++) {
                    if (x >= 0 && x < baseImage.bitmap.width) {
                        // Top border
                        const topY = area.y + thickness;
                        if (topY >= 0 && topY < baseImage.bitmap.height) {
                            baseImage.setPixelColor(orange, x, topY);
                        }
                        // Bottom border
                        const bottomY = area.y + area.h - 1 - thickness;
                        if (bottomY >= 0 && bottomY < baseImage.bitmap.height) {
                            baseImage.setPixelColor(orange, x, bottomY);
                        }
                    }
                }

                // Left and right borders
                for (let y = area.y; y < area.y + area.h; y++) {
                    if (y >= 0 && y < baseImage.bitmap.height) {
                        // Left border
                        const leftX = area.x + thickness;
                        if (leftX >= 0 && leftX < baseImage.bitmap.width) {
                            baseImage.setPixelColor(orange, leftX, y);
                        }
                        // Right border
                        const rightX = area.x + area.w - 1 - thickness;
                        if (rightX >= 0 && rightX < baseImage.bitmap.width) {
                            baseImage.setPixelColor(orange, rightX, y);
                        }
                    }
                }
            }
            
            // Draw the detected symbol text below the detection area
            const symbolText = area.symbol.toUpperCase(); // 'X' or '='
            const textStartY = area.y + area.h + 4; // 4 pixels below the detection area
            const textCenterX = area.x + Math.floor(area.w / 2); // Center the text horizontally
            
            // Draw simple text using pixel drawing (9x11 bold font)
            drawSimpleText(baseImage, symbolText, textCenterX, textStartY, orange);
        }
        
        // Save the image with detected symbols
        await baseImage.write(outputImagePath as `${string}.${string}`);
        console.log(`🧡 Added orange borders for ${detectedAreas.length} detected symbols: ${outputImagePath}`);
        
    } catch (error) {
        console.error('Error drawing detected symbols on areas image:', error);
    }
}

/**
 * Draws simple text on an image using pixel art style
 */
function drawSimpleText(image: any, text: string, centerX: number, startY: number, color: number): void {
    const char = text.charAt(0); // We only need to draw single character ('X' or '=')
    
    // Larger 9x11 pixel font patterns with thicker lines
    const fontPatterns: { [key: string]: string[] } = {
        'X': [
            '■■     ■■',
            '■■■   ■■■',
            ' ■■■ ■■■ ',
            '  ■■■■■  ',
            '   ■■■   ',
            '  ■■■■■  ',
            ' ■■■ ■■■ ',
            '■■■   ■■■',
            '■■     ■■'
        ],
        '=': [
            '         ',
            '■■■■■■■■■',
            '■■■■■■■■■',
            '         ',
            '         ',
            '         ',
            '■■■■■■■■■',
            '■■■■■■■■■',
            '         '
        ]
    };
    
    const pattern = fontPatterns[char];
    if (!pattern) return;
    
    const charWidth = 9;  // Updated to match the new font width
    const charHeight = pattern.length;
    const startX = centerX - Math.floor(charWidth / 2); // Center the character
    
    for (let row = 0; row < charHeight; row++) {
        const line = pattern[row];
        for (let col = 0; col < line.length; col++) {
            if (line[col] === '■') {
                const pixelX = startX + col;
                const pixelY = startY + row;
                
                // Check bounds and draw pixel
                if (pixelX >= 0 && pixelX < image.bitmap.width && 
                    pixelY >= 0 && pixelY < image.bitmap.height) {
                    image.setPixelColor(color, pixelX, pixelY);
                }
            }
        }
    }
} 