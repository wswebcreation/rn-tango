import { readFileSync, writeFileSync } from 'fs';
import { ExistingPuzzlesData, ProcessingFilters, PuzzleMergeResult } from '../types/processing-types';
import { Puzzle } from '../types/shared-types';
import { DEBUG } from './constants';

/**
 * Loads existing puzzles from puzzles.json and extracts their IDs
 */
export function loadExistingPuzzles(): ExistingPuzzlesData {
    const puzzlesPath = './app-data/puzzles.json';
    
    try {
        const existingData = readFileSync(puzzlesPath, 'utf8');
        const existingPuzzles: Puzzle[] = JSON.parse(existingData);
        const existingIds = new Set(existingPuzzles.map(p => p.id));
        
        console.log(`📚 Loaded ${existingPuzzles.length} existing puzzles from ${puzzlesPath}`);
        console.log(`🔢 Existing puzzle IDs: ${Array.from(existingIds).sort((a, b) => a - b).join(', ')}`);
        
        return { puzzles: existingPuzzles, existingIds };
    } catch {
        if(DEBUG) console.log(`📚 No existing puzzles found, starting fresh: ${puzzlesPath}`);
        return { puzzles: [], existingIds: new Set() };
    }
}

/**
 * Filters files to only process new puzzles (not in existing IDs and not in skip list)
 */
export function filterFilesToProcess(
    files: string[], 
    existingIds: Set<number>, 
    puzzleNumbersToSkip: number[]
): ProcessingFilters {
    const filesToProcess = files.filter(file => {
        const fileName = file.split('/').pop();
        if (!fileName) return false;
        
        const puzzleNumber = parseInt(fileName.split('-')[1].split('.')[0]);
        const shouldSkip = puzzleNumbersToSkip.includes(puzzleNumber) || existingIds.has(puzzleNumber);
        
        if (existingIds.has(puzzleNumber)) {
            console.log(`⏭️  Skipping puzzle ${puzzleNumber} (already exists in puzzles.json)`);
        }
        
        return !shouldSkip;
    });
    
    const skippedCount = files.length - filesToProcess.length;
    console.log(`\n🎯 Processing ${filesToProcess.length} new puzzles (${skippedCount} already exist or skipped)`);
    
    return { filesToProcess, skippedCount };
}

/**
 * Merges existing puzzles with new ones and sorts by ID
 */
export function mergeAndSortPuzzles(existingPuzzles: Puzzle[], newPuzzles: Puzzle[]): PuzzleMergeResult {
    const allPuzzles = [...existingPuzzles, ...newPuzzles];
    allPuzzles.sort((a, b) => a.id - b.id);
    
    return {
        allPuzzles,
        hasNewPuzzles: newPuzzles.length > 0
    };
}

/**
 * Saves puzzles to JSON file and logs the result
 */
export function savePuzzlesJson(
    allPuzzles: Puzzle[], 
    newPuzzlesCount: number, 
    existingPuzzlesCount: number,
    updateVersionCallback: () => void
): void {
    if (newPuzzlesCount > 0) {
        const jsonOutput = JSON.stringify(allPuzzles, null, 0);
        const outputPath = './app-data/puzzles.json';
        
        writeFileSync(outputPath, jsonOutput, 'utf8');
        console.log(`\n📄 Updated puzzles.json: +${newPuzzlesCount} new puzzles (total: ${allPuzzles.length}): ${outputPath}`);
        
        // Update version number to indicate new puzzle data
        updateVersionCallback();
    } else {
        console.log(`\n📄 No new puzzles to add. Puzzles.json remains unchanged with ${existingPuzzlesCount} puzzles.`);
    }
}

/**
 * Logs final processing summary
 */
export function logProcessingSummary(
    processedImages: number,
    newPuzzlesCount: number,
    existingPuzzlesCount: number,
    totalPuzzlesCount: number,
    processingTimeMs: number
): void {
    console.log(`\n🏁 Process completed in ${(processingTimeMs / 1000).toFixed(2)} seconds`);
    console.log(`✅ Processed ${processedImages} new images (${newPuzzlesCount} successful puzzles added)`);
    
    if (existingPuzzlesCount > 0) {
        console.log(`📊 Total puzzles in collection: ${totalPuzzlesCount} (${existingPuzzlesCount} existing + ${newPuzzlesCount} new)`);
    }
}