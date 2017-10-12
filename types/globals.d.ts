declare module 'extract-text-webpack-plugin';

interface IMessage {
    title: string;
    body?: string;
    url?: string;
    publicId: string;
    group: string;
    received: string;
    expiresAt?: string;
    stage: string;
}

interface IExtendedMessage extends IMessage {
    state?: string;
    domain?: string;
    expired?: boolean;
    expire_days?: number;
    days_ago?: number;
    focused?: boolean;
}
