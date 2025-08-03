export interface HorizontalGridDetection {
    topLine: {
        y: number;
        startX: number;
        endX: number;
        width: number;
    } | null;
    bottomLine: {
        y: number;
        startX: number;
        endX: number;
        width: number;
    } | null;
    gridHeight: number | null;
}

export interface VerticalGridDetection {
    leftLine: {
        x: number;
        startY: number;
        endY: number;
        height: number;
    } | null;
    rightLine: {
        x: number;
        startY: number;
        endY: number;
        height: number;
    } | null;
    gridWidth: number | null;
}

export interface GridLine {
    y?: number;
    x?: number;
    startX?: number;
    endX?: number;
    startY?: number;
    endY?: number;
    width?: number;
    height?: number;
    thickness?: number;
} 