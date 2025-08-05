import { Jimp } from "jimp";
import { CellCoordinate, PrefilledData } from "../types/shared-types";
import { DEBUG, GRID_SIZE } from "./constants";
import { drawPrefilledCellsVisualization } from "./visualization";

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
        
        const pixelColor = image.getPixelColor(x, y);
        
        // Extract RGB values (assuming greyscale, so R=G=B)
        const r = (pixelColor >> 24) & 0xFF;
        const g = (pixelColor >> 16) & 0xFF;
        const b = (pixelColor >> 8) & 0xFF;
        
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
    // Define color ranges for sun and moon
    const SUN_COLOR = { r: 244, g: 170, b: 35 }; // #f4aa23
    const MOON_COLOR = { r: 68, g: 129, b: 222 }; // #4481de
    const COLOR_TOLERANCE = 50; // Tolerance for color matching
    
    // Sample most of the cell area (just avoid the very edges where grey background is)
    const edgeMargin = Math.min(cellWidth, cellHeight) * 0.15; // 15% margin from edges (smaller than before)
    const sampleStartX = cellX + edgeMargin;
    const sampleEndX = cellX + cellWidth - edgeMargin;
    const sampleStartY = cellY + edgeMargin;
    const sampleEndY = cellY + cellHeight - edgeMargin;
    
    let sunColorCount = 0;
    let moonColorCount = 0;
    let totalSamples = 0;
    
    // Sample pixels in a grid pattern within the cell area
    const sampleStep = 2; // Sample every 2 pixels for better coverage of off-center icons
    
    for (let y = sampleStartY; y < sampleEndY; y += sampleStep) {
        for (let x = sampleStartX; x < sampleEndX; x += sampleStep) {
            // Ensure we're within image bounds
            const pixelX = Math.min(Math.max(0, Math.floor(x)), image.bitmap.width - 1);
            const pixelY = Math.min(Math.max(0, Math.floor(y)), image.bitmap.height - 1);
            
            const pixelColor = image.getPixelColor(pixelX, pixelY);
            
            // Extract RGB values
            const r = (pixelColor >> 24) & 0xFF;
            const g = (pixelColor >> 16) & 0xFF;
            const b = (pixelColor >> 8) & 0xFF;
            
            // Check if pixel matches sun color (orange/yellow range)
            const sunDistance = Math.sqrt(
                Math.pow(r - SUN_COLOR.r, 2) + 
                Math.pow(g - SUN_COLOR.g, 2) + 
                Math.pow(b - SUN_COLOR.b, 2)
            );
            
            // Check if pixel matches moon color (blue range)
            const moonDistance = Math.sqrt(
                Math.pow(r - MOON_COLOR.r, 2) + 
                Math.pow(g - MOON_COLOR.g, 2) + 
                Math.pow(b - MOON_COLOR.b, 2)
            );
            
            if (sunDistance <= COLOR_TOLERANCE) {
                sunColorCount++;
            }
            
            if (moonDistance <= COLOR_TOLERANCE) {
                moonColorCount++;
            }
            
            totalSamples++;
        }
    }
    
    if (DEBUG) {
        console.log(`  🎨 Icon color analysis: Sun pixels: ${sunColorCount}, Moon pixels: ${moonColorCount}, Total samples: ${totalSamples}`);
    }
    
    // Determine icon type based on which color is more prevalent
    if (sunColorCount > moonColorCount) {
        return "☀️";
    } else if (moonColorCount > sunColorCount) {
        return "🌑";
    } else {
        // Default to moon if no clear winner or no colored pixels found
        if (DEBUG) console.log(`  ⚠️ No clear icon color detected, defaulting to moon`);
        return "🌑";
    }
}