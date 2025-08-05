import { readFileSync, writeFileSync } from 'fs';
import { Jimp } from 'jimp';
import { remote } from 'webdriverio';
import {
    createSquareGridFromLeftLine,
    createSquareGridFromTopLine,
    deriveHorizontalFromVertical,
    deriveVerticalFromHorizontal,
    detectLeftVerticalLine,
    detectTopHorizontalLine
} from './grid-detection/index';
import { Puzzle } from './types/shared-types';
import { DEBUG, DEBUG_SAVE_IMAGES, OCR } from './utils/constants';
import { detectGridConstraints } from './utils/constraint-detection';
import { ensureDirectoryExists } from './utils/file-utils';
import { removeCellIcons } from './utils/image-utils';
import { drawDetectedSymbolsOnAreasImage, drawGridLinesAndSave } from './utils/visualization';
import getData from '/Users/wimselles/Git/games/tango/node_modules/@wdio/ocr-service/dist/utils/getData.js';

// Configuration
const processedImagesFolder = './tango-data/processed-images';
const croppedImagesFolder = `${processedImagesFolder}/1. cropped`;
const ocrImagesFolder = `${processedImagesFolder}/2a. ocr`;
const undoDetectionFailedImagesFolder = `${processedImagesFolder}/2b. undo-detection-failed`;
const greyImagesFolder = `${processedImagesFolder}/3. grey`;
const gridDetectedImagesFolder = `${processedImagesFolder}/4a. grid-detected`;
const gridFailedImagesFolder = `${processedImagesFolder}/4b. grid-failed`;  
const gridCroppedImagesFolder = `${processedImagesFolder}/5. grid-cropped`;
const constraintsImagesFolder = `${processedImagesFolder}/6. constraints`;

/**
 * Logs:
 * - with OCR and debugging enabled: ~ 105 seconds
 * - with OCR: no real change
 * - without OCR: ~ 35 seconds
 * - without saving images: ~ 20 seconds
 */

const files = [
    './tango-data/thumbnails/tango-001.png',
    './tango-data/thumbnails/tango-002.png',
    './tango-data/thumbnails/tango-003.png', //  wrong on 4,2-5,2, is showed a =, should be nothing
    './tango-data/thumbnails/tango-004.png', // 6 false positives, due to seeing the bottom of the sun/moon as an  =
    './tango-data/thumbnails/tango-005.png', // only 2?
    './tango-data/thumbnails/tango-006.png',
    './tango-data/thumbnails/tango-007.png', // 7 false positives, due to seeing the bottom of the sun/moon as an  =, but also because the grid is not 100 centered
    './tango-data/thumbnails/tango-008.png', // 6 false positives, due to seeing the bottom of the sun/moon as an  =, also missed a x
    './tango-data/thumbnails/tango-009.png', // 1 wrong one due to the mouse that is in the image
    './tango-data/thumbnails/tango-010.png', // 3 false positives, due to seeing the bottom of the sun/moon as an
    // The bad images where undo can't be found
    // Not 100% correct: 27, 196, 
];

// const files = readdirSync('tango-data/thumbnails/').map(file => `tango-data/thumbnails/${file}`);

async function processImages(): Promise<void> {
    const startTime = Date.now();
    const puzzleNumbersToSkip = [27, 196];
    let processedImages = 0;
    const parsedPuzzles: Puzzle[] = [];
    
    for (const file of files) {
        const fileName = file.split('/').pop();
        const puzzleNumber = parseInt(fileName!.split('-')[1].split('.')[0]);
        const parsedPuzzle: Puzzle = {
            id: puzzleNumber,
            size: 6,
            prefilled: {},
            constraints: []
        };
        let croppedImage = null;
        let greyImage = null;
        let gridCroppedImage = null;
        let constraintsImage = null;

        if (!puzzleNumbersToSkip.includes(puzzleNumber)) {
            try {
                // 1. Start with cropping the image based on default bounds
                ensureDirectoryExists(croppedImagesFolder);

                console.log('\n🔎 Processing', fileName);
    
                const image = await Jimp.read(file);
                const { width, height } = image.bitmap;
                croppedImage = image.crop({
                    x: width * 0.3,
                    y: height * 0.13,
                    w: width * 0.4,
                    h: height * 0.8
                });
            
                if (DEBUG_SAVE_IMAGES) await croppedImage.write(`${croppedImagesFolder}/${fileName}`);
            
                if (OCR) {
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
                            y: croppedImage.bitmap.height * 0.5,
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
                                h: top - (bottom - top)
                            })
                            if (DEBUG) await croppedImage.write(`${croppedImagesFolder}/${fileName}`)
                        } else {
                            console.log(`❌ No '/undo|unde/i' word found for puzzle ${puzzleNumber}`);
                            ensureDirectoryExists(undoDetectionFailedImagesFolder);
                            if (DEBUG) await croppedImage.write(`${undoDetectionFailedImagesFolder}/${fileName}`);
                        }
                    } catch (ocrError) {
                        console.error(`❌ OCR processing failed for ${fileName}:`, ocrError);
                    }
                }

                // 3. Convert the cropped image to greyscale and save it
                ensureDirectoryExists(greyImagesFolder);
                greyImage = croppedImage
                    .clone()
                    .greyscale()
                    .contrast(0.1);
            
                if (DEBUG_SAVE_IMAGES) await greyImage.write(`${greyImagesFolder}/${fileName}`);
            
                // Simple approach: detect ONE reference line, calculate everything else geometrically
                let horizontalGrid = null;
                let verticalGrid = null;
            
                // 1. Try to detect top horizontal line (primary approach)
                const topLine = detectTopHorizontalLine(greyImage);
                if (topLine) {
                    if (DEBUG) console.log(`✅ Found top line, calculating square grid geometrically`);
                    horizontalGrid = createSquareGridFromTopLine(topLine);
                    verticalGrid = deriveVerticalFromHorizontal(horizontalGrid);
                } else {
                    // 2. Fallback: try to detect left vertical line
                    if (DEBUG) console.log(`🔄 Top line failed, trying left vertical line fallback`);
                    const leftLine = detectLeftVerticalLine(greyImage);
                    if (leftLine) {
                        if (DEBUG) console.log(`✅ Found left line, calculating square grid geometrically`);
                        verticalGrid = createSquareGridFromLeftLine(leftLine);
                        horizontalGrid = deriveHorizontalFromVertical(verticalGrid);
                    }
                }
            
                if (horizontalGrid || verticalGrid) {
                    if (DEBUG) console.log(`✅ Grid detected for: ${fileName}.\n`);
                    if (horizontalGrid) {
                        if (DEBUG) console.log(`  Horizontal:`, horizontalGrid);
                    }
                    if (verticalGrid) {
                        if (DEBUG) console.log(`  Vertical:`, verticalGrid);
                    }
                    await drawGridLinesAndSave(greyImage, horizontalGrid, verticalGrid, puzzleNumber, gridDetectedImagesFolder);
                    
                    // 5. Crop the image based on the detected grid lines
                    ensureDirectoryExists(gridCroppedImagesFolder);
                    const topLine = horizontalGrid?.topLine;
                    const bottomLine = horizontalGrid?.bottomLine;
                    const leftLine = verticalGrid?.leftLine;
                    const rightLine = verticalGrid?.rightLine;
                    const gridWidth = (rightLine?.x || 0) - (leftLine?.x || 0);
                    const gridHeight = (bottomLine?.y || 0) - (topLine?.y || 0);
                    const gridX = leftLine?.x || 0;
                    const gridY = topLine?.y || 0;
                    gridCroppedImage = await croppedImage
                        .clone()
                        .crop({ x: gridX, y: gridY, w: gridWidth, h: gridHeight })
                    if (DEBUG_SAVE_IMAGES) await gridCroppedImage.write(`${gridCroppedImagesFolder}/${fileName}`);
                    const blockOutImage = removeCellIcons(gridCroppedImage);
                    if (DEBUG_SAVE_IMAGES) await blockOutImage.write(`${gridCroppedImagesFolder}/blockOut-${fileName}`);
                } else {
                    // Save failed detection to grid-failed folder
                    const failedFolder = gridFailedImagesFolder;
                    ensureDirectoryExists(failedFolder);
                    if (DEBUG_SAVE_IMAGES) await greyImage.write(`${failedFolder}/${fileName}`);
                    console.log(`❌ Saved failed detection: ${failedFolder}/${fileName}`);
                }

                // 6. Determine the x and = symbols on the grid cropped image for determining the constraints
                if (gridCroppedImage && horizontalGrid && verticalGrid) {
                    ensureDirectoryExists(constraintsImagesFolder);
                    constraintsImage = gridCroppedImage
                        .clone()
                        .greyscale()
                        .contrast(1);

                    const { constraints, detectedAreas, imageWithDetectedSymbols } = await detectGridConstraints(constraintsImage, horizontalGrid, verticalGrid, puzzleNumber, constraintsImagesFolder);
                    if (DEBUG_SAVE_IMAGES) await imageWithDetectedSymbols.write(`${constraintsImagesFolder}/imageWithDetectedSymbols-${fileName}`);
                    
                    if (constraints.length > 0) {
                        if (DEBUG) console.log(`📋 Constraints for ${fileName}:`, constraints);
                    } else {
                        if (DEBUG) console.log(`📋 No constraints detected for ${fileName}`);
                    }
                    
                    const visualizationImage = await drawDetectedSymbolsOnAreasImage(detectedAreas, constraintsImage, horizontalGrid, verticalGrid);
                    
                    if (DEBUG_SAVE_IMAGES && detectedAreas.length > 0) {
                        await visualizationImage.write(`${constraintsImagesFolder}/${fileName}`);
                    }
                
                    parsedPuzzle.constraints = constraints;
                    
                    processedImages++;
                    
                } else {
                    if (DEBUG) console.log(`❌ No grid cropped image or grid data found for: ${fileName}`);
                }
            
            } catch (error) {
                console.error(`Failed to process ${file}:`, error);
                console.log(`Continuing with next image...`);
            }

            parsedPuzzles.push(parsedPuzzle);
        }
    }

    if (parsedPuzzles.length > 0) {
        parsedPuzzles.sort((a, b) => a.id - b.id);
        
        const jsonOutput = JSON.stringify(parsedPuzzles, null, 0);
        const outputPath = './app-data/parsed-images.json';
        
        writeFileSync(outputPath, jsonOutput, 'utf8');
        console.log(`\n📄 Generated parsed-images.json with ${parsedPuzzles.length} puzzles: ${outputPath}`);
    }

    const endTime = Date.now();

    console.log(`\n🏁 Process completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`✅ Processed ${processedImages} images`);
}

if (require.main === module) {
    processImages().catch(error => { if (DEBUG) console.error(error); });
}
