import * as Sequelize from 'sequelize';

interface Message {
    id: number;
    title: string;
    body?: string;
    url?: string;
    expiresAt?: Date;
    publicId: string;
    retracted?: string;
    localId?: string;
    pushbulletId?: string;
    UserId?: number;

}

interface MessageInstance extends Sequelize.Instance<Message> {
    dataValues: any;
    id: number;
    serviceTokens: any;
    expiresAt?: Date;
    localId?: string;
    publicId: string;
    pushbulletId?: string;
    purgeServiceToken(service: string, callback: (affectedRows: number) => void): void;
    setUser(user: User): void;
}

interface User {
    passwordHash: string;
    username: string;
    token: Token;
}

interface UserInstance extends Sequelize.Instance<User> {
    id: number;
    username: string;
    serviceTokens: any;
    getServiceTokens(callback: () => void): void;
    purgeServiceToken(service: string, callback: (affectedRows: number) => void): void;
    checkPassword(password: string, callback: (result: boolean) => void): void;
}

type PruneCallback = () => void;

type GenerateCallback = (key: string|null, value: string|null) => void;

interface Token {
    key: string;
    label?: string;
    persist?: boolean;
    value: string;
}

interface TokenInstance extends Sequelize.Instance<Token> {
    dataValues: any;
    prune: PruneCallback;
    generateKeyAndValue: GenerateCallback;
    key?: string;
    User: User;
    setUser(user: User): void;
}
