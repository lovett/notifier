const { randomFillSync } = await import('node:crypto');

export default class Token {
    public readonly key!: string;
    public readonly value?: string;
    public readonly label: string;
    public readonly persist: boolean;

    constructor(label: string, persist = false, key?: string, value?: string) {
        const randomString = () => {
            const buf = Buffer.alloc(32);
            return randomFillSync(buf).toString('base64');
        };

        this.label = label;
        this.persist = persist;
        this.key = key || randomString();

        if (label !== 'service') {
            this.value = value || randomString();
        }
    }
}
