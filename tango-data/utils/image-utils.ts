/**
 * Gets greyscale value from a pixel (using green channel)
 */
export function getGreyscaleValue(image: any, x: number, y: number): number {
    const pixelColor = image.getPixelColor(x, y);
    return (pixelColor >> 8) & 0xFF; // Green channel for greyscale
}

/**
 * Measures the thickness of a horizontal line
 */
export function measureLineThickness(startX: number, endX: number, startY: number): number {
    // Simple implementation - just return 1 for now
    // Can be enhanced later if thickness detection is needed
    return 1;
}

/**
 * Measures the thickness of a vertical line
 */
export function measureVerticalLineThickness(startY: number, endY: number, startX: number): number {
    // For now, return 1 (can be enhanced later if needed)
    return 1;
} 