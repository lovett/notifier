import * as express from "express";

export default function (public_dir) {
    return express.static(
        public_dir,
        {
            setHeaders: function (res) {
                res.set('Cache-Control', 'no-cache, private');
            },
            etag: false
        }
    );
}
