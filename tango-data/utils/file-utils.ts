import { existsSync, mkdirSync } from 'fs';

/**
 * Helper function to ensure directory exists
 */
export function ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
} 