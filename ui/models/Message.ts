export type JsonMessage = {
    badge?: string,
    title?: string,
    group?: string,
    publicId?: string,
    retracted?: string,
    url?: string
    expiresAt?: string,
    localId?: string,
    deliveryStyle?: string,
    body?: string,
    received: string,
}

export class Message {
    public static fromJson(json: JsonMessage): Message {
        const m = new Message();

        m.badge = json.badge || '';
        m.title = json.title || '';
        m.group = json.group ||  '';
        m.publicId = json.publicId || '';

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

        if (json.deliveryStyle) {
            m.deliveryStyle = json.deliveryStyle;
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
    public deliveryStyle = 'normal';
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

        return Math.ceil((now.getTime() - received.getTime()) / 86400_000);
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

        if (this.url) {
            classes.push('linked');
        }

        return `div.${classes.join('.')}`;
    }

    /**
     * Format the receive date as a human-readable string.
     */
    public receivedAt(): string {
        const age = this.ageInDays();
        const options: Intl.DateTimeFormatOptions = {};
        let prefix = '';

        if (age <= 1) {
            prefix = 'Today ';
            options.hour = 'numeric';
            options.minute = '2-digit';
        }

        if (age === 1) {
            prefix = 'Yesterday ';
        }

        if (age >= 2 && age < 7) {
            options.weekday = 'long';
            options.hour = 'numeric';
            options.minute = '2-digit';
        }

        if (age >= 7) {
            options.month = 'long';
            options.day = '2-digit';
        }

        return prefix + new Intl.DateTimeFormat(
            undefined,
            options,
        ).format(this.received);
    }

    /**
     * Determine how soon to recheck for expiration.
     */
    public expirationRecheckInterval(): number {
        if (!this.expiration) {
            return 0;
        }

        return 1;
    }

    /**
     * Format the expiration date as a human-readable string.
     */
    public expiresAt(): string {
        if (!this.expiration) {
            return '';
        }

        const seconds = Math.ceil((this.expiration.getTime() - Date.now()) / 1000);

        const expireTime = new Intl.DateTimeFormat(
            undefined,
            {hour: 'numeric', minute: '2-digit'},
        ).format(this.expiration);

        const expireDateShort = new Intl.DateTimeFormat(
            'en-US',
            {month: '2-digit', day: '2-digit'}
        ).format(this.expiration);

        const currentDateShort = new Intl.DateTimeFormat(
            'en-US',
            {month: '2-digit', day: '2-digit'}
        ).format(Date.now());

        if (expireDateShort > currentDateShort) {
            if (seconds < 86400) {
                return `Expires tomorrow at ${expireTime}`;
            }

            const expireDateLong = new Intl.DateTimeFormat(
                undefined,
                {month: 'long', day: 'numeric'}
            ).format(this.expiration);

            return `Expires on ${expireDateLong} at ${expireTime}`;
        }

        const units = ['hour', 'minute', 'second'];

        const hour_min_sec = [
            Math.floor(seconds / 3600),
            Math.floor(seconds % 3600 / 60),
            seconds % 3600 % 60
        ];

        const remaining = hour_min_sec.reduce((accumulator, x, i) => {
            if (x > 1) {
                return `${accumulator} ${x} ${units[i]}s`;
            }

            if (x > 0) {
                return `${accumulator} ${x} ${units[i]}`;
            }

            return accumulator;
        }, '');

        return `Expires at ${expireTime} - ${remaining} remaining`;
    }

    public closeBrowserNotification(): void {
        if (this.browserNotification) {
            this.browserNotification.close();
        }
    }

    public sendBrowserNotification(): void {
        let body: string = this.body || '';

        // Truncation avoids unwanted whitespace in Chrome
        if (body.length > 75) {
            body = `${body.substring(0, 75)}…`;
        }

        const opts: NotificationOptions = {
            body,
            icon: 'favicon-white-box.png',
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
            window.open(this.url, '_blank', 'noreferrer');
        }
    }
}
