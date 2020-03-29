import * as serveFavicon from 'serve-favicon';
import * as express from 'express';

export default (publicDir: string): express.RequestHandler => {
    return serveFavicon(publicDir + '/favicon.png');
};
