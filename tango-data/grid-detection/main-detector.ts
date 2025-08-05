import { DEBUG } from '../utils/constants';
import {
    createSquareGridFromLeftLine,
    createSquareGridFromTopLine,
    deriveHorizontalFromVertical,
    deriveVerticalFromHorizontal
} from './grid-calculator';
import { detectTopHorizontalLine } from './horizontal-detector';
import { detectLeftVerticalLine } from './vertical-detector';

export interface GridDetectionResult {
    horizontalGrid: any | null;
    verticalGrid: any | null;
    success: boolean;
}

/**
 * Main grid detection function that tries horizontal detection first, then vertical fallback
 * Returns both horizontal and vertical grid data or null if detection fails
 */
export function detectGrid(greyImage: any): GridDetectionResult {
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

    const success = !!(horizontalGrid || verticalGrid);
    
    if (DEBUG && success) {
        console.log(`✅ Grid detected.`);
        if (horizontalGrid) {
            console.log(`  Horizontal:`, horizontalGrid);
        }
        if (verticalGrid) {
            console.log(`  Vertical:`, verticalGrid);
        }
    }

    return {
        horizontalGrid,
        verticalGrid,
        success
    };
}