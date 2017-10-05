import * as Sequelize from 'sequelize';

interface Message {
    id: number;
    body?: string;
    expiresAt?: Date;
    publicId: string;
}

interface MessageInstance extends Sequelize.Instance<Message> {
    id: number;
    serviceTokens: any;
    expiresAt?: Date;
    purgeServiceToken(service: string, callback: (affectedRows: number) => void): void;
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
