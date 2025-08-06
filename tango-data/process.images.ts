import { Jimp } from 'jimp';
import { detectGrid, type GridDetectionResult } from './grid-detection/index';
import { Puzzle } from './types/shared-types';
import { buildAndValidateTangoPuzzle, ValidationResult } from './utils/build-puzzle';
import { DEBUG, DEBUG_SAVE_IMAGES, MANUALLY_CONSTRAINTS_PUZZLES, MANUALLY_PREFILLED_PUZZLES } from './utils/constants';
import { detectGridConstraintsWithManual } from './utils/constraint-detection';
import { ensureDirectoryExists, removeDirectory } from './utils/file-utils';
import { calculateCropBoundaries, processAndSaveGridImages, type CropBoundaries, type GridProcessingFolders } from './utils/image-utils';
import { filterFilesToProcess, loadExistingPuzzles, logProcessingSummary, mergeAndSortPuzzles, savePuzzlesJson } from './utils/incremental-processing';
import { getPrefilledDataWithManual } from './utils/prefill-detection';
import { printValidationSummary } from './utils/validation-summary';
import { updateVersionFile } from './utils/version-manager';
import { drawCropBoundariesAndSave, drawDetectedSymbolsOnAreasImage } from './utils/visualization';

// Configuration
const processedImagesFolder = './tango-data/processed-images';
const croppedImagesFolder = `${processedImagesFolder}/1. cropped`;
const greyImagesFolder = `${processedImagesFolder}/2. grey`;
const gridDetectedImagesFolder = `${processedImagesFolder}/3a. grid-detected`;
const gridFailedImagesFolder = `${processedImagesFolder}/3b. grid-failed`;  
const gridCroppedImagesFolder = `${processedImagesFolder}/3c. grid-cropped`;
const constraintsImagesFolder = `${processedImagesFolder}/4. constraints`;
const prefilledImagesFolder = `${processedImagesFolder}/5. prefilled`;
// Option 1: Process specific files (hardcoded list)
const files = [
    './tango-data/thumbnails/tango-260.png', // failed
    './tango-data/thumbnails/tango-288.png', // failed
];
// Option 2: Process all files in thumbnails folder
// const files = readdirSync('tango-data/thumbnails/').map(file => `tango-data/thumbnails/${file}`);
// Option 3: Process a range of puzzle numbers (e.g., puzzles 20-30)
// const files = generatePuzzleFileRange(226, 302);


async function processImages(): Promise<void> {
    removeDirectory(processedImagesFolder);
    ensureDirectoryExists(processedImagesFolder);

    const startTime = Date.now();
    const { puzzles: existingPuzzles, existingIds } = loadExistingPuzzles();
    const puzzleNumbersToSkip = [
        1,
        // 260, // person and shoes as icons
        // 288, // Person and shark
    ];
    const { filesToProcess } = filterFilesToProcess(files, existingIds, puzzleNumbersToSkip);
    
    let processedImages = 0;
    const newPuzzles: Puzzle[] = [];
    const validationResults: { fileName: string; result: ValidationResult }[] = [];
    
    for (const file of filesToProcess) {
        const fileName = file.split('/').pop();
        if (!fileName) continue; 
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

        {
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

                // 2. Convert the cropped image to greyscale and save it
                ensureDirectoryExists(greyImagesFolder);
                greyImage = croppedImage
                    .clone()
                    .greyscale()
                    .contrast(0.1);
            
                if (DEBUG_SAVE_IMAGES) await greyImage.write(`${greyImagesFolder}/${fileName}`);
            
                // 3. Detect the grid and calculate the crop boundaries
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
                    const visualCropBoundaries = {
                        x: cropBoundaries.x,
                        y: cropBoundaries.y,
                        width: cropBoundaries.width,
                        height: cropBoundaries.height
                    };
                    await drawCropBoundariesAndSave(greyImage, horizontalGrid, verticalGrid, puzzleNumber, gridDetectedImagesFolder, visualCropBoundaries);
                    
                    const folders: GridProcessingFolders = { gridCroppedImagesFolder };
                    gridCroppedImage = await processAndSaveGridImages(croppedImage, cropBoundaries, fileName, folders);
                } else {
                    ensureDirectoryExists(gridFailedImagesFolder);
                    if (DEBUG_SAVE_IMAGES) await greyImage.write(`${gridFailedImagesFolder}/${fileName}`);
                    console.log(`❌ Saved failed detection: ${gridFailedImagesFolder}/${fileName}`);
                }

                // 4. Determine the x and = symbols on the grid cropped image for determining the constraints
                if (gridCroppedImage && horizontalGrid && verticalGrid) {
                    ensureDirectoryExists(constraintsImagesFolder);
                    constraintsImage = gridCroppedImage
                        .clone()
                        .greyscale()
                        .contrast(1);

                    const { constraints, detectedAreas, imageWithDetectedSymbols } = await detectGridConstraintsWithManual(constraintsImage, horizontalGrid, verticalGrid, puzzleNumber, constraintsImagesFolder, MANUALLY_CONSTRAINTS_PUZZLES);
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

                // 5. Find the prefilled fields with their icons
                if(parsedPuzzle.constraints.length > 0) {
                    ensureDirectoryExists(prefilledImagesFolder);
                    const {prefilledData, prefilledImage} = await getPrefilledDataWithManual(gridCroppedImage, prefilledImagesFolder, fileName, MANUALLY_PREFILLED_PUZZLES);
                    if (DEBUG_SAVE_IMAGES) await prefilledImage.write(`${prefilledImagesFolder}/${fileName}`);
                    
                    parsedPuzzle.prefilled = prefilledData;
                
                    processedImages++;
                } else {
                    if (DEBUG) console.log(`❌ No grid cropped image and constraints found for: ${fileName}`);
                }

                // 6. We now need to check if we can build the Tango puzzle based on the constraints and prefilled data
                // If we can, we can save the puzzle to the parsed-images.json file
                if(Object.keys(parsedPuzzle.prefilled).length > 0) {
                    const validationResult = buildAndValidateTangoPuzzle(parsedPuzzle);
                    validationResults.push({ fileName, result: validationResult });
                    
                    if (validationResult.success && validationResult.puzzle) {
                        newPuzzles.push(validationResult.puzzle);
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

    const { allPuzzles } = mergeAndSortPuzzles(existingPuzzles, newPuzzles);
    savePuzzlesJson(allPuzzles, newPuzzles.length, existingPuzzles.length, updateVersionFile);

    printValidationSummary(validationResults);

    const endTime = Date.now();
    
    logProcessingSummary(
        processedImages, 
        newPuzzles.length, 
        existingPuzzles.length, 
        allPuzzles.length, 
        endTime - startTime
    );
}

if (require.main === module) {
    processImages().catch(error => { if (DEBUG) console.error(error); });
}
