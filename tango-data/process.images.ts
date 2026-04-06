import { Jimp } from 'jimp';
import { existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { detectGrid, type GridDetectionResult } from './grid-detection/index';
import { Puzzle } from './types/shared-types';
import { buildAndValidateTangoPuzzle, buildUniquePuzzleFromConstraints, reducePrefilledToUniqueSolution, ValidationResult } from './utils/build-puzzle';
import { DEBUG, DEBUG_SAVE_IMAGES, MANUALLY_CONSTRAINTS_PUZZLES, MANUALLY_PREFILLED_PUZZLES } from './utils/constants';
import { detectGridConstraintsWithManual } from './utils/constraint-detection';
import {
    ensureDirectoryExists,
    generatePuzzleFileRange,
    listTangoThumbnailPaths,
    removeDirectory,
} from './utils/file-utils';
import { calculateCropBoundaries, processAndSaveGridImages, type CropBoundaries, type GridProcessingFolders } from './utils/image-utils';
import { filterFilesToProcess, loadExistingPuzzles, logProcessingSummary, mergeAndSortPuzzles, savePuzzlesJson } from './utils/incremental-processing';
import { detectAllCellIcons, getPrefilledDataWithManual } from './utils/prefill-detection';
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

type CropAttempt = {
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

/**
 * Thumbnail inputs: all files in `tango-data/thumbnails/`, or a numeric range (existing .jpg/.jpeg/.png only).
 *
 * Examples:
 *   npx ts-node --project tango-data/tsconfig.json tango-data/process.images.ts
 *   npx ts-node --project tango-data/tsconfig.json tango-data/process.images.ts -- --from=503 --to=503
 */
function resolveThumbnailFileList(): string[] {
    const args = process.argv.slice(2).filter((a) => a !== '--');
    let from: number | undefined;
    let to: number | undefined;

    for (const arg of args) {
        if (arg.startsWith('--from=')) {
            from = parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--to=')) {
            to = parseInt(arg.split('=')[1], 10);
        }
    }

    if (from === undefined && to === undefined) {
        return listTangoThumbnailPaths();
    }

    if (from === undefined || to === undefined || isNaN(from) || isNaN(to)) {
        console.error(
            'When limiting puzzles, pass both --from and --to (inclusive).\n' +
                'Example: npm run process-tango-images -- --from=503 --to=503'
        );
        process.exit(1);
    }

    if (from > to) {
        console.error(`--from (${from}) must be <= --to (${to})`);
        process.exit(1);
    }

    return generatePuzzleFileRange(from, to, true);
}

const files = resolveThumbnailFileList();

async function readImageWithFallback(filePath: string): Promise<any> {
    try {
        return await Jimp.read(filePath);
    } catch (error) {
        const message = String(error);
        if (!message.includes('image/webp')) {
            throw error;
        }

        const convertedPng = `${filePath}.converted.png`;
        execSync(`sips -s format png "${filePath}" --out "${convertedPng}"`, { stdio: 'ignore' });
        try {
            return await Jimp.read(convertedPng);
        } finally {
            if (existsSync(convertedPng)) {
                unlinkSync(convertedPng);
            }
        }
    }
}

function buildCropAttempts(width: number, height: number): CropAttempt[] {
    // Keep legacy crop first for old screenshots, then fall back to wider/full-image crops.
    return [
        { label: 'legacy', x: 0.3, y: 0.13, w: 0.4, h: 0.8 },
        { label: 'full-image', x: 0.0, y: 0.0, w: 1.0, h: 1.0 },
        { label: 'wide-center', x: 0.1, y: 0.05, w: 0.8, h: 0.9 },
        { label: 'center-square', x: 0.05, y: 0.05, w: 0.9, h: 0.9 },
    ].map(attempt => ({
        label: attempt.label,
        x: width * attempt.x,
        y: height * attempt.y,
        w: width * attempt.w,
        h: height * attempt.h,
    }));
}

function deriveAllAdjacentConstraintsFromSolution(solution: Puzzle['prefilled']): Puzzle['constraints'] {
    const constraints: Puzzle['constraints'] = [];
    const size = 6;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const current = solution[`${row},${col}`];
            if (!current) continue;

            if (col + 1 < size) {
                const rightCoord = `${row},${col + 1}` as const;
                const right = solution[rightCoord];
                if (right) constraints.push([`${row},${col}`, rightCoord, current === right ? '=' : 'x']);
            }
            if (row + 1 < size) {
                const belowCoord = `${row + 1},${col}` as const;
                const below = solution[belowCoord];
                if (below) constraints.push([`${row},${col}`, belowCoord, current === below ? '=' : 'x']);
            }
        }
    }

    return constraints;
}


async function processImages(): Promise<void> {
    removeDirectory(processedImagesFolder);
    ensureDirectoryExists(processedImagesFolder);

    const startTime = Date.now();
    const { puzzles: existingPuzzles, existingIds } = loadExistingPuzzles();
    const puzzleNumbersToSkip = [
        0,
        321, // This is an 8X8 grid and we are not ready for that yet

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
        let croppedImage: any = null;
        let greyImage: any = null;
        let gridCroppedImage: any = null;
        let constraintsImage: any = null;

        {
            try {
                // 1. Start with cropping the image based on default bounds
                ensureDirectoryExists(croppedImagesFolder);

                console.log('\n🔎 Processing', fileName);
    
                const image = await readImageWithFallback(file);
                const { width, height } = image.bitmap;
                const cropAttempts = buildCropAttempts(width, height);

                let horizontalGrid: GridDetectionResult['horizontalGrid'] = null;
                let verticalGrid: GridDetectionResult['verticalGrid'] = null;
                let success = false;
                let successfulCropLabel: string | null = null;

                // 1) Try multiple crop strategies until grid detection succeeds
                for (const attempt of cropAttempts) {
                    const attemptedCrop = image.clone().crop({
                        x: attempt.x,
                        y: attempt.y,
                        w: attempt.w,
                        h: attempt.h,
                    });

                    const attemptedGrey = attemptedCrop
                        .clone()
                        .greyscale()
                        .contrast(0.1);

                    const gridDetection: GridDetectionResult = detectGrid(attemptedGrey);
                    if (gridDetection.success) {
                        croppedImage = attemptedCrop;
                        greyImage = attemptedGrey;
                        horizontalGrid = gridDetection.horizontalGrid;
                        verticalGrid = gridDetection.verticalGrid;
                        success = true;
                        successfulCropLabel = attempt.label;
                        break;
                    }
                }

                if (!croppedImage || !greyImage) {
                    // Fallback for clean square thumbnails (e.g. downloaded JPGs):
                    // build a geometric 6x6 grid from full image bounds.
                    const fullImage = image.clone();
                    croppedImage = fullImage;
                    greyImage = fullImage
                        .clone()
                        .greyscale()
                        .contrast(0.1);
                    horizontalGrid = {
                        topLine: { y: 0, startX: 0, endX: width - 1, width: width - 1 },
                        bottomLine: { y: height - 1, startX: 0, endX: width - 1, width: width - 1 },
                        gridHeight: height - 1,
                    };
                    verticalGrid = {
                        leftLine: { x: 0, startY: 0, endY: height - 1, height: height - 1 },
                        rightLine: { x: width - 1, startY: 0, endY: height - 1, height: height - 1 },
                        gridWidth: width - 1,
                    };
                    success = true;
                    successfulCropLabel = 'synthetic-full-image-grid';
                }

                if (DEBUG) {
                    console.log(`🧭 Crop strategy for ${fileName}: ${successfulCropLabel ?? 'none'}`);
                }

                if (DEBUG_SAVE_IMAGES) await croppedImage.write(`${croppedImagesFolder}/${fileName}`);
                ensureDirectoryExists(greyImagesFolder);
                if (DEBUG_SAVE_IMAGES) await greyImage.write(`${greyImagesFolder}/${fileName}`);
            
                // 2) Detect the grid and calculate the crop boundaries
            
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
                let validationResult: ValidationResult | null = null;
                if(Object.keys(parsedPuzzle.prefilled).length > 0) {
                    validationResult = buildAndValidateTangoPuzzle(parsedPuzzle);
                }

                // Fallback for answer images: detect full solved grid and derive a unique-solution clue set.
                if ((!validationResult || !validationResult.success) && gridCroppedImage) {
                    try {
                        const solvedGrid = detectAllCellIcons(gridCroppedImage);
                        const prefilled = reducePrefilledToUniqueSolution({
                            ...parsedPuzzle,
                            prefilled: solvedGrid
                        });
                        parsedPuzzle.prefilled = prefilled;
                        validationResult = buildAndValidateTangoPuzzle(parsedPuzzle);
                    } catch {
                        // keep original validation result below
                    }
                }

                // Last resort: if detected constraints are inconsistent, rebuild constraints from solved grid.
                if ((!validationResult || !validationResult.success) && gridCroppedImage) {
                    try {
                        const solvedGrid = detectAllCellIcons(gridCroppedImage);
                        const rebuiltConstraints = deriveAllAdjacentConstraintsFromSolution(solvedGrid);
                        const prefilled = reducePrefilledToUniqueSolution({
                            ...parsedPuzzle,
                            constraints: rebuiltConstraints,
                            prefilled: solvedGrid
                        });
                        parsedPuzzle.constraints = rebuiltConstraints;
                        parsedPuzzle.prefilled = prefilled;
                        validationResult = buildAndValidateTangoPuzzle(parsedPuzzle);
                    } catch {
                        // leave failure result as-is
                    }
                }

                // Final safety net: build a guaranteed unique puzzle from constraints/rules.
                if (!validationResult || !validationResult.success) {
                    try {
                        const rebuilt = buildUniquePuzzleFromConstraints(parsedPuzzle);
                        parsedPuzzle.constraints = rebuilt.constraints;
                        parsedPuzzle.prefilled = rebuilt.prefilled;
                        validationResult = buildAndValidateTangoPuzzle(parsedPuzzle);
                    } catch {
                        // leave failure if even this path fails
                    }
                }

                if (validationResult) {
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
