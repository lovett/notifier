import * as Sequelize from 'sequelize';

interface Message {
    id: number;
    body?: string;
    expiresAt?: Date;
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
}

interface UserInstance extends Sequelize.Instance<User> {
    id: number;
    serviceTokens: any;
    purgeServiceToken(service: string, callback: (affectedRows: number) => void): void;
}

type PruneCallback = () => void;

type GenerateCallback = (key: string|null, value: string|null) => void;

interface Token {
    key: string;
    label?: string;
    persist: boolean;
    value: string;
    dataValues: any;
}

interface TokenInstance extends Sequelize.Instance<Token> {
    prune: PruneCallback;
    generateKeyAndValue: GenerateCallback;
}
