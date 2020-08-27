import { v4 as uuid } from 'uuid';

export default class Message {
    public deliveryStyle = 'normal';
    public readonly body: string = '';
    public readonly expiresAt?: Date = undefined;
    public readonly localId: string = '';
    public readonly title: string = '';
    public readonly group: string = '';
    public readonly source: string = '';
    public readonly url: string = '';
    public readonly received: Date = new Date();
    public readonly publicId: string = '';
    public badge = '';

    constructor(data: Partial<Message>) {
        Object.assign(this, data);

        if (!this.publicId) {
            this.publicId = uuid();
        }
    }

    public urlizeBadge(baseUrl: string): void {
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
