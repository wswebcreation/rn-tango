// import { intToRGBA, rgbaToInt } from "@jimp/utils";
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { Jimp } from 'jimp';
import { remote } from 'webdriverio';
import getData from '/Users/wimselles/Git/games/tango/node_modules/@wdio/ocr-service/dist/utils/getData.js';

// Debug flag - set to true to enable detailed logging
const DEBUG = false;
const processedImagesFolder = './tango-data/processed-images';
const croppedImagesFolder = `${processedImagesFolder}/1. cropped`;
const ocrImagesFolder = `${processedImagesFolder}/2a. ocr`;
const undoDetectionFailedImagesFolder = `${processedImagesFolder}/2b. undo-detection-failed`;
const greyImagesFolder = `${processedImagesFolder}/3. grey`;
const gridDetectedImagesFolder = `${processedImagesFolder}/4a. grid-detected`;
const gridFailedImagesFolder = `${processedImagesFolder}/4b. grid-failed`;  

// Helper function to ensure directory exists
function ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}

const files = [
    './tango-data/thumbnails/tango-001.png',
    // './tango-data/thumbnails/tango-002.png',
    // './tango-data/thumbnails/tango-003.png',
    // './tango-data/thumbnails/tango-004.png',
    // './tango-data/thumbnails/tango-005.png',
    // './tango-data/thumbnails/tango-006.png',
    // './tango-data/thumbnails/tango-007.png',
    // './tango-data/thumbnails/tango-008.png',
    // './tango-data/thumbnails/tango-009.png',
    // './tango-data/thumbnails/tango-010.png',
    // The bad images where undo can't be found
    './tango-data/thumbnails/tango-013.png',
    // './tango-data/thumbnails/tango-021.png', // not complete image
    // './tango-data/thumbnails/tango-027.png',
    // './tango-data/thumbnails/tango-105.png', // not complete image
    // './tango-data/thumbnails/tango-134.png', // not complete image
    // './tango-data/thumbnails/tango-166.png', // undo text, not big bottom
    // './tango-data/thumbnails/tango-177.png', // undo
    // './tango-data/thumbnails/tango-180.png', // undo
    // './tango-data/thumbnails/tango-188.png', // right line
    // './tango-data/thumbnails/tango-189.png', // undo
    // './tango-data/thumbnails/tango-191.png', // undo
    // './tango-data/thumbnails/tango-193.png', // undo
    // './tango-data/thumbnails/tango-200.png', // not complete image
    // './tango-data/thumbnails/tango-209.png', // not complete image
    // './tango-data/thumbnails/tango-218.png', // undo
    // './tango-data/thumbnails/tango-219.png', // not complete image
    // './tango-data/thumbnails/tango-220.png', // not complete image
    // './tango-data/thumbnails/tango-226.png', // not complete image
    // './tango-data/thumbnails/tango-278.png', // undo
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
 * Detects horizontal grid lines according to specifications
 */
function detectHorizontalGridLines(image: any): HorizontalGridDetection | null {
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
                        lineStartX = x; // Start of line
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
            
            return {
                topLine: {
                    y: topLine.y,
                    startX: topLine.startX,
                    endX: topLine.endX,
                    width: topLine.width
                },
                bottomLine: {
                    y: bottomLine.y,
                    startX: bottomLine.startX,
                    endX: bottomLine.endX,
                    width: bottomLine.width
                },
                gridHeight: gridHeight
            };
        }
    }
    
    return null;
}

/**
 * Detects vertical grid lines according to specifications
 */
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
    if (!horizontalGrid.topLine || !horizontalGrid.bottomLine) {
        return null;
    }
    
    const { topLine, bottomLine } = horizontalGrid;
    
    // Use the horizontal line endpoints to define vertical lines
    const leftX = Math.min(topLine.startX, bottomLine.startX);
    const rightX = Math.max(topLine.endX, bottomLine.endX);
    const topY = topLine.y;
    const bottomY = bottomLine.y;
    const height = bottomY - topY;
    
    return {
        leftLine: {
            x: leftX,
            startY: topY,
            endY: bottomY,
            height: height
        },
        rightLine: {
            x: rightX,
            startY: topY,
            endY: bottomY,
            height: height
        },
        gridWidth: rightX - leftX
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
    
    await imageWithLines.write(outputPath);
    if (DEBUG) console.log(`✅ Successfully saved image with detected lines: ${outputPath}`);
}

async function processImages(): Promise<void> {
    for (const file of files) {
        try {
            // 1. Start with cropping the image based on default bounds
            ensureDirectoryExists(croppedImagesFolder);

            const fileName = file.split('/').pop();
            console.log('\n🔎 Processing', fileName);
    
            const image = await Jimp.read(file);
            const { width, height } = image.bitmap;
            const puzzleNumber = parseInt(fileName!.split('-')[1].split('.')[0]);
            const croppedImage = image.crop({ 
                x: width * 0.3, 
                y: height * 0.13, 
                w: width * 0.4, 
                h: height * 0.8 
            });
            
            await croppedImage.write(`${croppedImagesFolder}/${fileName}`);
            
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
                    y: croppedImage.bitmap.height*0.5, 
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
                        h: top- (bottom-top)
                    })
                    await croppedImage.write(`${croppedImagesFolder}/${fileName}`)
                } else {
                    console.log(`❌ No '/undo|unde/i' word found for puzzle ${puzzleNumber}`);
                    ensureDirectoryExists(undoDetectionFailedImagesFolder);
                    await croppedImage.write(`${undoDetectionFailedImagesFolder}/${fileName}`);
                }
            } catch (ocrError) {
                console.error(`❌ OCR processing failed for ${fileName}:`, ocrError);
            }

            // 3. Convert the cropped image to greyscale and save it
            ensureDirectoryExists(greyImagesFolder);
            const greyImage = croppedImage
                .greyscale()
                .contrast(0.1);
            
            await greyImage.write(`${greyImagesFolder}/${fileName}`);
            
            // Detect horizontal and vertical grid lines
            let horizontalGrid = detectHorizontalGridLines(greyImage);
            let verticalGrid = detectVerticalGridLines(greyImage);
            
            // Fallback logic: derive missing lines from found ones (since it's a square grid)
            if (horizontalGrid && !verticalGrid) {
                if (DEBUG) console.log(`🔄 Deriving vertical lines from horizontal grid`);
                verticalGrid = deriveVerticalFromHorizontal(horizontalGrid);
            } else if (verticalGrid && !horizontalGrid) {
                if (DEBUG) console.log(`🔄 Deriving horizontal lines from vertical grid`);
                horizontalGrid = deriveHorizontalFromVertical(verticalGrid);
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
            } else {
                
                // Save failed detection to grid-failed folder
                const failedFolder = gridFailedImagesFolder;
                ensureDirectoryExists(failedFolder);
                await greyImage.write(`${failedFolder}/${fileName}`);
                console.log(`❌ Saved failed detection: ${failedFolder}/${fileName}`);
            }
            
        } catch (error) {
            console.error(`Failed to process ${file}:`, error);
            console.log(`Continuing with next image...`);
        }
    }
}

if (require.main === module) {
    processImages().catch(error => { if (DEBUG) console.error(error); });
}