import { readFileSync, writeFileSync } from 'fs';

export function updateVersionFile(): void {
    const versionPath = './app-data/version.json';
    
    try {
        // Read current version
        const versionData = JSON.parse(readFileSync(versionPath, 'utf8'));
        const currentVersion = versionData.version || 0;
        
        // Increment version
        const newVersion = currentVersion + 1;
        versionData.version = newVersion;
        
        // Write updated version
        writeFileSync(versionPath, JSON.stringify(versionData, null, 4), 'utf8');
        console.log(`📈 Updated version: ${currentVersion} → ${newVersion}`);
        
    } catch (error) {
        console.error('❌ Failed to update version file:', error);
        // Create version file if it doesn't exist
        const initialVersion = { version: 1 };
        writeFileSync(versionPath, JSON.stringify(initialVersion, null, 4), 'utf8');
        console.log(`📈 Created version file with version: 1`);
    }
}