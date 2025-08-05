import { Jimp } from 'jimp';
import { HorizontalGridDetection, VerticalGridDetection } from '../types/grid-types';
import { DEBUG, DEBUG_SAVE_IMAGES } from './constants';
import { ensureDirectoryExists } from './file-utils';

/**
 * Draws the crop boundaries (with padding) on the image and saves it
 */
export async function drawCropBoundariesAndSave(
    image: any, 
    horizontalGrid: HorizontalGridDetection | null, 
    verticalGrid: VerticalGridDetection | null, 
    puzzleNumber: number,
    gridDetectedImagesFolder: string,
    cropBoundaries?: { x: number, y: number, width: number, height: number }
): Promise<void> {
    // Create a copy of the image to draw on
    const imageWithLines = image.clone();
    
    // Draw crop boundaries in green (shows actual crop area with padding)
    if (cropBoundaries) {
        const transparentGreen = 0x00FF0080; // Green with 50% transparency
        const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = cropBoundaries;
        
        // Draw top crop boundary
        for (let x = cropX; x < cropX + cropWidth; x++) {
            if (x >= 0 && x < imageWithLines.bitmap.width && cropY >= 0 && cropY < imageWithLines.bitmap.height) {
                imageWithLines.setPixelColor(transparentGreen, x, cropY);
                if (cropY + 1 < imageWithLines.bitmap.height) {
                    imageWithLines.setPixelColor(transparentGreen, x, cropY + 1);
                }
            }
        }
        
        // Draw bottom crop boundary
        const bottomY = cropY + cropHeight - 1;
        for (let x = cropX; x < cropX + cropWidth; x++) {
            if (x >= 0 && x < imageWithLines.bitmap.width && bottomY >= 0 && bottomY < imageWithLines.bitmap.height) {
                imageWithLines.setPixelColor(transparentGreen, x, bottomY);
                if (bottomY - 1 >= 0) {
                    imageWithLines.setPixelColor(transparentGreen, x, bottomY - 1);
                }
            }
        }
        
        // Draw left crop boundary
        for (let y = cropY; y < cropY + cropHeight; y++) {
            if (y >= 0 && y < imageWithLines.bitmap.height && cropX >= 0 && cropX < imageWithLines.bitmap.width) {
                imageWithLines.setPixelColor(transparentGreen, cropX, y);
                if (cropX + 1 < imageWithLines.bitmap.width) {
                    imageWithLines.setPixelColor(transparentGreen, cropX + 1, y);
                }
            }
        }
        
        // Draw right crop boundary
        const rightX = cropX + cropWidth - 1;
        for (let y = cropY; y < cropY + cropHeight; y++) {
            if (y >= 0 && y < imageWithLines.bitmap.height && rightX >= 0 && rightX < imageWithLines.bitmap.width) {
                imageWithLines.setPixelColor(transparentGreen, rightX, y);
                if (rightX - 1 >= 0) {
                    imageWithLines.setPixelColor(transparentGreen, rightX - 1, y);
                }
            }
        }
        
        if (DEBUG) console.log(`Drew crop boundaries with padding: x=${cropX}, y=${cropY}, w=${cropWidth}, h=${cropHeight}`);
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
 * Draws orange borders and coordinate labels with moon emoji on detected prefilled cells
 * Returns the image with visualizations drawn
 */
export async function drawPrefilledCellsVisualization(
    prefilledData: Record<string, string>,
    baseImage: typeof Jimp.prototype,
    cellWidth: number,
    cellHeight: number
): Promise<typeof Jimp.prototype | null> {
    try {
        // Clone the base image to avoid modifying the original
        const workingImage = baseImage.clone();
        const orange = 0xFF8C00FF; // Orange color
        
        // Draw orange borders and icons for each prefilled cell
        for (const [cellCoord, iconType] of Object.entries(prefilledData)) {
            const [row, col] = cellCoord.split(',').map(Number);
            
            // Calculate cell boundaries
            const cellX = col * cellWidth;
            const cellY = row * cellHeight;
            
            // Draw thick orange border (3 pixels wide) around the cell
            for (let thickness = 0; thickness < 3; thickness++) {
                // Top and bottom borders
                for (let x = cellX; x < cellX + cellWidth; x++) {
                    if (x >= 0 && x < workingImage.bitmap.width) {
                        // Top border
                        const topY = cellY + thickness;
                        if (topY >= 0 && topY < workingImage.bitmap.height) {
                            workingImage.setPixelColor(orange, x, topY);
                        }
                        // Bottom border
                        const bottomY = cellY + cellHeight - 1 - thickness;
                        if (bottomY >= 0 && bottomY < workingImage.bitmap.height) {
                            workingImage.setPixelColor(orange, x, bottomY);
                        }
                    }
                }

                // Left and right borders
                for (let y = cellY; y < cellY + cellHeight; y++) {
                    if (y >= 0 && y < workingImage.bitmap.height) {
                        // Left border
                        const leftX = cellX + thickness;
                        if (leftX >= 0 && leftX < workingImage.bitmap.width) {
                            workingImage.setPixelColor(orange, leftX, y);
                        }
                        // Right border
                        const rightX = cellX + cellWidth - 1 - thickness;
                        if (rightX >= 0 && rightX < workingImage.bitmap.width) {
                            workingImage.setPixelColor(orange, rightX, y);
                        }
                    }
                }
            }
            
            // Draw combined coordinate and icon text inside the cell at the bottom
            const textStartY = cellY + cellHeight - 16; // 16 pixels from bottom of cell (inside the cell)
            const centerX = cellX + Math.floor(cellWidth / 2);
            
            // Determine icon symbol based on detected type
            const iconSymbol = iconType === "☀️" ? "S" : "C"; // S for sun, C for moon
            
            // Create combined text in format "1,1 S" or "1,1 C" (coordinates + icon symbol)
            const combinedText = `${row},${col} ${iconSymbol}`;
            
            // Draw combined text centered inside cell at bottom with orange background and white text
            const whiteColor = 0xFFFFFFFF; // White text color for visibility on orange background
            drawPositionTextWithBackground(workingImage, combinedText, centerX, textStartY, whiteColor, true);
        }
        
        if (DEBUG) console.log(`🌙 Added orange borders and icons for ${Object.keys(prefilledData).length} prefilled cells`);
        return workingImage;
        
    } catch (error) {
        console.error('Error drawing prefilled cells visualization:', error);
        return null;
    }
}



/**
 * Draws orange borders on detected symbols on the constraints image
 * Returns the image with visualizations drawn
 */
export async function drawDetectedSymbolsOnAreasImage(
    detectedAreas: { x: number, y: number, w: number, h: number, symbol: string, position?: string }[],
    baseImage: typeof Jimp.prototype,
    horizontalGrid?: any,
    verticalGrid?: any
): Promise<typeof Jimp.prototype | null> {
    try {
        // Clone the base image to avoid modifying the original
        const workingImage = baseImage.clone();
        const orange = 0xFF8C00FF; // Orange color
        
        // Draw orange borders on all detected areas
        for (const area of detectedAreas) {
            // Draw thick orange border (3 pixels wide)
            for (let thickness = 0; thickness < 3; thickness++) {
                // Top and bottom borders
                for (let x = area.x; x < area.x + area.w; x++) {
                    if (x >= 0 && x < workingImage.bitmap.width) {
                        // Top border
                        const topY = area.y + thickness;
                        if (topY >= 0 && topY < workingImage.bitmap.height) {
                            workingImage.setPixelColor(orange, x, topY);
                        }
                        // Bottom border
                        const bottomY = area.y + area.h - 1 - thickness;
                        if (bottomY >= 0 && bottomY < workingImage.bitmap.height) {
                            workingImage.setPixelColor(orange, x, bottomY);
                        }
                    }
                }

                // Left and right borders
                for (let y = area.y; y < area.y + area.h; y++) {
                    if (y >= 0 && y < workingImage.bitmap.height) {
                        // Left border
                        const leftX = area.x + thickness;
                        if (leftX >= 0 && leftX < workingImage.bitmap.width) {
                            workingImage.setPixelColor(orange, leftX, y);
                        }
                        // Right border
                        const rightX = area.x + area.w - 1 - thickness;
                        if (rightX >= 0 && rightX < workingImage.bitmap.width) {
                            workingImage.setPixelColor(orange, rightX, y);
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
                drawPositionTextWithBackground(workingImage, combinedText, textCenterX, textStartY, orange, true); // true for center alignment
            }
        }
        
        // Draw 6x6 debug grid with row/column numbering if grid data is available
        if (horizontalGrid && verticalGrid) {
            drawDebugGrid(workingImage, horizontalGrid, verticalGrid);
        }
        
        // Return the image with visualizations drawn
        if (DEBUG) console.log(`🧡 Added orange borders for ${detectedAreas.length} detected symbols`);
        return workingImage;
        
    } catch (error) {
        console.error('Error drawing detected symbols on areas image:', error);
        return null;
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
        ],
        'C': [
            '■■   ',
            '  ■  ',
            '   ■ ',
            '    ■',
            '   ■ ',
            '  ■  ',
            '■■   '
        ],
        'S': [
            ' ■■■ ',
            '■■■■■',
            '■■■■■',
            '■■■■■',
            '■■■■■',
            '■■■■■',
            ' ■■■ '
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
    const gridWidth = image.bitmap.width;
    const gridHeight = image.bitmap.height;
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