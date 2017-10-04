import * as express from 'express';

export default (publicDir: string) => {
    return express.static(
        publicDir,
        {
            setHeaders(res) {
                res.set('Cache-Control', 'no-cache, private');
            },
            etag: false,
        },
    );
};
