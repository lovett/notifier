import * as url from "url";
import * as util from "util";
import * as express from "express";

interface CspParams {
    [key: string]: string[];
}


export default function(req: express.Request, res: express.Response, next: express.NextFunction) {
    const config = req.app.locals.config;

    const forceHttps = Boolean(config.get('NOTIFIER_FORCE_HTTPS'));

    // Clickjacking - https://www.owasp.org/index.php/Clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Content security policy - http://content-security-policy.com
    let scheme = req.get('x-forwarded-proto');
    scheme = (scheme === 'https' || req.get('x-https') === 'On' || forceHttps) ? 'https' : 'http';

    let hostname = (req.get('x-forwarded-server') || req.get('x-forwarded-host') || req.headers.host) as string;
    hostname = hostname.replace(/:[0-9]+$/, '');

    const csp: CspParams = {
        'connect-src': ['self', 'data:', 'unsafe-inline'],
        'default-src': ['self'],
        'img-src': ['self'],
        'script-src': ['self', 'data:', 'unsafe-inline'],
        'style-src': ['self', 'unsafe-inline'],
    };

    if (config.get('NOTIFIER_BADGE_BASE_URL')) {
        const parsedUrl = url.parse(config.get('NOTIFIER_BADGE_BASE_URL'));
        csp['img-src'].push(parsedUrl.host as string);
    }

    const cspString = Object.keys(csp).reduce((acc, key) => {
        let values;
        const quotables = ['self', 'none', 'unsafe-inline', 'unsafe-eval'];

        values = csp[key].map((value) => {
            if (quotables.indexOf(value) === -1) {
                return value;
            }

            return util.format('\'%s\'', value);
        });

        return acc + util.format('%s %s; ', key, values.join(' '));
    }, '');

    res.setHeader('Content-Security-Policy', cspString);

    // Require HTTPS
    if (forceHttps) {
        // HTTP Strict Transport Security - https://www.owasp.org/index.php/HTTP_Strict_Transport_Security
        res.setHeader('Strict-Transport-Security', util.format('max-age=%d', 60 * 60 * 24 * 30));

        if (req.get('x-forwarded-proto') === 'http') {
            res.redirect('https://' + req.headers['x-forwarded-host'] + req.url);
        }
    }

    next();
}
