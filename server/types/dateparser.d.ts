declare module 'dateparser' {
    export function parse(value: string): Result|null;

    export function format(result: Result): string;

    export interface Result {
        value: number;
        relative: boolean;
    }
}
