import serveFavicon from 'serve-favicon';
import express from 'express';

export default (publicDir: string): express.RequestHandler => {
    return serveFavicon(publicDir + '/favicon.svg');
};
