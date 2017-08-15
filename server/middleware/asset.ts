import * as express from 'express';

export default (publicDir) => {
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
