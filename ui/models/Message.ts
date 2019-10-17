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

        if (json.localId) {
            m.localId = json.localId;
        }

        return m;
    }

    public selected: boolean = false;
    public extended: boolean = false;
    public title?: string;
    public body?: string;
    public group?: string;
    public publicId?: string;
    public domain?: string;
    public expiration?: Date;
    public badge?: string;
    public browserNotification?: Notification;
    public state?: string;
    public url?: string;
    public received: Date;
    public localId?: string;

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
        const classes = ['message', this.group, this.state];
        if (this.isExpired()) {
            classes.push('expired');
        }

        if (this.isSelected()) {
            classes.push('selected');
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

        if (!this.expiringSoon()) {
            return 'Expires at ' + new Intl.DateTimeFormat(
                undefined,
                { hour: 'numeric', minute: '2-digit' },
            ).format(this.expiration);
        }

        const seconds = Math.ceil((this.expiration.getTime() - Date.now()) / 1000);
        const minutes = Math.floor(seconds / 60);

        if (seconds === 0) {
            return 'Expires now!';
        }

        if (seconds === 1) {
            return 'Expires in 1 second';
        }

        if (seconds < 10) {
            return `Expires in ${seconds} seconds`;
        }

        if (seconds < 60) {
            return 'Expires in less than a minute';
        }

        return `Expires in ${minutes} minutes`;
    }

    public closeBrowserNotification() {
        if (this.browserNotification) {
            this.browserNotification.close();
        }
    }

    public expiringSoon() {
        if (!this.expiration) {
            return '';
        }

        const seconds = Math.ceil((this.expiration.getTime() - Date.now()) / 1000);
        const minutes = Math.floor(seconds / 60);

        return minutes <= 10;
    }



    public sendBrowserNotification() {
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
            this.title!,
            opts,
        );
    }

    public hasExpiration(): boolean {
        return this.expiresAt !== undefined;
    }

    public hasLink(): boolean {
        return this.url !== undefined;
    }

    public isSelected(): boolean {
        return this.selected;
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

    public visit() {
        if (this.hasLink()) {
            window.open(this.url);
        }
    }
}
