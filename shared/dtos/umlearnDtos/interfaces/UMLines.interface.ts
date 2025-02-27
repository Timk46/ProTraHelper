export interface TextLabel {
    text: string,
    font?: string,
    size?: number,
    offset?: {x: number, y: number},
    color?: string,
    outline?: number,
    outlineColor?: string,
}

export interface highlightedLineElements {
    line?: boolean,
    startLabel?: boolean,
    middleLabel?: boolean,
    endLabel?: boolean,
    missing?: boolean,
    missingLabel?: {
        startLabel?: string,
        middleLabel?: string,
        endLabel?: string,
    }
}

export enum Side {
    LEFT = "left",
    RIGHT = "right",
    TOP = "top",
    BOTTOM = "bottom",
    NONE = "none",
}