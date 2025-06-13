import * as crypto from 'node:crypto';
import * as util from 'node:util';
import type Token from './Token';

export default class User {
    public static hashPassword(password: string): string {
        const buf = crypto.randomBytes(User.hashKeylength);
        const salt = buf.toString('hex');

        const hash = crypto.pbkdf2Sync(
            password,
            salt,
            User.hashIterations,
            User.hashKeylength,
            User.hashDigest,
        );

        return `${salt}::${hash.toString('hex')}`;
    }

    private static hashIterations = 20000;
    private static hashKeylength = 64;
    private static hashDigest = 'sha1';

    public readonly id: number = 0;
    public readonly token?: Token;
    public readonly username: string = '';
    public readonly createdAt?: Date;
    private readonly passwordHash: string = '';

    constructor(data: Partial<User>) {
        Object.assign(this, data);
    }

    public async testPassword(password: string): Promise<boolean> {
        const pbkdf2 = util.promisify(crypto.pbkdf2);

        if (this.passwordHash === undefined) {
            return false;
        }

        const [salt, storedKey] = this.passwordHash.split('::', 2);

        const derivedKey = await pbkdf2(
            password,
            salt || '',
            User.hashIterations,
            User.hashKeylength,
            User.hashDigest,
        );

        return derivedKey.toString('hex') === storedKey;
    }
}
