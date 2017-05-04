var util = require('util');

function main (req, res, next) {
    let csp, hostname, liveReload, port, scheme, socketScheme;

    // Clickjacking - https://www.owasp.org/index.php/Clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Content security policy - http://content-security-policy.com
    scheme = req.headers['x-forwarded-proto'];
    scheme = (scheme === 'https' || req.headers['x-https'] === 'On' || res.locals.force_https) ? 'https' : 'http';

    socketScheme = (scheme === 'https') ? 'wss' : 'ws';

    hostname = req.headers['x-forwarded-server'] || req.headers['x-forwarded-host'] || req.headers.host;
    hostname = hostname.replace(/:[0-9]+$/, '');

    port = req.headers['x-forwarded-port'] || req.headers['x-forwarded-host'] || req.headers.host;
    port = parseInt(port.replace(/.*:/, ''), 10);

    if ((scheme === 'http' && port !== 80) || (scheme === 'https' && port !== 443)) {
        port = ':' + port;
    }

    csp = {
        'default-src': ['self'],
        'connect-src': ['self', 'unsafe-inline', util.format('%s://%s%s', socketScheme, hostname, port)],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:']
    };

    if (res.locals.livereload_host && res.locals.livereload_port) {
        liveReload = util.format('//%s:%s', res.locals.livereload_host, res.locals.livereload_port);
        csp['connect-src'].push(socketScheme + liveReload);
        csp['script-src'].push(scheme + liveReload);
    }

    csp = Object.keys(csp).reduce(function (acc, key) {
        let values = csp[key].map(
            value => {
                if (value.match(/.:/)) return value;
                return util.format('\'%s\'', value);
            }
        );
        return acc + util.format('%s %s; ', key, values.join(' '));
    }, '');

    res.setHeader('Content-Security-Policy', csp);

    // Require HTTPS
    if (Boolean(res.locals.force_https)) {
        // HTTP Strict Transport Security - https://www.owasp.org/index.php/HTTP_Strict_Transport_Security
        res.setHeader('Strict-Transport-Security', util.format('max-age=%d', 60 * 60 * 24 * 30));

        if (req.headers['x-forwarded-proto'] === 'http') {
            res.redirect('https://' + req.headers['x-forwarded-host'] + req.url);
        }
    }

    next();
}

module.exports = exports = main;
