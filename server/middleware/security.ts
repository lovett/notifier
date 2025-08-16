import type { NextFunction, Request, Response } from 'express';
import * as url from 'node:url';
import * as util from 'node:util';

interface CspParams {
    [key: string]: string[];
}

export default function (
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const config = req.app.locals.config;

    // Clickjacking - https://www.owasp.org/index.php/Clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Content security policy - http://content-security-policy.com
    const csp: CspParams = {
        'connect-src': ['self', 'data:', 'unsafe-inline'],
        'default-src': ['self'],
        'img-src': ['self', 'data:'],
        'script-src': ['self', 'data:', 'unsafe-inline'],
        'style-src': ['self', 'unsafe-inline'],
    };

    if (config.NOTIFIER_BADGE_BASE_URL) {
        const parsedUrl = url.parse(config.NOTIFIER_BADGE_BASE_URL);
        if (parsedUrl.host && csp['img-src']) {
            csp['img-src'].push(parsedUrl.host);
        }
    }

    const cspString = Object.keys(csp).reduce((acc, key) => {
        const quotables = ['self', 'none', 'unsafe-inline', 'unsafe-eval'];

        const values = (csp[key] || []).map((value) => {
            if (quotables.indexOf(value) === -1) {
                return value;
            }

            return util.format("'%s'", value);
        });

        return acc + util.format('%s %s; ', key, values.join(' '));
    }, '');

    res.setHeader('Content-Security-Policy', cspString);

    next();
}
