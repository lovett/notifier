import { v4 as uuid } from 'uuid';

export default class Message {
    public readonly body?: string = undefined;
    public readonly expiresAt?: Date = undefined;
    public readonly localId?: string = undefined;
    public readonly title?: string = undefined;
    public readonly group?: string = undefined;
    public readonly badge?: string = undefined;
    public readonly source?: string = undefined;
    public readonly url?: string = undefined;
    public readonly received?: Date = undefined;
    public readonly publicId: string;

    constructor(bag: any) {
        for (const key in this) {
            if (bag.hasOwnProperty(key)) {
                this[key] = bag[key];
            }
        }

        this.publicId = uuid();
    }
}
