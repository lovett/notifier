import * as express from 'express';
import * as crypto from 'crypto';
import { UserInstance } from '../../types/server';

function randomString(len: number) {
    let randomBytes;

    randomBytes = crypto.randomBytes(Math.ceil(len / 2));

    return randomBytes.toString('hex').slice(0, len);
}

export default function(app: express.Application) {
    const DEFAULT_USER_ID = 1;

    let username: string = app.locals.config.get('NOTIFIER_DEFAULT_USER');
    let password: string = app.locals.config.get('NOTIFIER_DEFAULT_PASSWORD');

    if (!username) {
        username = randomString(6);
    }

    if (!password) {
        password = randomString(12);
    }

    const filter = {
        where: {
            id: DEFAULT_USER_ID,
        },
    };

    app.locals.User.findOne(filter).then((user: UserInstance) => {
        if (user) {
            return;
        }

        app.locals.User.create({
            id: DEFAULT_USER_ID,
            passwordHash: password,
            username,
        }).then((createdUser: UserInstance) => {
            process.stdout.write('Created a default user:\n');
            process.stdout.write(`- Username: ${createdUser.username}\n`);
            process.stdout.write(`- Password: ${password}\n`);
        });

    });
}
