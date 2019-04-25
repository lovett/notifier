interface TokenRecord {
    key: string;
    label?: string;
    persist?: boolean;
    value: string;
}

interface MessageRecord {
    body?: string;
    serviceTokens?: any;
    expiresAt?: Date;
    localId?: string;
    publicId: string;
    title: string;
    group?: string;
    badge?: string;
    source?: string;
    url?: string;
    received: Date;
}

import * as Sequelize from 'sequelize';
import * as Promise from 'bluebird';

interface IndexSignature {
    [key: string]: any;
}

interface Message extends IndexSignature {
    id?: number;
    title?: string;
    body?: string;
    url?: string;
    expiresAt?: Date;
    publicId?: string;
    retracted?: string;
    localId?: string;
    UserId?: number;
}

interface MessageInstance extends Sequelize.Instance<Message> {
    body?: string;
    id: number;
    serviceTokens: any;
    expiresAt?: Date;
    localId?: string;
    publicId: string;
    purgeServiceToken(service: string, callback: (affectedRows: number) => void): void;
    setUser(user: User): Promise<MessageInstance>;
    title: string;
}

interface User {
    id: number;
    passwordHash: string;
    username: string;
    token: any;
}

type GenerateCallback = (key: string | null, value: string | null) => void;

interface UserInstance extends Sequelize.Instance<User> {
    id: number;
    passwordHash: string;
    serviceTokens: any;
    token?: any;
    username: string;
    purgeServiceToken(service: string, callback: (affectedRows: number) => void): void;
}

type PruneCallback = () => void;

interface Token {
    key: string;
    label?: string;
    persist?: boolean;
    value: string;
    UserId: number;
}

interface TokenInstance extends Sequelize.Instance<Token> {
    id: number;
    prune: PruneCallback;
    key: string;
    label?: string;
    persist?: boolean;
    value: string;
    User: UserInstance;
    setUser(user: User): Promise<UserInstance>;
}
