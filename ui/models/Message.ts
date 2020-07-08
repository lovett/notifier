export default class Message {
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */
    public static fromJson(json: any): Message {
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

        if (json.localId) {
            m.localId = json.localId;
        }

        return m;
    }

    public selected = false;
    public title = '';
    public body = '';
    public group = '';
    public publicId = '';
    public domain = '';
    public expiration?: Date;
    public badge = '';
    public browserNotification?: Notification;
    public state = '';
    public url = '';
    public received: Date;
    public localId = '';

    constructor() {
        this.received = new Date();
    }

    /**
     * The number of days elapsed since the message was received.
     */
    public ageInDays(): number {
        const received = new Date(this.received);
        received.setHours(0, 0, 0);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return (now.getTime() - received.getTime()) / 86400_000;
    }

    /**
     * The message's visual state when rendered as HTML.
     */
    public rootTag(): string {
        const classes = ['message'];

        if (this.state) {
            classes.push(this.state);
        }

        if (this.group) {
            classes.push(this.group);
        }

        if (this.isExpired()) {
            classes.push('expired');
        }

        if (this.selected) {
            classes.push('selected');
        }

        return `div.${classes.join('.')}`;
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
    public expiresAt(): string {
        if (!this.expiration) {
            return '';
        }

        const seconds = Math.ceil((this.expiration.getTime() - Date.now()) / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours  = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds === 0) {
            return 'Expired!';
        }

        if (seconds === 1) {
            return 'Expires in 1 second';
        }

        if (seconds <= 10) {
            return `Expires in ${seconds} seconds`;
        }

        if (seconds < 60) {
            return `Expires in less than a minute`;
        }

        if (minutes === 1) {
            return 'Expires in 1 minute';
        }

        if (minutes < 60) {
            return `Expires in ${minutes} minutes`;
        }

        if (hours < 12) {
            return 'Expires at ' + new Intl.DateTimeFormat(
                undefined,
                { hour: 'numeric', minute: '2-digit' },
            ).format(this.expiration);
        }

        if (days === 1) {
            return 'Expires in 1 day';
        }

        return `Expires in ${days} days`;
    }

    public closeBrowserNotification(): void {
        if (this.browserNotification) {
            this.browserNotification.close();
        }
    }

    public expiringSoon(): boolean {
        if (!this.expiration) {
            return false;
        }

        const seconds = Math.ceil((this.expiration.getTime() - Date.now()) / 1000);
        const minutes = Math.floor(seconds / 60);

        return minutes <= 10;
    }

    public sendBrowserNotification(): void {
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

        this.browserNotification = new Notification(
            this.title,
            opts,
        );
    }

    public isExpired(): boolean {
        if (!this.expiration) {
            return false;
        }

        return this.expiration < new Date();
    }

    public visit(): void {
        if (this.url) {
            window.open(this.url);
        }
    }
}
