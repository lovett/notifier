export default class Message {
    public static fromJson(json: any) {
        const m = new Message();

        m.badge = json.badge;
        m.title = json.title;
        m.group = json.group;
        m.publicId = json.publicId;

        if (json.retracted) {
            m.publicId = json.retracted;
            m.expiration = new Date(0);
        }

        if (json.url) {
            const el: HTMLAnchorElement = document.createElement('a');
            el.setAttribute('href', json.url);
            m.domain = el.hostname;
            m.url = json.url;
        }

        if (json.expiresAt) {
            m.expiration = new Date(json.expiresAt);
        }

        if (json.received) {
            m.received = new Date(json.received);
        }

        if (json.body) {
            m.body = json.body.replace(/\n/g, '<br/>');
        }

        return m;
    }

    public static fromJsonArray(messages: any[]) {
        return messages.reduce((accumulator: Message[], message) => {
            accumulator.push(Message.fromJson(message));
            return accumulator;
        }, []);
    }

    public active: boolean;
    public extended: boolean;
    public title: string;
    public body: string;
    public group: string;
    public publicId: string;
    public domain?: string;
    public expiration?: Date;
    public timeRemaining: number;
    public badge?: string;
    public browserNotification: any;
    public state?: string;
    public url?: string;
    public received: Date;

    constructor() {
        this.active = false;
        this.extended = false;
        this.title = '';
        this.body = '';
        this.group = '';
        this.publicId = '';
        this.timeRemaining = 0;
        this.received = new Date();
    }

    /**
     * The number of days elapsed since the message was received.
     */
    public ageInDays(): number {
        const received = new Date(this.received);
        received.setHours(0, 0, 0);

        const now = new Date()
        now.setHours(0, 0, 0, 0);

        return (now.getTime() - received.getTime()) / 86400_000;
    }

    /**
     * The message's visual state when rendered as HTML.
     */
    public rootTag(): string {
        const classes = ['message', this.group, this.state];
        if (this.isExpired()) {
            classes.push('expired');
        }

        if (this.isActive()) {
            classes.push('focused');
        }

        if (this.isExtended()) {
            classes.push('extended');
        }

        let tag = 'div';
        if (this.hasLink()) {
            tag = 'a';
        }

        return `${tag}.${classes.join('.')}`;
    }

    /**
     * Format the receive date as a human-readable string.
     */
    public receivedAt(): string {
        const age = this.ageInDays();
        const options: Intl.DateTimeFormatOptions = {};

        if (age < 1) {
            options.hour = 'numeric';
            options.minute = '2-digit';
        }

        if (age >= 1 && age < 7) {
            options.weekday = 'long';
            options.hour = 'numeric';
            options.minute = '2-digit';
        }

        if (age >= 7) {
            options.weekday = 'long';
            options.month = 'long';
            options.day = '2-digit';
        }

        let suffix = '';
        if (age === 1) {
            suffix = ' yesterday';
        }

        return new Intl.DateTimeFormat(
            undefined,
            options,
        ).format(this.received) + suffix;
    }

    /**
     * Format the expiration date as a human-readable string.
     */
    public expiresAt() {
        if (!this.expiration) {
            return '';
        }

        const seconds = Math.ceil((this.expiration.getTime() - Date.now()) / 1000);
        const minutes = Math.floor(seconds / 60);

        if (seconds === 0) {
            return 'now!';
        }

        if (seconds === 1) {
            return 'in 1 second';
        }

        if (seconds < 10) {
            return `in ${seconds} seconds`;
        }

        if (seconds < 60) {
            return 'in less than a minute';
        }

        if (minutes < 10) {
            return `in ${minutes} minutes`;
        }

        return 'at ' + new Intl.DateTimeFormat(
            undefined,
            { hour: 'numeric', minute: '2-digit' },
        ).format(this.expiration);
    }

    public refresh() {
        const initialValue = this.timeRemaining;
        this.calculateTimeRemaining();
        return (this.timeRemaining !== initialValue);
    }

    public closeBrowserNotification() {
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

    public hasExpiration(): boolean {
        return this.expiresAt !== undefined;
    }

    public hasLink(): boolean {
        return this.url !== undefined;
    }

    public isActive(): boolean {
        return this.active;
    }

    public isExpired(): boolean {
        if (!this.expiration) {
            return false;
        }

        return this.expiration < new Date();
    }

    public isExtended(): boolean {
        return this.extended;
    }
}
