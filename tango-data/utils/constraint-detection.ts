import { Jimp } from 'jimp';
import {
    CONSTRAINT_DETECTION_HALF_SIZE,
    CONSTRAINT_DETECTION_SIZE,
    GRID_LINES_COUNT,
    GRID_SIZE,
    MIN_DETECTION_AREA_SIZE
} from './constraint-config';
import { drawDetectedSymbolsOnAreasImage } from './visualization';

/**
 * Detects x and = symbols on grid borders
 * Returns array of constraints in format: [["0,0", "0,1", "="], ["0,0", "1,0", "x"]]
 */
export async function detectGridConstraints(
    image: typeof Jimp.prototype, 
    horizontalGrid: any, 
    verticalGrid: any,
    puzzleNumber: number,
    constraintsImagesFolder: string
): Promise<string[][]> {
    const constraints: string[][] = [];
    const detectedAreas: { x: number, y: number, w: number, h: number, symbol: string, position?: string }[] = [];
    console.log(`🔍 Starting constraint detection on ${image.bitmap.width}x${image.bitmap.height} image`);
    
    // Calculate grid cell dimensions
    const gridWidth = verticalGrid.gridWidth;
    const gridHeight = horizontalGrid.gridHeight;
    const cellWidth = gridWidth / GRID_SIZE;
    const cellHeight = gridHeight / GRID_SIZE;
    
    // Get image dimensions for boundary checking
    const imageWidth = image.bitmap.width;
    const imageHeight = image.bitmap.height;
    
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
                const verticalGridRegion = image
                    .clone()
                    .crop({
                        x: cropX, 
                        y: cropY, 
                        w: cropW, 
                        h: cropH
                });
                
                const debugInfo = {
                    puzzleNumber,
                    position: `V${col}-${col+1}_R${row}`,
                    cropX,
                    cropY,
                    constraintsImagesFolder
                };
                const verticalSymbol = await detectSymbolInRegion(verticalGridRegion, debugInfo);
                
                console.log(`🔍 Vertical grid line ${col}-${col+1}, row ${row}: ${verticalSymbol || 'none'}`);
                
                if (verticalSymbol) {
                    constraints.push([
                        `${row},${col}`, 
                        `${row},${col + 1}`, 
                        verticalSymbol
                    ]);
                    // Store area for orange border drawing
                    detectedAreas.push({
                        x: cropX,
                        y: cropY,
                        w: cropW,
                        h: cropH,
                        symbol: verticalSymbol,
                        position: debugInfo.position
                    });
                }
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
                const horizontalGridRegion = image
                    .clone()
                    .crop({
                        x: cropX, 
                        y: cropY, 
                        w: cropW, 
                        h: cropH
                });
                
                const debugInfo = {
                    puzzleNumber,
                    position: `H${row}-${row+1}_C${col}`,
                    cropX,
                    cropY,
                    constraintsImagesFolder
                };
                const horizontalSymbol = await detectSymbolInRegion(horizontalGridRegion, debugInfo);
                
                console.log(`🔍 Horizontal grid line ${row}-${row+1}, col ${col}: ${horizontalSymbol || 'none'}`);
                
                if (horizontalSymbol) {
                    constraints.push([
                        `${row},${col}`, 
                        `${row + 1},${col}`, 
                        horizontalSymbol
                    ]);
                    // Store area for orange border drawing
                    detectedAreas.push({
                        x: cropX,
                        y: cropY,
                        w: cropW,
                        h: cropH,
                        symbol: horizontalSymbol,
                        position: debugInfo.position
                    });
                }
            }
        }
    }
    
    // Draw orange borders on detected areas and save the updated constraint areas image
    if (detectedAreas.length > 0) {
        await drawDetectedSymbolsOnAreasImage(detectedAreas, puzzleNumber, constraintsImagesFolder);
    }
    
    return constraints;
}

/**
 * Detects x or = symbol in a configurable pixel region
 * Uses template matching and line detection as fallback
 */
async function detectSymbolInRegion(region: typeof Jimp.prototype, debugInfo?: { puzzleNumber: number, position: string, cropX: number, cropY: number, constraintsImagesFolder: string }): Promise<string | null> {
    try {
        // Run both approaches for comparison
        const xScore2 = detectXLinesApproach2(region);
        const equalsScore2 = detectEqualsLinesApproach2(region);
        
        const xScore3 = detectXLinesApproach3(region);
        const equalsScore3 = detectEqualsLinesApproach3(region);
        
        console.log(`  Geometric - X: ${xScore2.toFixed(1)}, =: ${equalsScore2.toFixed(1)}`);
        console.log(`  Template  - X: ${xScore3.toFixed(1)}%, =: ${equalsScore3.toFixed(1)}%`);
        
        // Use Approach 3 (Template Matching) as primary - much more accurate!
        const xScore = xScore3;
        const equalsScore = equalsScore3;
        
        // DEBUG: Add detailed analysis for the problematic case
        if (debugInfo && debugInfo.position === 'V0-1_R5') {
            console.log(`\n🔍 DEBUGGING ${debugInfo.position} (expected X, detected =):`);
            console.log(`    Image size: ${region.bitmap.width}x${region.bitmap.height}`);
            
            // Call the detection functions again with detailed logging
            const detailedXScore = detectXLinesApproach2WithDebug(region);
            const detailedEqualsScore = detectEqualsLinesApproach2WithDebug(region);
            console.log(`    X detailed score: ${detailedXScore}, = detailed score: ${detailedEqualsScore}\n`);
        }
        
        // Template matching decision logic (percentage-based scores 0-100)
        const minConfidence = 30.0;   // Minimum percentage for detection
        const minMargin = 10.0;        // Minimum percentage difference for clear decision
        const scoreDifference = Math.abs(xScore - equalsScore);
        console.log(`    Winner: ${xScore > equalsScore ? 'X' : '='}, Diff: ${scoreDifference.toFixed(1)}%`)
        
        let detectedSymbol: string | null = null;
        
        // Template matching decision logic - percentage-based
        let adaptiveMargin = minMargin;
        
        // For strong patterns, be more decisive
        if (xScore > 80 && equalsScore > 80) {
            adaptiveMargin = 5.0;  // Smaller margin when both are very confident
        } else if (xScore > 60 && equalsScore > 60) {
            adaptiveMargin = 8.0;  // Slightly smaller margin for good patterns
        }
        
        // Require both minimum confidence AND sufficient margin for clear decision
        if (xScore > minConfidence && xScore > equalsScore && scoreDifference >= adaptiveMargin) {
            detectedSymbol = 'x';
        } else if (equalsScore > minConfidence && equalsScore > xScore && scoreDifference >= adaptiveMargin) {
            detectedSymbol = '=';
        }
        // If scores are too close, don't make a decision (return null)
        
        console.log(`    Adaptive margin: ${adaptiveMargin}, Decision: ${detectedSymbol || 'none'}`)

        return detectedSymbol;
    } catch (error) {
        console.error('Error detecting symbol:', error);
        return null;
    }
}

/**
 * Detects X pattern by analyzing diagonal line intersections
 */
function detectXPattern(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Apply edge detection
    const edges = region.clone().convolute([
        [-1, -1, -1],
        [-1,  8, -1],
        [-1, -1, -1]
    ]);
    
    let mainDiagPixels = 0;
    let antiDiagPixels = 0;
    let horizontalPixels = 0;
    let verticalPixels = 0;
    let totalEdgePixels = 0;
    const threshold = 120;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const diagonalTolerance = 2;
    const lineTolerance = 1;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const gray = edges.bitmap.data[pixelIdx];
            
            if (gray > threshold) {
                totalEdgePixels++;
                
                // Calculate distances to different line types
                const mainDiagDist = Math.abs((x - centerX) - (y - centerY));
                const antiDiagDist = Math.abs((x - centerX) + (y - centerY));
                const horizontalDist = Math.abs(y - centerY);
                const verticalDist = Math.abs(x - centerX);
                
                // Count pixels on each line type
                if (mainDiagDist <= diagonalTolerance) mainDiagPixels++;
                if (antiDiagDist <= diagonalTolerance) antiDiagPixels++;
                if (horizontalDist <= lineTolerance) horizontalPixels++;
                if (verticalDist <= lineTolerance) verticalPixels++;
            }
        }
    }
    
    if (totalEdgePixels < 5) return 0;
    
    const mainDiagRatio = mainDiagPixels / totalEdgePixels;
    const antiDiagRatio = antiDiagPixels / totalEdgePixels;
    const horizontalRatio = horizontalPixels / totalEdgePixels;
    const verticalRatio = verticalPixels / totalEdgePixels;
    
    // X pattern should have:
    // 1. Strong diagonal presence (both diagonals)
    // 2. Some tolerance for horizontal/vertical lines (not too restrictive)
    const diagonalScore = Math.min(mainDiagRatio, antiDiagRatio) * 15;
    const crossingBonus = (mainDiagRatio > 0.1 && antiDiagRatio > 0.1) ? 3 : 0;
    const horizontalPenalty = horizontalRatio * 3; // Reduced penalty 
    const verticalPenalty = verticalRatio * 2;     // Reduced penalty
    
    return Math.max(0, diagonalScore + crossingBonus - horizontalPenalty - verticalPenalty);
}

/**
 * Detects = pattern by analyzing horizontal lines
 */
function detectEqualsPattern(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Apply edge detection
    const edges = region.clone().convolute([
        [-1, -1, -1],
        [-1,  8, -1],
        [-1, -1, -1]
    ]);
    
    let upperLinePixels = 0;
    let lowerLinePixels = 0;
    let middleLinePixels = 0;
    let totalEdgePixels = 0;
    let diagonalPixels = 0;
    let verticalPixels = 0;
    const threshold = 120;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Define horizontal line zones for = symbol (upper, middle, lower)
    const upperZone = height * 0.25;   // Around 25% height
    const middleZone = height * 0.5;   // Around 50% height  
    const lowerZone = height * 0.75;   // Around 75% height
    const lineThickness = 2;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const gray = edges.bitmap.data[pixelIdx];
            
            if (gray > threshold) {
                totalEdgePixels++;
                
                // Check for diagonal patterns (should be minimal for =)
                const mainDiagDist = Math.abs((x - centerX) - (y - centerY));
                const antiDiagDist = Math.abs((x - centerX) + (y - centerY));
                
                if (mainDiagDist <= 1 || antiDiagDist <= 1) {
                    diagonalPixels++;
                }
                
                // Check for vertical patterns (should be minimal for =)
                const verticalDist = Math.abs(x - centerX);
                if (verticalDist <= 1) {
                    verticalPixels++;
                }
                
                // Check if pixel is in horizontal line zones
                if (Math.abs(y - upperZone) <= lineThickness) {
                    upperLinePixels++;
                } else if (Math.abs(y - middleZone) <= lineThickness) {
                    middleLinePixels++;
                } else if (Math.abs(y - lowerZone) <= lineThickness) {
                    lowerLinePixels++;
                }
            }
        }
    }
    
    if (totalEdgePixels < 5) return 0;
    
    const upperLineRatio = upperLinePixels / totalEdgePixels;
    const middleLineRatio = middleLinePixels / totalEdgePixels;
    const lowerLineRatio = lowerLinePixels / totalEdgePixels;
    const diagonalRatio = diagonalPixels / totalEdgePixels;
    const verticalRatio = verticalPixels / totalEdgePixels;
    
    // = pattern should have:
    // 1. Strong horizontal lines (prefer upper/lower over middle)
    // 2. Some tolerance for diagonal/vertical presence
    const horizontalScore = Math.max(upperLineRatio, lowerLineRatio) * 12;
    const twoLinesBonus = (upperLineRatio > 0.05 && lowerLineRatio > 0.05) ? 4 : 0;
    const avoidMiddleBonus = (middleLineRatio < 0.1) ? 1 : 0; // = shouldn't have strong middle line
    const diagonalPenalty = diagonalRatio * 4; // Reduced penalty for diagonals
    const verticalPenalty = verticalRatio * 2; // Reduced penalty for verticals
    
    return Math.max(0, horizontalScore + twoLinesBonus + avoidMiddleBonus - diagonalPenalty - verticalPenalty);
}

/**
 * Calculates similarity between two images using normalized cross-correlation
 */
function calculateTemplateSimilarity(image: typeof Jimp.prototype, template: typeof Jimp.prototype): number {
    try {
        // Resize template to match region size if needed
        const resizedTemplate = template.clone().resize({ w: image.bitmap.width, h: image.bitmap.height });
        
        // Convert to grayscale arrays
        const imageData = image.bitmap.data;
        const templateData = resizedTemplate.bitmap.data;
        
        let sum = 0;
        let imageSum = 0;
        let templateSum = 0;
        let imageSumSq = 0;
        let templateSumSq = 0;
        
        // Calculate correlation
        for (let i = 0; i < imageData.length; i += 4) {
            const imageVal = imageData[i]; // Grayscale value (R channel)
            const templateVal = templateData[i];
            
            sum += imageVal * templateVal;
            imageSum += imageVal;
            templateSum += templateVal;
            imageSumSq += imageVal * imageVal;
            templateSumSq += templateVal * templateVal;
        }
        
        const n = imageData.length / 4;
        
        // Avoid division by zero
        if (n === 0) return 0;
        
        const numerator = n * sum - imageSum * templateSum;
        const imageDenom = n * imageSumSq - imageSum * imageSum;
        const templateDenom = n * templateSumSq - templateSum * templateSum;
        
        if (imageDenom <= 0 || templateDenom <= 0) return 0;
        
        const denominator = Math.sqrt(imageDenom * templateDenom);
        
        // Return normalized correlation coefficient (between -1 and 1)
        const correlation = numerator / denominator;
        
        // Convert to positive similarity score (0 to 1)
        return Math.max(0, correlation);
    } catch (error) {
        console.error('Template similarity calculation error:', error);
        return 0;
    }
}

/**
 * Detects line patterns to identify x or = symbols
 * Uses edge detection and line counting
 */
function detectLinePattern(region: typeof Jimp.prototype): string | null {
    try {
        // Apply edge detection
        const edges = region.clone().convolute([
            [-1, -1, -1],
            [-1,  8, -1],
            [-1, -1, -1]
        ]);
        
        // Count strong edges (pixels above threshold)
        const threshold = 128;
        let strongPixels = 0;
        let totalPixels = 0;
        
        edges.scan(0, 0, edges.bitmap.width, edges.bitmap.height, (x: number, y: number, idx: number) => {
            const gray = edges.bitmap.data[idx];
            if (gray > threshold) strongPixels++;
            totalPixels++;
        });
        
        const edgeDensity = strongPixels / totalPixels;
        
        // Analyze line patterns
        if (edgeDensity > 0.15) {
            // Check for diagonal lines (x pattern)
            const diagonalScore = detectDiagonalLines(edges);
            if (diagonalScore > 0.3) return 'x';
            
            // Check for horizontal lines (= pattern)
            const horizontalScore = detectHorizontalLines(edges);
            if (horizontalScore > 0.3) return '=';
        }
        
        return null;
    } catch {
        return null;
    }
}

/**
 * Detects diagonal lines (characteristic of x symbol)
 */
function detectDiagonalLines(edges: typeof Jimp.prototype): number {
    let diagonalPixels = 0;
    let totalPixels = 0;
    
    edges.scan(0, 0, edges.bitmap.width, edges.bitmap.height, (x: number, y: number, idx: number) => {
        const gray = edges.bitmap.data[idx];
        if (gray > 128) {
            // Check if pixel is on diagonal lines
            const centerX = edges.bitmap.width / 2;
            const centerY = edges.bitmap.height / 2;
            const distanceFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
            
            if (distanceFromCenter < 15) diagonalPixels++;
        }
        totalPixels++;
    });
    
    return diagonalPixels / totalPixels;
}

/**
 * Detects horizontal lines (characteristic of = symbol)
 */
function detectHorizontalLines(edges: typeof Jimp.prototype): number {
    let horizontalPixels = 0;
    let totalPixels = 0;
    
    edges.scan(0, 0, edges.bitmap.width, edges.bitmap.height, (x: number, y: number, idx: number) => {
        const gray = edges.bitmap.data[idx];
        if (gray > 128) {
            // Check if pixel is on horizontal lines
            const centerY = edges.bitmap.height / 2;
            if (Math.abs(y - centerY) < 10) horizontalPixels++;
        }
        totalPixels++;
    });
    
    return horizontalPixels / totalPixels;
}

/**
 * Simple X detection: Look for two diagonal lines crossing
 */
function detectXLines(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Apply edge detection to find lines
    const edges = region.clone().convolute([
        [-1, -1, -1],
        [-1,  8, -1],
        [-1, -1, -1]
    ]);
    
    let mainDiagonalPixels = 0;
    let antiDiagonalPixels = 0;
    let totalPixels = 0;
    const threshold = 100;
    
    // Count pixels on each diagonal
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const gray = edges.bitmap.data[pixelIdx];
            totalPixels++;
            
            if (gray > threshold) {
                // Check if pixel is on main diagonal (top-left to bottom-right)
                // Allow some tolerance for line thickness
                const mainDiagDistance = Math.abs(x - y);
                if (mainDiagDistance <= 2) {
                    mainDiagonalPixels++;
                }
                
                // Check if pixel is on anti-diagonal (top-right to bottom-left)
                const antiDiagDistance = Math.abs((width - 1 - x) - y);
                if (antiDiagDistance <= 2) {
                    antiDiagonalPixels++;
                }
            }
        }
    }
    
    // X pattern needs both diagonals to be present
    const mainDiagRatio = mainDiagonalPixels / totalPixels;
    const antiDiagRatio = antiDiagonalPixels / totalPixels;
    
    // X detection - be more lenient to compete with = detection
    const mainDiagPresent = mainDiagRatio > 0.01;
    const antiDiagPresent = antiDiagRatio > 0.01;
    const bothDiagonalsPresent = mainDiagPresent && antiDiagPresent;
    
    // Give some score even for single diagonal, but bonus for both
    let score = 0;
    if (bothDiagonalsPresent) {
        score = Math.min(mainDiagRatio, antiDiagRatio) * 80; // Higher multiplier
    } else if (mainDiagPresent || antiDiagPresent) {
        score = Math.max(mainDiagRatio, antiDiagRatio) * 30; // Some score for single diagonal
    }
    
    return score;
}

/**
 * Simple = detection: Look for two horizontal lines
 */
function detectEqualsLines(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Apply edge detection to find lines
    const edges = region.clone().convolute([
        [-1, -1, -1],
        [-1,  8, -1],
        [-1, -1, -1]
    ]);
    
    const threshold = 90; // Higher threshold to be more selective
    
    // Count horizontal line pixels in different horizontal bands (more flexible)
    const upperBand = Math.floor(height * 0.33);   // Around 33% from top
    const lowerBand = Math.floor(height * 0.67);   // Around 67% from top
    const bandThickness = 4; // Allow more thickness for the lines
    
    let upperLinePixels = 0;
    let lowerLinePixels = 0;
    let totalPixels = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const gray = edges.bitmap.data[pixelIdx];
            totalPixels++;
            
            if (gray > threshold) {
                // Check if pixel is in upper horizontal line area
                if (Math.abs(y - upperBand) <= bandThickness) {
                    upperLinePixels++;
                }
                
                // Check if pixel is in lower horizontal line area
                if (Math.abs(y - lowerBand) <= bandThickness) {
                    lowerLinePixels++;
                }
            }
        }
    }
    
    // = pattern needs horizontal lines (more lenient approach)
    const upperLineRatio = upperLinePixels / totalPixels;
    const lowerLineRatio = lowerLinePixels / totalPixels;
    
    // = should have clear horizontal lines with good distribution
    const strongerLine = Math.max(upperLineRatio, lowerLineRatio);
    const bothLinesPresent = (upperLineRatio > 0.018 && lowerLineRatio > 0.018);
    const strongSingleLine = strongerLine > 0.025;
    
    // Require clearer evidence for = pattern
    let score = 0;
    if (bothLinesPresent) {
        // Strong preference for both horizontal lines
        score = Math.min(upperLineRatio, lowerLineRatio) * 50;
    } else if (strongSingleLine) {
        // Single very strong horizontal line
        score = strongerLine * 25;
    }
    
    return score;
}

/**
 * APPROACH 1: Line Continuity Analysis
 * Analyzes overall patterns without requiring perfect continuity
 */
function detectXLinesApproach1(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Work directly with grayscale (no edge detection)
    const gray = region.clone().greyscale();
    
    let diagonalPixels = 0;
    let horizontalPixels = 0;
    let verticalPixels = 0;
    let totalDarkPixels = 0;
    
    const threshold = 128; // Dark pixels (lines are typically dark)
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const grayValue = gray.bitmap.data[pixelIdx];
            
            if (grayValue < threshold) { // Dark pixel (potential line)
                totalDarkPixels++;
                
                // Check if pixel is in diagonal bands (wider tolerance for gaps)
                const centerX = width / 2;
                const centerY = height / 2;
                const mainDiagDist = Math.abs((x - centerX) - (y - centerY));
                const antiDiagDist = Math.abs((x - centerX) + (y - centerY));
                const horizontalDist = Math.abs(y - centerY);
                const verticalDist = Math.abs(x - centerX);
                
                // Count pixels in different direction bands
                if (mainDiagDist <= 4 || antiDiagDist <= 4) {
                    diagonalPixels++;
                }
                if (horizontalDist <= 2) {
                    horizontalPixels++;
                }
                if (verticalDist <= 2) {
                    verticalPixels++;
                }
            }
        }
    }
    
    if (totalDarkPixels < 3) return 0;
    
    const diagonalRatio = diagonalPixels / totalDarkPixels;
    const horizontalRatio = horizontalPixels / totalDarkPixels;
    const verticalRatio = verticalPixels / totalDarkPixels;
    
    // X should have strong diagonal presence, weak horizontal/vertical
    const diagonalScore = diagonalRatio * 100;
    const penalty = (horizontalRatio + verticalRatio) * 25;
    
    return Math.max(0, diagonalScore - penalty);
}

function detectEqualsLinesApproach1(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Work directly with grayscale
    const gray = region.clone().greyscale();
    
    let upperHalfPixels = 0;
    let lowerHalfPixels = 0;
    let diagonalPixels = 0;
    let totalDarkPixels = 0;
    
    const threshold = 128;
    const midY = height / 2;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const grayValue = gray.bitmap.data[pixelIdx];
            
            if (grayValue < threshold) {
                totalDarkPixels++;
                
                // Count pixels in upper vs lower half
                if (y < midY) {
                    upperHalfPixels++;
                } else {
                    lowerHalfPixels++;
                }
                
                // Check for diagonal patterns (penalty)
                const centerX = width / 2;
                const centerY = height / 2;
                const mainDiagDist = Math.abs((x - centerX) - (y - centerY));
                const antiDiagDist = Math.abs((x - centerX) + (y - centerY));
                
                if (mainDiagDist <= 3 || antiDiagDist <= 3) {
                    diagonalPixels++;
                }
            }
        }
    }
    
    if (totalDarkPixels < 3) return 0;
    
    const upperRatio = upperHalfPixels / totalDarkPixels;
    const lowerRatio = lowerHalfPixels / totalDarkPixels;
    const diagonalRatio = diagonalPixels / totalDarkPixels;
    
    // = should have pixels in both halves, minimal diagonals
    const balanceScore = Math.min(upperRatio, lowerRatio) * 200;
    const penalty = diagonalRatio * 50;
    
    return Math.max(0, balanceScore - penalty);
}

/**
 * APPROACH 2: Connected Component Analysis - IMPROVED
 * Enhanced X detection: requires diagonal crossing patterns, rejects horizontal lines
 */
function detectXLinesApproach2(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Work with grayscale
    const gray = region.clone().greyscale();
    const threshold = 128;
    const centerX = width / 2;
    const centerY = height / 2;
    const centralZoneSize = 4; // Zone around center where intersection is allowed
    
    // Find dark pixels and categorize them
    const darkPixels: {x: number, y: number}[] = [];
    let mainDiagCount = 0;
    let antiDiagCount = 0;
    let horizontalLinesOutsideCenter = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const grayValue = gray.bitmap.data[pixelIdx];
            if (grayValue < threshold) {
                darkPixels.push({x, y});
                
                // Check diagonal alignment (allowing for gaps in diagonal lines)
                const mainDiagDist = Math.abs((x - centerX) - (y - centerY));
                const antiDiagDist = Math.abs((x - centerX) + (y - centerY));
                
                if (mainDiagDist <= 3) mainDiagCount++;
                if (antiDiagDist <= 3) antiDiagCount++;
                
                // Check for problematic horizontal patterns OUTSIDE the central intersection
                const distanceFromCenter = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
                const isOutsideCentralZone = distanceFromCenter > centralZoneSize;
                
                if (isOutsideCentralZone) {
                    // Look for horizontal line segments that extend beyond center
                    let horizontalPixelsInRow = 0;
                    const scanStart = Math.max(0, x - 3);
                    const scanEnd = Math.min(width - 1, x + 3);
                    
                    for (let scanX = scanStart; scanX <= scanEnd; scanX++) {
                        const scanPixelIdx = (y * width + scanX) * 4;
                        const scanGrayValue = gray.bitmap.data[scanPixelIdx];
                        if (scanGrayValue < threshold) {
                            horizontalPixelsInRow++;
                        }
                    }
                    
                    // If we find extended horizontal patterns outside center, it's likely a = symbol
                    if (horizontalPixelsInRow >= 4) {
                        horizontalLinesOutsideCenter++;
                    }
                }
            }
        }
    }
    
    if (darkPixels.length < 3) return 0;
    
    // REJECT if we find significant horizontal line patterns outside center
    // But be more lenient if we have good diagonal evidence
    const diagonalEvidence = (mainDiagCount + antiDiagCount) / darkPixels.length;
    const horizontalThreshold = diagonalEvidence > 0.4 ? 20 : 6; // More lenient if strong diagonals
    
    if (horizontalLinesOutsideCenter > horizontalThreshold) {
        return 0; // Too many horizontal patterns - likely = symbol, not X
    }
    
    const mainDiagRatio = mainDiagCount / darkPixels.length;
    const antiDiagRatio = antiDiagCount / darkPixels.length;
    
    // X MUST have pixels on BOTH diagonals (crossing requirement) - STRICTER
    if (mainDiagRatio < 0.08 || antiDiagRatio < 0.08) { // Increased from 0.06 to 0.08 for stricter X detection
        return 0; // Not enough diagonal coverage on both sides
    }
    
    // ADDITIONAL REQUIREMENT: X must have substantial diagonal evidence
    if (diagonalEvidence < 0.3) { // Require at least 30% of pixels to be diagonal
        return 0; // Not diagonal enough to be an X
    }
    
    // Enhanced scoring that strongly rewards good diagonal crossing patterns
    const crossingScore = Math.min(mainDiagRatio, antiDiagRatio) * 220; // Increased for better competition
    const balanceBonus = (Math.abs(mainDiagRatio - antiDiagRatio) < 0.3) ? 40 : 0; // Increased bonus
    const strongCrossingBonus = (mainDiagRatio > 0.12 && antiDiagRatio > 0.12) ? 80 : 0; // Increased significantly
    
    // Additional bonus for having substantial diagonal content
    const totalDiagonalRatio = (mainDiagCount + antiDiagCount) / (darkPixels.length * 2); // Some overlap expected
    const substantialDiagonalBonus = totalDiagonalRatio > 0.25 ? 60 : 0; // Increased from 40
    
    // Special bonus for X patterns that have some horizontal artifacts but strong diagonals
    let horizontalToleranceBonus = 0;
    if (diagonalEvidence > 0.5 && horizontalLinesOutsideCenter > 3) {
        horizontalToleranceBonus = 50; // Bonus for X patterns with horizontal artifacts
    }
    
    return crossingScore + balanceBonus + strongCrossingBonus + substantialDiagonalBonus + horizontalToleranceBonus;
}

/**
 * Debug version of X detection with detailed logging
 */
function detectXLinesApproach2WithDebug(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    console.log(`    🔍 X Detection Debug:`);
    console.log(`       Region: ${width}x${height}`);
    
    const gray = region.clone().greyscale();
    const threshold = 128;
    const centerX = width / 2;
    const centerY = height / 2;
    const centralZoneSize = 4;
    
    const darkPixels: {x: number, y: number}[] = [];
    let mainDiagCount = 0;
    let antiDiagCount = 0;
    let horizontalLinesOutsideCenter = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const grayValue = gray.bitmap.data[pixelIdx];
            if (grayValue < threshold) {
                darkPixels.push({x, y});
                
                const mainDiagDist = Math.abs((x - centerX) - (y - centerY));
                const antiDiagDist = Math.abs((x - centerX) + (y - centerY));
                
                if (mainDiagDist <= 3) mainDiagCount++;
                if (antiDiagDist <= 3) antiDiagCount++;
                
                const distanceFromCenter = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
                const isOutsideCentralZone = distanceFromCenter > centralZoneSize;
                
                if (isOutsideCentralZone) {
                    let horizontalPixelsInRow = 0;
                    const scanStart = Math.max(0, x - 3);
                    const scanEnd = Math.min(width - 1, x + 3);
                    
                    for (let scanX = scanStart; scanX <= scanEnd; scanX++) {
                        const scanPixelIdx = (y * width + scanX) * 4;
                        const scanGrayValue = gray.bitmap.data[scanPixelIdx];
                        if (scanGrayValue < threshold) {
                            horizontalPixelsInRow++;
                        }
                    }
                    
                    if (horizontalPixelsInRow >= 4) {
                        horizontalLinesOutsideCenter++;
                    }
                }
            }
        }
    }
    
    console.log(`       Dark pixels: ${darkPixels.length}`);
    console.log(`       Main diagonal: ${mainDiagCount}, Anti diagonal: ${antiDiagCount}`);
    console.log(`       Horizontal lines outside center: ${horizontalLinesOutsideCenter}`);
    
    if (darkPixels.length < 3) {
        console.log(`       ❌ Too few dark pixels (${darkPixels.length})`);
        return 0;
    }
    
    // REJECT if we find significant horizontal line patterns outside center
    // But be more lenient if we have good diagonal evidence
    const diagonalEvidence = (mainDiagCount + antiDiagCount) / darkPixels.length;
    const horizontalThreshold = diagonalEvidence > 0.4 ? 20 : 6; // More lenient if strong diagonals
    
    console.log(`       Diagonal evidence: ${diagonalEvidence.toFixed(3)}, horizontal threshold: ${horizontalThreshold}`);
    
    if (horizontalLinesOutsideCenter > horizontalThreshold) {
        console.log(`       ❌ Too many horizontal patterns (${horizontalLinesOutsideCenter} > ${horizontalThreshold})`);
        return 0;
    }
    
    const mainDiagRatio = mainDiagCount / darkPixels.length;
    const antiDiagRatio = antiDiagCount / darkPixels.length;
    
    console.log(`       Main diag ratio: ${mainDiagRatio.toFixed(3)}, Anti diag ratio: ${antiDiagRatio.toFixed(3)}`);
    
    if (mainDiagRatio < 0.06 || antiDiagRatio < 0.06) {
        console.log(`       ❌ Insufficient diagonal coverage (${mainDiagRatio.toFixed(3)}, ${antiDiagRatio.toFixed(3)})`);
        return 0;
    }
    
    const crossingScore = Math.min(mainDiagRatio, antiDiagRatio) * 220;
    const balanceBonus = (Math.abs(mainDiagRatio - antiDiagRatio) < 0.3) ? 40 : 0;
    const strongCrossingBonus = (mainDiagRatio > 0.12 && antiDiagRatio > 0.12) ? 80 : 0;
    const totalDiagonalRatio = (mainDiagCount + antiDiagCount) / (darkPixels.length * 2);
    const substantialDiagonalBonus = totalDiagonalRatio > 0.25 ? 60 : 0;
    
    // Special bonus for X patterns that have some horizontal artifacts but strong diagonals
    let horizontalToleranceBonus = 0;
    if (diagonalEvidence > 0.5 && horizontalLinesOutsideCenter > 3) {
        horizontalToleranceBonus = 50; // Bonus for X patterns with horizontal artifacts
    }
    
    const finalScore = crossingScore + balanceBonus + strongCrossingBonus + substantialDiagonalBonus + horizontalToleranceBonus;
    
    console.log(`       Crossing: ${crossingScore.toFixed(1)}, Balance: ${balanceBonus}, Strong: ${strongCrossingBonus}, Substantial: ${substantialDiagonalBonus}, Tolerance: ${horizontalToleranceBonus}`);
    console.log(`       ✅ Final X score: ${finalScore.toFixed(1)}`);
    
    return finalScore;
}

function detectEqualsLinesApproach2(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Work with grayscale
    const gray = region.clone().greyscale();
    const threshold = 128;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Let = detection compete fairly - no diagonal rejection
    // The X detector should be strong enough to win when it's actually an X
    
    // Enhanced gap-tolerant horizontal line detection
    const horizontalLines: { y: number, segments: number[], totalPixels: number, effectiveSpan: number, gapTolerance: number }[] = [];
    
    for (let y = 0; y < height; y++) {
        // Advanced gap-tolerant line segment detection
        const lineSegments: {start: number, end: number, pixels: number}[] = [];
        let currentSegmentStart = -1;
        let currentSegmentPixels = 0;
        
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const grayValue = gray.bitmap.data[pixelIdx];
            const isDark = grayValue < threshold;
            
            if (isDark) {
                if (currentSegmentStart === -1) {
                    currentSegmentStart = x; // Start new segment
                }
                currentSegmentPixels++;
            } else {
                // End current segment if we had one
                if (currentSegmentStart !== -1) {
                    lineSegments.push({
                        start: currentSegmentStart,
                        end: x - 1,
                        pixels: currentSegmentPixels
                    });
                    currentSegmentStart = -1;
                    currentSegmentPixels = 0;
                }
            }
        }
        
        // Close final segment if needed
        if (currentSegmentStart !== -1) {
            lineSegments.push({
                start: currentSegmentStart,
                end: width - 1,
                pixels: currentSegmentPixels
            });
        }
        
        // Analyze segments to detect horizontal lines with gaps
        if (lineSegments.length > 0) {
            const totalPixels = lineSegments.reduce((sum, seg) => sum + seg.pixels, 0);
            const firstStart = lineSegments[0].start;
            const lastEnd = lineSegments[lineSegments.length - 1].end;
            const effectiveSpan = lastEnd - firstStart + 1;
            
            // More lenient criteria for = detection with gaps
            const hasSubstantialContent = totalPixels >= 4; // Allow smaller pixel counts
            const hasReasonableSpan = effectiveSpan >= 5 && effectiveSpan <= 20; // Wider span tolerance
            const hasGoodCoverage = lineSegments.length <= 5; // Allow up to 5 segments (tolerating gaps)
            
            if (hasSubstantialContent && hasReasonableSpan && hasGoodCoverage) {
                // Calculate gap tolerance metric
                const gapCount = lineSegments.length - 1;
                const averageGapSize = gapCount > 0 ? (effectiveSpan - totalPixels) / gapCount : 0;
                const gapTolerance = averageGapSize <= 3 ? 1.0 : 0.7; // Penalize very large gaps
                
                horizontalLines.push({
                    y: y,
                    segments: lineSegments.map(seg => seg.pixels),
                    totalPixels: totalPixels,
                    effectiveSpan: effectiveSpan,
                    gapTolerance: gapTolerance
                });
            }
        }
    }
    
    // = symbols MUST have exactly 2 well-separated horizontal lines
    if (horizontalLines.length < 2) {
        return 0; // Reject single lines - they can't be = symbols
    }
    
    // Allow slightly more flexibility but still reject too many lines
    if (horizontalLines.length > 4) {
        return 0; // Too scattered to be a clean = symbol
    }
    
    // Sort by y position for separation analysis
    const sortedLines = horizontalLines.sort((a, b) => a.y - b.y);
    
    // Check for adequate separation between lines (more lenient)
    const separation = sortedLines[sortedLines.length - 1].y - sortedLines[0].y;
    const minSeparation = height * 0.15; // Reduced from 0.2 to 0.15 for more tolerance
    
    if (separation < minSeparation) {
        return 0; // Lines too close together - likely single thick line, not = symbol
    }
    
    // MASSIVELY Enhanced scoring to compete with X detection (which scores 200-350)
    let totalLineStrength = 0;
    
    for (const line of horizontalLines) {
        // Significantly boosted base scoring to compete with X algorithm
        const pixelScore = line.totalPixels * 12; // Quadrupled from 3 to 12
        const spanScore = Math.min(line.effectiveSpan, 15) * 8; // Quadrupled from 2 to 8
        const gapToleranceScore = line.gapTolerance * 25; // Increased from 15 to 25
        
        const lineScore = pixelScore + spanScore + gapToleranceScore;
        totalLineStrength += lineScore;
    }
    
    // MASSIVE bonus system for = detection to compete with X scores
    let separateLineBonus = 0;
    if (horizontalLines.length === 2) {
        separateLineBonus = 150; // Massively increased from 70 to 150
    } else if (horizontalLines.length === 3) {
        separateLineBonus = 80; // Increased from 30 to 80
    }
    
    // Extra bonus for good separation
    if (separation >= height * 0.25) { // Well separated lines
        separateLineBonus += 80; // Doubled from 40 to 80
    }
    
    // Additional bonus for strong horizontal characteristics
    const avgLineStrength = totalLineStrength / horizontalLines.length;
    const strongHorizontalBonus = avgLineStrength > 15 ? 60 : 0; // Increased from 25 to 60
    
    // NEW: Base competitiveness bonus to ensure = can compete with X
    const competitivenessBonus = 100; // Base boost to make = competitive
    
    return totalLineStrength + separateLineBonus + strongHorizontalBonus + competitivenessBonus;
}

/**
 * Configuration for template matching approach
 */
const TEMPLATE_CONFIG = {
    contrastMargin: 70,        // How much darker than background for symbol pixels
    minBackground: 180,        // Minimum expected background brightness (whitish)
    maxBackground: 255         // Maximum background brightness (pure white)
};

/**
 * Template patterns for X and = symbols (9x11 pixels, 1-pixel thick)
 */
const TEMPLATE_PATTERNS = {
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

/**
 * Approach 3: Template Matching with Dynamic Contrast Detection
 * Uses sliding window to match font patterns with dynamic background detection
 */
function detectXLinesApproach3(region: typeof Jimp.prototype): number {
    return detectTemplateMatch(region, 'X');
}

function detectEqualsLinesApproach3(region: typeof Jimp.prototype): number {
    return detectTemplateMatch(region, '=');
}

/**
 * Core template matching function with dynamic contrast detection
 */
function detectTemplateMatch(region: typeof Jimp.prototype, symbolType: 'X' | '='): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    // Get template pattern
    const template = TEMPLATE_PATTERNS[symbolType];
    const templateWidth = 9;
    const templateHeight = template.length;
    
    // Extract template dark pixel positions
    const templateDarkPixels: {x: number, y: number}[] = [];
    for (let y = 0; y < templateHeight; y++) {
        for (let x = 0; x < templateWidth; x++) {
            if (template[y][x] === '■') {
                templateDarkPixels.push({x, y});
            }
        }
    }
    
    if (templateDarkPixels.length === 0) return 0;
    
    // Dynamic background detection from border pixels
    const backgroundColor = getBorderPixelsAverage(region);
    
    // Background validation - skip if not whitish enough
    if (backgroundColor < TEMPLATE_CONFIG.minBackground) {
        console.log(`    Template ${symbolType}: Background too dark (${backgroundColor}), skipping`);
        return 0; // Skip processing for non-white backgrounds
    }
    
    // Calculate contrast threshold
    const contrastThreshold = backgroundColor - TEMPLATE_CONFIG.contrastMargin;
    
    // Sliding window search for best template match
    let bestMatchScore = 0;
    const maxPossiblePositions = (width - templateWidth + 1) * (height - templateHeight + 1);
    
    for (let startY = 0; startY <= height - templateHeight; startY++) {
        for (let startX = 0; startX <= width - templateWidth; startX++) {
            // Check template match at this position
            let matchedPixels = 0;
            
            for (const darkPixel of templateDarkPixels) {
                const regionX = startX + darkPixel.x;
                const regionY = startY + darkPixel.y;
                
                // Get pixel value from region
                const pixelIdx = (regionY * width + regionX) * 4;
                const grayValue = region.bitmap.data[pixelIdx]; // Grayscale value
                
                // Check if region pixel is dark enough (matches template dark pixel)
                if (grayValue < contrastThreshold) {
                    matchedPixels++;
                }
            }
            
            // Calculate match percentage for this position
            const matchPercentage = (matchedPixels / templateDarkPixels.length) * 100;
            bestMatchScore = Math.max(bestMatchScore, matchPercentage);
        }
    }
    
    return bestMatchScore;
}

/**
 * Calculate average brightness of border pixels (outer ring)
 */
function getBorderPixelsAverage(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    let sum = 0;
    let count = 0;
    
    // Top and bottom rows
    for (let x = 0; x < width; x++) {
        // Top row
        const topIdx = (0 * width + x) * 4;
        sum += region.bitmap.data[topIdx];
        count++;
        
        // Bottom row
        const bottomIdx = ((height - 1) * width + x) * 4;
        sum += region.bitmap.data[bottomIdx];
        count++;
    }
    
    // Left and right columns (excluding corners already counted)
    for (let y = 1; y < height - 1; y++) {
        // Left column
        const leftIdx = (y * width + 0) * 4;
        sum += region.bitmap.data[leftIdx];
        count++;
        
        // Right column
        const rightIdx = (y * width + (width - 1)) * 4;
        sum += region.bitmap.data[rightIdx];
        count++;
    }
    
    return count > 0 ? sum / count : 255; // Default to white if no border pixels
}

/**
 * Debug version of = detection with detailed logging
 */
function detectEqualsLinesApproach2WithDebug(region: typeof Jimp.prototype): number {
    const width = region.bitmap.width;
    const height = region.bitmap.height;
    
    console.log(`    🔍 = Detection Debug:`);
    console.log(`       Region: ${width}x${height}`);
    
    const gray = region.clone().greyscale();
    const threshold = 128;
    
    const horizontalLines: { y: number, segments: number[], totalPixels: number, effectiveSpan: number, gapTolerance: number }[] = [];
    
    for (let y = 0; y < height; y++) {
        const lineSegments: {start: number, end: number, pixels: number}[] = [];
        let currentSegmentStart = -1;
        let currentSegmentPixels = 0;
        
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const grayValue = gray.bitmap.data[pixelIdx];
            const isDark = grayValue < threshold;
            
            if (isDark) {
                if (currentSegmentStart === -1) {
                    currentSegmentStart = x;
                }
                currentSegmentPixels++;
            } else {
                if (currentSegmentStart !== -1) {
                    lineSegments.push({
                        start: currentSegmentStart,
                        end: x - 1,
                        pixels: currentSegmentPixels
                    });
                    currentSegmentStart = -1;
                    currentSegmentPixels = 0;
                }
            }
        }
        
        if (currentSegmentStart !== -1) {
            lineSegments.push({
                start: currentSegmentStart,
                end: width - 1,
                pixels: currentSegmentPixels
            });
        }
        
        if (lineSegments.length > 0) {
            const totalPixels = lineSegments.reduce((sum, seg) => sum + seg.pixels, 0);
            const firstStart = lineSegments[0].start;
            const lastEnd = lineSegments[lineSegments.length - 1].end;
            const effectiveSpan = lastEnd - firstStart + 1;
            
            const hasSubstantialContent = totalPixels >= 4;
            const hasReasonableSpan = effectiveSpan >= 5 && effectiveSpan <= 20;
            const hasGoodCoverage = lineSegments.length <= 5;
            
            if (hasSubstantialContent && hasReasonableSpan && hasGoodCoverage) {
                const gapCount = lineSegments.length - 1;
                const averageGapSize = gapCount > 0 ? (effectiveSpan - totalPixels) / gapCount : 0;
                const gapTolerance = averageGapSize <= 3 ? 1.0 : 0.7;
                
                horizontalLines.push({
                    y: y,
                    segments: lineSegments.map(seg => seg.pixels),
                    totalPixels: totalPixels,
                    effectiveSpan: effectiveSpan,
                    gapTolerance: gapTolerance
                });
                
                console.log(`       Row ${y}: ${totalPixels} pixels, span ${effectiveSpan}, ${lineSegments.length} segments`);
            }
        }
    }
    
    console.log(`       Found ${horizontalLines.length} potential horizontal lines`);
    
    if (horizontalLines.length < 2) {
        console.log(`       ❌ Too few horizontal lines (${horizontalLines.length})`);
        return 0;
    }
    
    if (horizontalLines.length > 4) {
        console.log(`       ❌ Too many horizontal lines (${horizontalLines.length})`);
        return 0;
    }
    
    const sortedLines = horizontalLines.sort((a, b) => a.y - b.y);
    const separation = sortedLines[sortedLines.length - 1].y - sortedLines[0].y;
    const minSeparation = height * 0.15;
    
    console.log(`       Line separation: ${separation}, minimum required: ${minSeparation.toFixed(1)}`);
    
    if (separation < minSeparation) {
        console.log(`       ❌ Lines too close together`);
        return 0;
    }
    
    let totalLineStrength = 0;
    for (const line of horizontalLines) {
        const pixelScore = line.totalPixels * 3;
        const spanScore = Math.min(line.effectiveSpan, 15) * 2;
        const gapToleranceScore = line.gapTolerance * 15;
        const lineScore = pixelScore + spanScore + gapToleranceScore;
        totalLineStrength += lineScore;
        console.log(`       Line at y=${line.y}: score ${lineScore.toFixed(1)} (pixels=${pixelScore/3}, span=${line.effectiveSpan})`);
    }
    
    let separateLineBonus = 0;
    if (horizontalLines.length === 2) {
        separateLineBonus = 70;
    } else if (horizontalLines.length === 3) {
        separateLineBonus = 30;
    }
    
    if (separation >= height * 0.25) {
        separateLineBonus += 40;
    }
    
    const avgLineStrength = totalLineStrength / horizontalLines.length;
    const strongHorizontalBonus = avgLineStrength > 15 ? 25 : 0;
    
    const finalScore = totalLineStrength + separateLineBonus + strongHorizontalBonus;
    
    console.log(`       Line strength: ${totalLineStrength.toFixed(1)}, Separation bonus: ${separateLineBonus}, Strong bonus: ${strongHorizontalBonus}`);
    console.log(`       ✅ Final = score: ${finalScore.toFixed(1)}`);
    
    return finalScore;
} 