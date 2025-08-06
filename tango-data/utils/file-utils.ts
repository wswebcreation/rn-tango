import { existsSync, mkdirSync } from 'fs';

/**
 * Helper function to ensure directory exists
 */
export function ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Generates file paths for a range of puzzle numbers
 * @param startNumber - Starting puzzle number (inclusive)
 * @param endNumber - Ending puzzle number (inclusive)
 * @param checkExists - Whether to only include files that exist on disk
 * @returns Array of file paths
 */
export function generatePuzzleFileRange(startNumber: number, endNumber: number, checkExists: boolean = true): string[] {
    const files: string[] = [];
    
    for (let i = startNumber; i <= endNumber; i++) {
        const paddedNumber = i.toString().padStart(3, '0');
        const filePath = `./tango-data/thumbnails/tango-${paddedNumber}.png`;
        
        if (!checkExists || existsSync(filePath)) {
            files.push(filePath);
        }
    }
    
    return files;
} 