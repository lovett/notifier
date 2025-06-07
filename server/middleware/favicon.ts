import serveFavicon from 'serve-favicon';
import type express from 'express';

export default (publicDir: string): express.RequestHandler => {
    return serveFavicon(`${publicDir}/favicon.svg`);
};
