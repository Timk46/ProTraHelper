export interface ISize {
    width: number;
    height: number;
}

export function isSize(obj: any): obj is ISize {
    return obj &&
    typeof obj.width === 'number' &&
    typeof obj.height === 'number';
}