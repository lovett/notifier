declare module 'extract-text-webpack-plugin';

interface IMessage {
    title: string;
    body?: string;
    url?: string;
    publicId: string;
    group?: string;
    received: Date;
    expiresAt?: Date;
}

interface IExtendedMessage extends IMessage {
    state?: string;
    domain?: string;
    expired?: boolean;
    expire_days?: number;
    days_ago?: number;
    focused?: boolean;
}


interface IArchiveResponse {
    messages: IMessage[];
}
