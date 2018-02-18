export default class Message {
    public static fromRaw(message: app.RawMessage) {
        const m = new Message();

        m.badge = message.badge;
        m.title = message.title;
        m.group = message.group;
        m.publicId = message.publicId;

        m.setUrl(message.url);
        m.setExpiration(message.expiresAt);

        m.received = new Date(message.received);

        if (message.body) {
            m.body = message.body.replace(/\n/g, '<br/>');
        }


        if (m.group === 'phone' && m.body) {
            // Format US phone numbers, dropping optional country code
            m.body = m.body.replace(/(\+?1?)(\d\d\d)(\d\d\d)(\d\d\d\d)/g, '($2) $3-$4');
        }

        return m;
    }

    public active: boolean;
    public extended: boolean;
    public title: string;
    public body: string;
    public group: string;
    public publicId: string;
    public received: Date;
    public url?: string;
    public domain?: string;
    public expiresAt?: Date;
    public timeRemaining: number;
    public badge?: string;
    public browserNotification: any;
    public state?: string;

    constructor() {
        this.active = false;
        this.extended = false;
        this.title = '';
        this.body = '';
        this.group = '';
        this.publicId = '';
        this.received = new Date();
        this.timeRemaining = 0;

    }

    public age() {
        return Math.ceil((Date.now() - this.received.getTime()) / 1000);
    }

    public refresh() {
        const initialValue = this.timeRemaining;
        this.calculateTimeRemaining();
        return (this.timeRemaining !== initialValue);
    }

    public prepareForRemoval() {
        if (this.browserNotification) {
            this.browserNotification.close();
        }
    }

    public asBrowserNotification(): Notification {
        let body: string = this.body || '';

        // Truncation avoids unwanted whitespace in Chrome
        if (body.length > 75) {
            body = body.substring(0, 75) + '…';
        }

        const opts: NotificationOptions = {
            body,
            icon: 'favicon/favicon.png',
            tag: this.publicId,
        };

        return new Notification(this.title, opts);
    }

    public isExpired(): boolean {
        if (this.expiresAt) {
            return this.expiresAt < new Date();
        }

        return false;
    }

    public isExtended(): boolean {
        return this.extended;
    }

    public setUrl(value?: string): void {
        if (!value) {
            return;
        }

        const el: JQLite = angular.element('<a></a>');
        el.attr('href', value);
        this.domain = (el[0] as HTMLAnchorElement).hostname;
        this.url = value;
    }

    public setExpiration(value?: string): void {
        if (!value) {
            return;
        }

        this.expiresAt = new Date(value);
        this.calculateTimeRemaining();
    }

    protected calculateTimeRemaining(): void {
        if (!this.expiresAt) {
            return;
        }

        const remaining = this.expiresAt.getTime() - Date.now();

        this.timeRemaining = Math.ceil(remaining / 1000);
    }
}
