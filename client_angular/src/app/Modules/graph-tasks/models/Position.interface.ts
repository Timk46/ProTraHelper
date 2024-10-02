export interface IPosition {
    x: number;
    y: number;
}

export function isPosition(obj: any): obj is IPosition {
    return obj &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number';
}