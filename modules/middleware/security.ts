import * as util from "util";
import * as express from "express";

export default function (req: express.Request, res: express.Response, next: express.NextFunction) {
    let config, csp, forceHttps, hostname, liveReload, numericPort, port, scheme, socketScheme;

    config = req.app.locals.config;

    forceHttps = Boolean(config.get('NOTIFIER_FORCE_HTTPS'));

    // Clickjacking - https://www.owasp.org/index.php/Clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Content security policy - http://content-security-policy.com
    scheme = req.get('x-forwarded-proto');
    scheme = (scheme === 'https' || req.get('x-https') === 'On' || forceHttps) ? 'https' : 'http';

    socketScheme = (scheme === 'https') ? 'wss' : 'ws';

    hostname = req.get('x-forwarded-server') || req.get('x-forwarded-host') || req.headers.host;
    hostname = hostname.replace(/:[0-9]+$/, '');

    port = req.get('x-forwarded-port') || req.get('x-forwarded-host') || req.headers.host;
    numericPort = parseInt(port.replace(/.*:/, ''), 10);

    if ((scheme === 'http' && numericPort !== 80) || (scheme === 'https' && numericPort !== 443)) {
        port = ':' + numericPort;
    } else {
        port = '';
    }

    csp = {
        'default-src': ['self', 'data:']
        'connect-src': ['unsafe-inline', util.format('%s://%s%s', socketScheme, hostname, port)],
        'script-src': [util.format('%s://%s%s', scheme, hostname, port)],
    };

    if (config.get('NOTIFIER_LIVERELOAD_HOST') && config.get('NOTIFIER_LIVERELOAD_PORT')) {
        liveReload = util.format(
            '://%s:%s',
            config.get('NOTIFIER_LIVERELOAD_HOST'),
            config.get('NOTIFIER_LIVERELOAD_PORT')
        );
        csp['connect-src'].push(socketScheme + liveReload);
        csp['script-src'].push(scheme + liveReload);
    }

    csp = Object.keys(csp).reduce((acc, key) => {
        let values;

        values = csp[key].map(
            value => {
                if (value.match(/.:/)) return value;

                return util.format('\'%s\'', value);
            }
        );

        return acc + util.format('%s %s; ', key, values.join(' '));
    }, '');

    res.setHeader('Content-Security-Policy', csp);

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
