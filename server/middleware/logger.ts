import * as fs from 'fs';
import * as morgan from 'morgan';

export default function(logPath: string) {
    const stream = fs.createWriteStream(
        logPath,
        {flags: 'a'},
    );

    return morgan('combined', {stream});
}
