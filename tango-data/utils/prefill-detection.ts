import { Jimp } from "jimp";
import { ManualPrefilledData } from "../types/processing-types";
import { CellCoordinate, PrefilledData } from "../types/shared-types";
import { DEBUG, GRID_SIZE } from "./constants";
import { drawPrefilledCellsVisualization } from "./visualization";

function getPixelRgb(image: typeof Jimp.prototype, x: number, y: number): { r: number; g: number; b: number } {
    const px = Math.min(Math.max(0, Math.floor(x)), image.bitmap.width - 1);
    const py = Math.min(Math.max(0, Math.floor(y)), image.bitmap.height - 1);
    const idx = (py * image.bitmap.width + px) * 4;
    const data = image.bitmap.data;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
}

export async function getPrefilledData(gridCroppedImage: typeof Jimp.prototype, prefilledImagesFolder: string, fileName: string): Promise<{
    prefilledData: PrefilledData,
    prefilledImage: typeof Jimp.prototype
}> {
    const prefilledImage = gridCroppedImage.clone();
    const prefilledData: PrefilledData = {};
    
    // Calculate cell dimensions
    const cellWidth = Math.floor(gridCroppedImage.bitmap.width / GRID_SIZE);
    const cellHeight = Math.floor(gridCroppedImage.bitmap.height / GRID_SIZE);
    
    if (DEBUG) console.log(`🔍 Analyzing prefilled cells: ${GRID_SIZE}x${GRID_SIZE} grid, cell size: ${cellWidth}x${cellHeight}`);
    
    // Analyze each cell in the 6x6 grid
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cellCoord: CellCoordinate = `${row},${col}`;
            
            // Calculate cell boundaries
            const cellX = col * cellWidth;
            const cellY = row * cellHeight;
            
            // Check if this cell has a grey background (prefilled)
            const isGreyBackground = analyzeBackgroundColor(gridCroppedImage, cellX, cellY, cellWidth, cellHeight);
            
            if (isGreyBackground) {
                if (DEBUG) console.log(`📍 Found grey background cell at ${cellCoord}`);
                
                // Analyze the icon in the center of the cell to determine sun vs moon
                const iconType = analyzeIconType(gridCroppedImage, cellX, cellY, cellWidth, cellHeight);
                prefilledData[cellCoord] = iconType;
                
                if (DEBUG) console.log(`🎯 Detected icon type: ${iconType === "☀️" ? "sun" : "moon"} at ${cellCoord}`);
            }
        }
    }
    
    if (DEBUG) console.log(`✅ Found ${Object.keys(prefilledData).length} prefilled cells:`, prefilledData);
    
    // Create visualization with orange borders and half moon icons
    const visualizedImage = await drawPrefilledCellsVisualization(
        prefilledData,
        gridCroppedImage,
        cellWidth,
        cellHeight
    );
    
    // Use the visualized image if creation was successful, otherwise use clone
    const finalPrefilledImage = visualizedImage || prefilledImage;
    
    return { prefilledData, prefilledImage: finalPrefilledImage };
}

/**
 * Analyzes the background color of a cell to determine if it's grey (prefilled) or white (empty)
 */
function analyzeBackgroundColor(image: typeof Jimp.prototype, cellX: number, cellY: number, cellWidth: number, cellHeight: number): boolean {
    // Sample points around the edges of the cell to check background color
    // Avoid the center where icons might be
    const margin = Math.min(cellWidth, cellHeight) * 0.1; // 10% margin from edges
    const samplePoints = [
        // Top edge
        { x: cellX + margin, y: cellY + margin },
        { x: cellX + cellWidth - margin, y: cellY + margin },
        // Bottom edge  
        { x: cellX + margin, y: cellY + cellHeight - margin },
        { x: cellX + cellWidth - margin, y: cellY + cellHeight - margin },
        // Side edges
        { x: cellX + margin, y: cellY + cellHeight / 2 },
        { x: cellX + cellWidth - margin, y: cellY + cellHeight / 2 }
    ];
    
    let totalGrey = 0;
    let validSamples = 0;
    
    for (const point of samplePoints) {
        // Ensure we're within image bounds
        const x = Math.min(Math.max(0, Math.floor(point.x)), image.bitmap.width - 1);
        const y = Math.min(Math.max(0, Math.floor(point.y)), image.bitmap.height - 1);
        
        const { r, g, b } = getPixelRgb(image, x, y);
        
        // Calculate brightness (0-255)
        const brightness = (r + g + b) / 3;
        
        // Count as grey if it's significantly darker than white (less than 240)
        // Pure white is 255, so anything below ~240 could be considered grey background
        if (brightness < 240) {
            totalGrey++;
        }
        
        validSamples++;
    }
    
    // Consider it grey background if more than half the sample points are grey
    const greyPercentage = totalGrey / validSamples;
    const isGrey = greyPercentage > 0.5;
    
    if (DEBUG && isGrey) {
        console.log(`  📊 Cell background analysis: ${totalGrey}/${validSamples} samples are grey (${(greyPercentage * 100).toFixed(1)}%)`);
    }
    
    return isGrey;
}

/**
 * Analyzes the icon in a prefilled cell to determine if it's a sun or moon
 * Samples most of the cell area to account for off-center icons
 */
function analyzeIconType(image: typeof Jimp.prototype, cellX: number, cellY: number, cellWidth: number, cellHeight: number): "☀️" | "🌑" {
    // Sample most of the cell area (avoid very edges/background)
    const edgeMargin = Math.min(cellWidth, cellHeight) * 0.15; // 15% margin from edges (smaller than before)
    const sampleStartX = cellX + edgeMargin;
    const sampleEndX = cellX + cellWidth - edgeMargin;
    const sampleStartY = cellY + edgeMargin;
    const sampleEndY = cellY + cellHeight - edgeMargin;
    
    let sunColorCount = 0;
    let moonColorCount = 0;
    let coloredSamples = 0;
    
    // Sample pixels in a grid pattern within the cell area
    const sampleStep = 2; // Sample every 2 pixels for better coverage of off-center icons
    
    for (let y = sampleStartY; y < sampleEndY; y += sampleStep) {
        for (let x = sampleStartX; x < sampleEndX; x += sampleStep) {
            // Ensure we're within image bounds
            const pixelX = Math.min(Math.max(0, Math.floor(x)), image.bitmap.width - 1);
            const pixelY = Math.min(Math.max(0, Math.floor(y)), image.bitmap.height - 1);
            
            const { r, g, b } = getPixelRgb(image, pixelX, pixelY);
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            const saturation = max === 0 ? 0 : delta / max;
            if (saturation < 0.2) {
                continue; // ignore near-greyscale background/shadow pixels
            }

            coloredSamples++;

            // Approx hue in degrees [0..360)
            let hue = 0;
            if (delta !== 0) {
                if (max === r) hue = ((g - b) / delta) % 6;
                else if (max === g) hue = (b - r) / delta + 2;
                else hue = (r - g) / delta + 4;
                hue *= 60;
                if (hue < 0) hue += 360;
            }

            const isSunHue = hue >= 20 && hue <= 70;
            const isMoonHue = hue >= 180 && hue <= 260;

            if (isSunHue || (r > g && g > b && r - b > 20)) sunColorCount++;
            if (isMoonHue || (b > g && b > r && b - r > 20)) moonColorCount++;
        }
    }
    
    if (DEBUG) {
        console.log(`  🎨 Icon color analysis: Sun pixels: ${sunColorCount}, Moon pixels: ${moonColorCount}, Colored samples: ${coloredSamples}`);
    }
    
    // Determine icon type based on which color is more prevalent
    if (sunColorCount > moonColorCount) {
        return "☀️";
    } else if (moonColorCount > sunColorCount) {
        return "🌑";
    } else {
        // Fallback: suns are often brighter than moons in these assets
        if (DEBUG) console.log(`  ⚠️ No clear icon color detected, defaulting by brightness`);
        return "☀️";
    }
}

/**
 * Detects icon type for every cell in the grid (used for solved/answer images).
 */
export function detectAllCellIcons(gridCroppedImage: typeof Jimp.prototype): PrefilledData {
    const allCells: PrefilledData = {};
    const cellWidth = Math.floor(gridCroppedImage.bitmap.width / GRID_SIZE);
    const cellHeight = Math.floor(gridCroppedImage.bitmap.height / GRID_SIZE);

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cellCoord: CellCoordinate = `${row},${col}`;
            const cellX = col * cellWidth;
            const cellY = row * cellHeight;
            allCells[cellCoord] = analyzeIconType(gridCroppedImage, cellX, cellY, cellWidth, cellHeight);
        }
    }

    return allCells;
}

/**
 * Gets prefilled data using manual data if available, otherwise automatic detection
 * @param gridCroppedImage - The cropped grid image
 * @param prefilledImagesFolder - Folder to save visualization images
 * @param fileName - Name of the image file
 * @param manualPrefilledData - Manual prefilled data for specific puzzles
 * @returns Object containing prefilled data and visualization image
 */
export async function getPrefilledDataWithManual(
    gridCroppedImage: typeof Jimp.prototype, 
    prefilledImagesFolder: string, 
    fileName: string,
    manualPrefilledData: ManualPrefilledData
): Promise<{
    prefilledData: PrefilledData,
    prefilledImage: typeof Jimp.prototype
}> {
    const puzzleNumber = parseInt(fileName.split('-')[1].split('.')[0]);
    
    if (manualPrefilledData[puzzleNumber]) {
        if (DEBUG) console.log(`📋 Using manual prefilled data for puzzle ${puzzleNumber}`);
        
        const prefilledData: PrefilledData = manualPrefilledData[puzzleNumber] as PrefilledData;
        
        // Calculate cell dimensions for visualization
        const cellWidth = Math.floor(gridCroppedImage.bitmap.width / GRID_SIZE);
        const cellHeight = Math.floor(gridCroppedImage.bitmap.height / GRID_SIZE);
        
        // Create visualization image with manual data
        const visualizationImage = await drawPrefilledCellsVisualization(
            prefilledData,
            gridCroppedImage,
            cellWidth,
            cellHeight
        );
        
        const prefilledImage = visualizationImage || gridCroppedImage.clone();
        
        if (DEBUG) console.log(`✅ Manual prefilled data processed for puzzle ${puzzleNumber}:`, prefilledData);
        
        return { prefilledData, prefilledImage };
    } else {
        // Use automatic detection
        if (DEBUG) console.log(`🔍 Using automatic detection for puzzle ${puzzleNumber}`);
        return await getPrefilledData(gridCroppedImage, prefilledImagesFolder, fileName);
    }
}