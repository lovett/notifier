export default class Message {
    public static fromRaw(message: app.RawMessage) {
        const m = new Message();
        const startOfToday = (new Date()).setHours(0, 0, 0, 0);
        const now = new Date();
        const oneDayMilliseconds = 86400000;

        m.title = message.title;
        m.group = message.group;
        m.publicId = message.publicId;

        if (message.url) {
            const el: JQLite = angular.element('<a></a>');
            el.attr('href', message.url);
            m.domain = (el[0] as HTMLAnchorElement).hostname;
            m.url = message.url;
        }

        if (message.expiresAt) {
            const expiresAtDate: Date = new Date(message.expiresAt);

            m.expired = (expiresAtDate < now);
            m.expireDays = (new Date(message.expiresAt)).setHours(0, 0, 0, 0);
            m.expireDays -= startOfToday;
            m.expireDays /= oneDayMilliseconds;
        }

        m.received = new Date(message.received);

        m.daysAgo = startOfToday;
        m.daysAgo -= (new Date(m.received.valueOf())).setHours(0, 0, 0, 0);
        m.daysAgo /= oneDayMilliseconds;

        if (message.body) {
            m.body = message.body.replace(/\n/g, '<br/>');
        }

        m.badge = message.group.split('.').pop();

        if (m.group === 'phone' && m.body) {
            // Format US phone numbers, dropping optional country code
            m.body = m.body.replace(/(\+?1?)(\d\d\d)(\d\d\d)(\d\d\d\d)/g, '($2) $3-$4');
        }

        return m;
    }

    public active: boolean;
    public title: string;
    public body?: string;
    public group: string;
    public publicId: string;
    public received: Date;
    public url?: string;
    public domain?: string;
    public expired: boolean;
    public expireDays: number;
    public daysAgo: number;
    public badge?: string;
    public browserNotification: any;
    public state?: string;

    constructor() {
        this.expired = false;
        this.expireDays = 0;
        this.active = false;
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
}
