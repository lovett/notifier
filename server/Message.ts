import { v4 as uuid } from 'uuid';

export default class Message {
    public readonly body?: string = undefined;
    public readonly deliveryStyle: string = 'normal';
    public readonly expiresAt?: Date = undefined;
    public readonly localId?: string = undefined;
    public readonly title?: string = undefined;
    public readonly group?: string = undefined;
    public readonly source?: string = undefined;
    public readonly url?: string = undefined;
    public readonly received?: Date = undefined;
    public readonly publicId?: string = undefined;
    public badge?: string = undefined;

    constructor(bag: any) {
        for (const key in this) {
            if (bag.hasOwnProperty(key)) {
                this[key] = bag[key];
            }
        }

        if (!this.received) {
            this.received = new Date();
        }

        if (!this.publicId) {
            this.publicId = uuid();
        }
    }

    public urlizeBadge(baseUrl: string) {
        if (!this.badge) {
            return;
        }

        if (this.badge.startsWith('http')) {
            return;
        }

        const baseWithoutTrailingSlash = baseUrl.replace(/\/%/, '');

        this.badge = `${baseWithoutTrailingSlash}/${this.badge}`;
    }
}
