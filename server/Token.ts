import * as crypto from 'node:crypto';

export default class Token {
    public readonly key!: string;
    public readonly value?: string;
    public readonly label: string;
    public readonly persist: boolean;

    constructor(label: string, persist = false, key?: string, value?: string) {
        this.label = label;
        this.persist = persist;

        if (!key) {
            this.key = this.randomString(32);
        } else {
            this.key = key;
        }

        if (label === 'service') {
            return;
        }

        if (!value) {
            this.value = this.randomString(32);
        } else {
            this.value = value;
        }
    }

    private randomString(length: number): string {
        const bag = 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789';

        const buf = crypto.randomBytes(length);

        let result = '';
        for (let i = 0; i < length; i = i + 1) {
            result += bag[buf[i] % bag.length];
        }

        return result;
    }
}
