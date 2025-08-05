import { readFileSync, writeFileSync } from 'fs';
import { Jimp } from 'jimp';
import { remote } from 'webdriverio';
import { detectGrid, type GridDetectionResult } from './grid-detection/index';
import { Puzzle } from './types/shared-types';
import { buildAndValidateTangoPuzzle, ValidationResult } from './utils/build-puzzle';
import { DEBUG, DEBUG_SAVE_IMAGES, OCR } from './utils/constants';
import { detectGridConstraints } from './utils/constraint-detection';
import { ensureDirectoryExists } from './utils/file-utils';
import { calculateCropBoundaries, processAndSaveGridImages, type CropBoundaries, type GridProcessingFolders } from './utils/image-utils';
import { getPrefilledData } from './utils/prefill-detection';
import { drawCropBoundariesAndSave, drawDetectedSymbolsOnAreasImage } from './utils/visualization';
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
const prefilledImagesFolder = `${processedImagesFolder}/7. prefilled`;

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
    './tango-data/thumbnails/tango-003.png',
    './tango-data/thumbnails/tango-004.png',
    './tango-data/thumbnails/tango-005.png',
    './tango-data/thumbnails/tango-006.png',
    './tango-data/thumbnails/tango-007.png',
    './tango-data/thumbnails/tango-008.png',
    './tango-data/thumbnails/tango-010.png',
    // The bad images where undo can't be found
    // Not 100% correct: 27, 196, 
];

function printValidationSummary(validationResults: { fileName: string; result: ValidationResult }[]): void {
    const successfulValidations = validationResults.filter(v => v.result.success);
    const failedValidations = validationResults.filter(v => !v.result.success);
    
    console.log(`\n📊 VALIDATION SUMMARY`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`📈 Total puzzles processed: ${validationResults.length}`);
    console.log(`✅ Successfully validated: ${successfulValidations.length}`);
    console.log(`❌ Failed validation: ${failedValidations.length}`);
    
    if (failedValidations.length > 0) {
        console.log(`\n💥 FAILED VALIDATIONS:`);
        console.log(`─────────────────────────────────────────────────────────────`);
        
        failedValidations.forEach(({ fileName, result }, index) => {
            console.log(`\n${index + 1}. 📄 ${fileName}`);
            console.log(`   🚫 Error: ${result.error}`);
            
            if (result.details && result.details.length > 0) {
                console.log(`   📝 Details:`);
                result.details.forEach(detail => {
                    console.log(`      • ${detail}`);
                });
            }
        });
    }
    
    if (successfulValidations.length > 0) {
        console.log(`\n🎉 SUCCESSFUL VALIDATIONS:`);
        console.log(`─────────────────────────────────────────────────────────────`);
        
        const successfulPuzzleIds = successfulValidations
            .map(v => v.result.puzzle?.id)
            .filter(id => id !== undefined)
            .sort((a, b) => a! - b!);
        
        console.log(`📋 Puzzle IDs: ${successfulPuzzleIds.join(', ')}`);
    }
    
    // Calculate success rate
    const successRate = validationResults.length > 0 
        ? ((successfulValidations.length / validationResults.length) * 100).toFixed(1)
        : '0.0';
    
    console.log(`\n🎯 Validation Success Rate: ${successRate}%`);
    console.log(`═══════════════════════════════════════════════════════════════`);
}

async function processImages(): Promise<void> {
    const startTime = Date.now();
    const puzzleNumbersToSkip = [
        9, // the mouse is in the image and picked up as an x
        27, // person and shoes as icons
        108, // mouse and paperclip as icons
        124, // flag and red sign as icons
        135, // world and heart as icons
        157, // hearts and bears as icons
        173, // light bulbs and jigsaw as icons
        202, // hat and star as icons
        208, // christmas tree and snowman as icons
        220, // cats and microphone as icons
        248, // guitars and butterflies as icons
        262, // candle and flower as icons
        263, // halloween pumpkin and ghost as icons
    ];
    let processedImages = 0;
    const parsedPuzzles: Puzzle[] = [];
    const validationResults: { fileName: string; result: ValidationResult }[] = [];
    
    for (const file of files) {
        const fileName = file.split('/').pop();
        if (!fileName) continue; // Skip if filename is undefined
        const puzzleNumber = parseInt(fileName.split('-')[1].split('.')[0]);
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
            
                // Detect grid using main detection function
                const gridDetection: GridDetectionResult = detectGrid(greyImage);
                const { horizontalGrid, verticalGrid, success } = gridDetection;
            
                if (success) {
                    if (DEBUG) console.log(`✅ Grid detected for: ${fileName}.\n`);
                    
                    // Calculate crop boundaries with padding
                    const { width: imageWidth, height: imageHeight } = croppedImage.bitmap;
                    const cropBoundaries: CropBoundaries = calculateCropBoundaries(
                        horizontalGrid, 
                        verticalGrid, 
                        imageWidth, 
                        imageHeight
                    );
                    
                    // Draw visualization with crop boundaries
                    const visualCropBoundaries = {
                        x: cropBoundaries.x,
                        y: cropBoundaries.y,
                        width: cropBoundaries.width,
                        height: cropBoundaries.height
                    };
                    await drawCropBoundariesAndSave(greyImage, horizontalGrid, verticalGrid, puzzleNumber, gridDetectedImagesFolder, visualCropBoundaries);
                    
                    // Process and save grid images
                    const folders: GridProcessingFolders = { gridCroppedImagesFolder };
                    gridCroppedImage = await processAndSaveGridImages(croppedImage, cropBoundaries, fileName, folders);
                } else {
                    // Save failed detection to grid-failed folder
                    ensureDirectoryExists(gridFailedImagesFolder);
                    if (DEBUG_SAVE_IMAGES) await greyImage.write(`${gridFailedImagesFolder}/${fileName}`);
                    console.log(`❌ Saved failed detection: ${gridFailedImagesFolder}/${fileName}`);
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
                    
                } else {
                    if (DEBUG) console.log(`❌ No grid cropped image or grid data found for: ${fileName}`);
                }

                // 7. Prefill the puzzle
                if(parsedPuzzle.constraints.length > 0) {
                    ensureDirectoryExists(prefilledImagesFolder);
                    const {prefilledData, prefilledImage} = await getPrefilledData(gridCroppedImage, prefilledImagesFolder, fileName);
                    if (DEBUG_SAVE_IMAGES) await prefilledImage.write(`${prefilledImagesFolder}/${fileName}`);
                    
                    parsedPuzzle.prefilled = prefilledData;

                
                    processedImages++;
                } else {
                    if (DEBUG) console.log(`❌ No grid cropped image and constraints found for: ${fileName}`);
                }

                // 8. We now need to check if we can build the Tango puzzle based on the constraints and prefilled data
                // If we can, we can save the puzzle to the parsed-images.json file
                if(Object.keys(parsedPuzzle.prefilled).length > 0) {
                    const validationResult = buildAndValidateTangoPuzzle(parsedPuzzle);
                    validationResults.push({ fileName, result: validationResult });
                    
                    if (validationResult.success && validationResult.puzzle) {
                        parsedPuzzles.push(validationResult.puzzle);
                    }
                } else {
                    if (DEBUG) console.log(`❌ No prefilled data found for: ${fileName}`);
                    validationResults.push({ 
                        fileName, 
                        result: { 
                            success: false, 
                            error: "No prefilled data found",
                            details: ["Puzzle must have at least one prefilled cell to be valid"]
                        } 
                    });
                }
            
            } catch (error) {
                console.error(`Failed to process ${file}:`, error);
                console.log(`Continuing with next image...`);
            }
        }
    }

    if (parsedPuzzles.length > 0) {
        parsedPuzzles.sort((a, b) => a.id - b.id);
        
        const jsonOutput = JSON.stringify(parsedPuzzles, null, 0);
        const outputPath = './app-data/parsed-images.json';
        
        writeFileSync(outputPath, jsonOutput, 'utf8');
        console.log(`\n📄 Generated parsed-images.json with ${parsedPuzzles.length} puzzles: ${outputPath}`);
    }

    // Print validation summary
    printValidationSummary(validationResults);

    const endTime = Date.now();

    console.log(`\n🏁 Process completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`✅ Processed ${processedImages} images`);
}

if (require.main === module) {
    processImages().catch(error => { if (DEBUG) console.error(error); });
}
