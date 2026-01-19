// utils.ts
export function rawString(str: string): string {
    return JSON.stringify(str).slice(1, -1);
}