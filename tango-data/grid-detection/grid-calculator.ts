import { HorizontalGridDetection, VerticalGridDetection } from '../types/grid-types';
import { DEBUG } from '../utils/constants';

/**
 * Creates complete horizontal grid from just the top line using square geometry  
 */
export function createSquareGridFromTopLine(topLine: any): HorizontalGridDetection {
    const gridWidth = topLine.endX - topLine.startX;
    const gridHeight = gridWidth; // Square grid!
    const bottomY = topLine.y + gridHeight;
    
    if (DEBUG) console.log(`📐 Creating square grid from top line: width=${gridWidth}, bottomY=${topLine.y}+${gridHeight}=${bottomY}`);
    
    return {
        topLine: {
            y: topLine.y,
            startX: topLine.startX,
            endX: topLine.endX,
            width: topLine.width
        },
        bottomLine: {
            y: bottomY,
            startX: topLine.startX,
            endX: topLine.endX,
            width: topLine.width
        },
        gridHeight: gridHeight
    };
}

/**
 * Creates complete vertical grid from just the left line using square geometry
 */
export function createSquareGridFromLeftLine(leftLine: any): VerticalGridDetection {
    const gridHeight = leftLine.endY - leftLine.startY;
    const gridWidth = gridHeight; // Square grid!
    const rightX = leftLine.x + gridWidth;
    
    if (DEBUG) console.log(`📐 Creating square grid from left line: height=${gridHeight}, rightX=${leftLine.x}+${gridWidth}=${rightX}`);
    
    return {
        leftLine: {
            x: leftLine.x,
            startY: leftLine.startY,
            endY: leftLine.endY,
            height: leftLine.height
        },
        rightLine: {
            x: rightX,
            startY: leftLine.startY,
            endY: leftLine.endY,
            height: leftLine.height
        },
        gridWidth: gridWidth
    };
}

/**
 * Derives vertical grid lines from horizontal grid lines (for square grids)
 */
export function deriveVerticalFromHorizontal(horizontalGrid: HorizontalGridDetection): VerticalGridDetection | null {
    if (!horizontalGrid.topLine) {
        return null;
    }
    
    const { topLine } = horizontalGrid;
    
    // Pure geometric square grid calculation from top line
    const gridWidth = topLine.endX - topLine.startX;
    const gridHeight = gridWidth; // Square grid!
    const bottomY = topLine.y + gridHeight;
    
    if (DEBUG) console.log(`📐 Square grid calculation: width=${gridWidth}, height=${gridHeight}, bottomY=${topLine.y}+${gridHeight}=${bottomY}`);
    
    return {
        leftLine: {
            x: topLine.startX,
            startY: topLine.y,
            endY: bottomY,
            height: gridHeight
        },
        rightLine: {
            x: topLine.endX,
            startY: topLine.y,
            endY: bottomY,
            height: gridHeight
        },
        gridWidth: gridWidth
    };
}

/**
 * Derives horizontal grid lines from vertical grid lines (for square grids)
 */
export function deriveHorizontalFromVertical(verticalGrid: VerticalGridDetection): HorizontalGridDetection | null {
    if (!verticalGrid.leftLine || !verticalGrid.rightLine) {
        return null;
    }
    
    const { leftLine, rightLine } = verticalGrid;
    
    // Use the vertical line endpoints to define horizontal lines
    const leftX = leftLine.x;
    const rightX = rightLine.x;
    const topY = Math.min(leftLine.startY, rightLine.startY);
    const bottomY = Math.max(leftLine.endY, rightLine.endY);
    const width = rightX - leftX;
    
    return {
        topLine: {
            y: topY,
            startX: leftX,
            endX: rightX,
            width: width
        },
        bottomLine: {
            y: bottomY,
            startX: leftX,
            endX: rightX,
            width: width
        },
        gridHeight: bottomY - topY
    };
} 