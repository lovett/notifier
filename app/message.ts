export default class Message {
    public static fromJson(message: IMessage) {
        const m = new Message();
        const startOfToday = (new Date()).setHours(0, 0, 0, 0);
        const now = new Date();
        const oneDayMilliseconds = 86400000;

        m.title = message.title;
        m.active = false;
        m.group = message.group;
        m.publicId = message.publicId;

        if (message.url) {
            const el: JQLite = angular.element('<a></a>');
            el.attr('href', message.url);
            m.domain = (el[0] as HTMLAnchorElement).hostname;
        }


        m.expired = false;
        m.expire_days = 0;

        if (message.expiresAt) {
            const expiresAtDate: Date = new Date(message.expiresAt);

            m.expired = (expiresAtDate < now);
            m.expire_days = (new Date(message.expiresAt)).setHours(0, 0, 0, 0);
            m.expire_days -= startOfToday;
            m.expire_days /= oneDayMilliseconds;
        }

        m.received = new Date(message.received);

        m.days_ago = startOfToday;
        m.days_ago -= (new Date(m.received.valueOf())).setHours(0, 0, 0, 0);
        m.days_ago /= oneDayMilliseconds;

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
    public expire_days: number;
    public days_ago: number;
    public badge?: string;
    public browserNotification: any;
    public state?: string;

    public prepareForRemoval() {
        if (this.browserNotification) {
            this.browserNotification.close();
        }
    }

}
