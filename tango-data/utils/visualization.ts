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
    detectedAreas: { x: number, y: number, w: number, h: number, symbol: string, position?: string }[],
    puzzleNumber: number,
    constraintsImagesFolder: string,
    horizontalGrid?: any,
    verticalGrid?: any
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
            
            // Draw the detected symbol and position text below the detection area
            const symbolText = area.symbol.toUpperCase(); // 'X' or '='
            const textStartY = area.y + area.h + 4; // 4 pixels below the detection area
            
            // Create combined text in format "5,0-5,1 =" and center it below the box
            let combinedText = '';
            if (area.position) {
                const match = area.position.match(/V(\d+)-(\d+)_R(\d+)|H(\d+)-(\d+)_C(\d+)/);
                if (match) {
                    let positionText = '';
                    if (match[1] !== undefined) {
                        // Vertical: V0-1_R5 -> "5,0-5,1" (row,col1-row,col2)
                        const row = match[3];
                        const col1 = match[1];
                        const col2 = match[2];
                        positionText = `${row},${col1}-${row},${col2}`;
                    } else if (match[4] !== undefined) {
                        // Horizontal: H2-3_C1 -> "2,1-3,1" (row1,col-row2,col)
                        const row1 = match[4];
                        const row2 = match[5];
                        const col = match[6];
                        positionText = `${row1},${col}-${row2},${col}`;
                    }
                    combinedText = `${positionText} ${symbolText.toLowerCase()}`;
                }
            }
            
            // Draw combined text centered below the detection area with background box
            if (combinedText) {
                const textCenterX = area.x + Math.floor(area.w / 2); // Center horizontally
                drawPositionTextWithBackground(baseImage, combinedText, textCenterX, textStartY, orange, true); // true for center alignment
            }
        }
        
        // Draw 6x6 debug grid with row/column numbering if grid data is available
        if (horizontalGrid && verticalGrid) {
            drawDebugGrid(baseImage, horizontalGrid, verticalGrid);
        }
        
        // Save the image with detected symbols
        await baseImage.write(outputImagePath as `${string}.${string}`);
        if (DEBUG) console.log(`🧡 Added orange borders for ${detectedAreas.length} detected symbols: ${outputImagePath}`);
        
    } catch (error) {
        console.error('Error drawing detected symbols on areas image:', error);
    }
}

/**
 * Draws simple text on an image using pixel art style
 */
function drawSimpleText(image: any, text: string, centerX: number, startY: number, color: number): void {
    const char = text.charAt(0); // We only need to draw single character ('X' or '=')
    
    // 9x11 pixel font patterns with thinner 1-2 pixel lines
    const fontPatterns: { [key: string]: string[] } = {
        'X': [
            '■       ■',
            ' ■     ■ ',
            '  ■   ■  ',
            '   ■ ■   ',
            '    ■    ',
            '   ■ ■   ',
            '  ■   ■  ',
            ' ■     ■ ',
            '■       ■'
        ],
        '=': [
            '         ',
            '■■■■■■■■■',
            '         ',
            '         ',
            '         ',
            '         ',
            '■■■■■■■■■',
            '         ',
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

/**
 * Draws position text using small pixel font (e.g., "5,0-5,1 =")
 */
function drawPositionText(image: any, text: string, startX: number, startY: number, color: number, centerAlign: boolean = false): void {
    // Small 5x7 pixel font patterns for numbers, comma, and dash
    const fontPatterns: { [key: string]: string[] } = {
        '0': [
            '■■■■■',
            '■   ■',
            '■   ■',
            '■   ■',
            '■   ■',
            '■   ■',
            '■■■■■'
        ],
        '1': [
            '  ■  ',
            ' ■■  ',
            '  ■  ',
            '  ■  ',
            '  ■  ',
            '  ■  ',
            '■■■■■'
        ],
        '2': [
            '■■■■■',
            '    ■',
            '    ■',
            '■■■■■',
            '■    ',
            '■    ',
            '■■■■■'
        ],
        '3': [
            '■■■■■',
            '    ■',
            '    ■',
            '■■■■■',
            '    ■',
            '    ■',
            '■■■■■'
        ],
        '4': [
            '■   ■',
            '■   ■',
            '■   ■',
            '■■■■■',
            '    ■',
            '    ■',
            '    ■'
        ],
        '5': [
            '■■■■■',
            '■    ',
            '■    ',
            '■■■■■',
            '    ■',
            '    ■',
            '■■■■■'
        ],
        '6': [
            '■■■■■',
            '■    ',
            '■    ',
            '■■■■■',
            '■   ■',
            '■   ■',
            '■■■■■'
        ],
        '7': [
            '■■■■■',
            '    ■',
            '    ■',
            '    ■',
            '    ■',
            '    ■',
            '    ■'
        ],
        '8': [
            '■■■■■',
            '■   ■',
            '■   ■',
            '■■■■■',
            '■   ■',
            '■   ■',
            '■■■■■'
        ],
        '9': [
            '■■■■■',
            '■   ■',
            '■   ■',
            '■■■■■',
            '    ■',
            '    ■',
            '■■■■■'
        ],
        ',': [
            '     ',
            '     ',
            '     ',
            '     ',
            '     ',
            '  ■  ',
            ' ■   '
        ],
        '-': [
            '     ',
            '     ',
            '     ',
            '■■■■■',
            '     ',
            '     ',
            '     '
        ],
        ' ': [
            '     ',
            '     ',
            '     ',
            '     ',
            '     ',
            '     ',
            '     '
        ],
        '=': [
            '     ',
            '■■■■■',
            '     ',
            '     ',
            '■■■■■',
            '     ',
            '     '
        ],
        'x': [
            '■   ■',
            ' ■ ■ ',
            '  ■  ',
            ' ■ ■ ',
            '■   ■',
            '     ',
            '     '
        ]
    };
    
    const charWidth = 5;
    const charSpacing = 1; // 1 pixel spacing between characters
    
    // Calculate total text width for center alignment
    let totalWidth = text.length * charWidth + (text.length - 1) * charSpacing;
    let currentX = centerAlign ? startX - Math.floor(totalWidth / 2) : startX;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const pattern = fontPatterns[char];
        
        if (pattern) {
            const charHeight = pattern.length;
            
            for (let row = 0; row < charHeight; row++) {
                const line = pattern[row];
                for (let col = 0; col < line.length; col++) {
                    if (line[col] === '■') {
                        const pixelX = currentX + col;
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
        
        currentX += charWidth + charSpacing; // Move to next character position
    }
}

/**
 * Draws position text with semi-transparent orange background box for better readability
 */
function drawPositionTextWithBackground(image: any, text: string, startX: number, startY: number, textColor: number, centerAlign: boolean = false): void {
    const charWidth = 5;
    const charSpacing = 1;
    const textHeight = 7; // Height of our font
    const padding = 2; // Padding around text
    
    // Calculate text dimensions
    const totalTextWidth = text.length * charWidth + (text.length - 1) * charSpacing;
    const boxWidth = totalTextWidth + (padding * 2);
    const boxHeight = textHeight + (padding * 2);
    
    // Calculate positions
    const textStartX = centerAlign ? startX - Math.floor(totalTextWidth / 2) : startX;
    const boxStartX = textStartX - padding;
    const boxStartY = startY - padding;
    
    // Create semi-transparent orange background - lighter for better contrast
    const backgroundOrange = 0xFFA50080; // Orange with 50% transparency (0x80 = 128/255)
    
    // Draw background box
    for (let y = 0; y < boxHeight; y++) {
        for (let x = 0; x < boxWidth; x++) {
            const pixelX = boxStartX + x;
            const pixelY = boxStartY + y;
            
            if (pixelX >= 0 && pixelX < image.bitmap.width && 
                pixelY >= 0 && pixelY < image.bitmap.height) {
                image.setPixelColor(backgroundOrange, pixelX, pixelY);
            }
        }
    }
    
    // Draw the text on top of the background
    drawPositionText(image, text, textStartX, startY, textColor, false); // false since we already calculated position
}

/**
 * Draws a 6x6 debug grid with thin dotted orange lines and row/column numbering (0-5)
 */
function drawDebugGrid(image: any, horizontalGrid: any, verticalGrid: any): void {
    const gridWidth = verticalGrid.gridWidth;
    const gridHeight = horizontalGrid.gridHeight;
    const cellWidth = gridWidth / 6; // 6x6 grid
    const cellHeight = gridHeight / 6;
    
    // Semi-transparent orange for grid lines
    const gridOrange = 0xFFA50060; // 37% transparent orange
    
    // Draw horizontal grid lines (dotted)
    for (let row = 0; row <= 6; row++) {
        const y = Math.round(row * cellHeight);
        if (y >= 0 && y < image.bitmap.height) {
            for (let x = 0; x < gridWidth; x += 3) { // Dotted pattern every 3 pixels
                if (x < image.bitmap.width) {
                    image.setPixelColor(gridOrange, x, y);
                }
            }
        }
    }
    
    // Draw vertical grid lines (dotted)
    for (let col = 0; col <= 6; col++) {
        const x = Math.round(col * cellWidth);
        if (x >= 0 && x < image.bitmap.width) {
            for (let y = 0; y < gridHeight; y += 3) { // Dotted pattern every 3 pixels
                if (y < image.bitmap.height) {
                    image.setPixelColor(gridOrange, x, y);
                }
            }
        }
    }
    
    // Draw row numbers (0-5) on the left side
    for (let row = 0; row < 6; row++) {
        const y = Math.round(row * cellHeight + cellHeight / 2 - 3); // Center vertically in cell, adjust for font height
        const x = 5; // 5 pixels from left edge
        if (x < image.bitmap.width && y >= 0 && y < image.bitmap.height - 7) {
            drawPositionText(image, row.toString(), x, y, gridOrange, false);
        }
    }
    
    // Draw column numbers (0-5) on the top
    for (let col = 0; col < 6; col++) {
        const x = Math.round(col * cellWidth + cellWidth / 2 - 2); // Center horizontally in cell, adjust for font width
        const y = 5; // 5 pixels from top edge
        if (x >= 0 && x < image.bitmap.width - 5 && y < image.bitmap.height) {
            drawPositionText(image, col.toString(), x, y, gridOrange, false);
        }
    }
} 