import * as crypto from 'crypto';
import { GenerateCallback } from '../types/server';

export default function(callback: GenerateCallback) {
    const numBytes = 64;

    crypto.randomBytes(numBytes, (err, buf) => {
        if (err) {
            process.stderr.write('Error while generating random bytes\n');
            callback(null, null);
        }

        const bag = 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789';

        let result = '';
        for (let i = 0; i < numBytes; i = i + 1) {
            result += bag[buf[i] % bag.length];
        }

        callback(
            result.substring(0, numBytes / 2),
            result.substring(numBytes / 2),
        );

    });

}
