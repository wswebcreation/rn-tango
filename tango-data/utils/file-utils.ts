import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';

const THUMBNAILS_DIR = './tango-data/thumbnails';
/** Order: prefer jpg from the Try Hard Guides downloader, then legacy png. */
const THUMBNAIL_EXTENSIONS = ['.jpg', '.jpeg', '.png'] as const;

const TANGO_THUMB_FILENAME = /^tango-(\d+)\.(png|jpe?g)$/i;

export function isTangoThumbnailFilename(name: string): boolean {
    return TANGO_THUMB_FILENAME.test(name);
}

/**
 * Lists `./tango-data/thumbnails/tango-###.(png|jpg|jpeg)` paths, sorted by puzzle number.
 */
export function listTangoThumbnailPaths(thumbnailsDir: string = THUMBNAILS_DIR): string[] {
    if (!existsSync(thumbnailsDir)) {
        return [];
    }

    const names = readdirSync(thumbnailsDir);
    const matching = names.filter(isTangoThumbnailFilename);
    matching.sort((a, b) => {
        const na = parseInt(a.match(TANGO_THUMB_FILENAME)![1], 10);
        const nb = parseInt(b.match(TANGO_THUMB_FILENAME)![1], 10);
        return na - nb;
    });

    return matching.map((f) => `${thumbnailsDir}/${f}`);
}

/**
 * Returns the path to an existing thumbnail for a padded id (e.g. "503"), or null.
 */
export function resolveExistingTangoThumbnailPath(paddedNumber: string): string | null {
    const base = `${THUMBNAILS_DIR}/tango-${paddedNumber}`;
    for (const ext of THUMBNAIL_EXTENSIONS) {
        const filePath = `${base}${ext}`;
        if (existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
}

/**
 * Helper function to ensure directory exists
 */
export function ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}

export function removeDirectory(dirPath: string): void {
    if (existsSync(dirPath)) {
        rmSync(dirPath, { recursive: true, force: true });
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
        if (checkExists) {
            const found = resolveExistingTangoThumbnailPath(paddedNumber);
            if (found) {
                files.push(found);
            }
        } else {
            files.push(`${THUMBNAILS_DIR}/tango-${paddedNumber}.jpg`);
        }
    }

    return files;
} 