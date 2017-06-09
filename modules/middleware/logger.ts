import * as fs from "fs"
import * as morgan from "morgan"

export default function (log_path: string) {
    let stream = fs.createWriteStream(
        log_path,
        {flags: 'a'}
    );

    return morgan('combined', {stream: stream});
}
