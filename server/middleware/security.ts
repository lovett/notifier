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

    const socketScheme = (scheme === 'https') ? 'wss' : 'ws';

    let hostname = (req.get('x-forwarded-server') || req.get('x-forwarded-host') || req.headers.host) as string;
    hostname = hostname.replace(/:[0-9]+$/, '');

    let port = (req.get('x-forwarded-port') || req.get('x-forwarded-host') || req.headers.host) as string;
    const numericPort = parseInt(port.replace(/.*:/, ''), 10);

    if ((scheme === 'http' && numericPort !== 80) || (scheme === 'https' && numericPort !== 443)) {
        port = ':' + numericPort;
    } else {
        port = '';
    }

    const csp: CspParams = {
        'child-src': ['self'],
        'connect-src': ['self', 'data:', 'unsafe-inline', util.format('%s://%s%s', socketScheme, hostname, port)],
        'default-src': ['none'],
        'img-src': ['self'],
        'script-src': ['self', 'data:', 'unsafe-inline', util.format('%s://%s%s', scheme, hostname, port)],
        'style-src': ['self'],
    };

    if (config.get('NOTIFIER_LIVERELOAD_HOST') && config.get('NOTIFIER_LIVERELOAD_PORT')) {
        const liveReload = util.format(
            '://%s:%s',
            config.get('NOTIFIER_LIVERELOAD_HOST'),
            config.get('NOTIFIER_LIVERELOAD_PORT'),
        );
        csp['connect-src'].push(socketScheme + liveReload);
        csp['script-src'].push(scheme + liveReload);
    }

    const cspString = Object.keys(csp).reduce((acc, key) => {
        let values;

        values = csp[key].map((value) => {
            if (value.match(/.:/)) {
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
