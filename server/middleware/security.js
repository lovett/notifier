"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
function default_1(req, res, next) {
    var config, csp, forceHttps, hostname, liveReload, numericPort, port, scheme, socketScheme;
    config = req.app.locals.config;
    forceHttps = Boolean(config.get('NOTIFIER_FORCE_HTTPS'));
    res.setHeader('X-Frame-Options', 'DENY');
    scheme = req.get('x-forwarded-proto');
    scheme = (scheme === 'https' || req.get('x-https') === 'On' || forceHttps) ? 'https' : 'http';
    socketScheme = (scheme === 'https') ? 'wss' : 'ws';
    hostname = req.get('x-forwarded-server') || req.get('x-forwarded-host') || req.headers.host;
    hostname = hostname.replace(/:[0-9]+$/, '');
    port = req.get('x-forwarded-port') || req.get('x-forwarded-host') || req.headers.host;
    numericPort = parseInt(port.replace(/.*:/, ''), 10);
    if ((scheme === 'http' && numericPort !== 80) || (scheme === 'https' && numericPort !== 443)) {
        port = ':' + numericPort;
    }
    else {
        port = '';
    }
    csp = {
        'default-src': ['none'],
        'connect-src': ['self', 'data:', 'unsafe-inline', util.format('%s://%s%s', socketScheme, hostname, port)],
        'img-src': ['self'],
        'script-src': ['self', 'data:', 'unsafe-inline', util.format('%s://%s%s', scheme, hostname, port)],
        'style-src': ['self'],
        'child-src': ['self']
    };
    if (config.get('NOTIFIER_LIVERELOAD_HOST') && config.get('NOTIFIER_LIVERELOAD_PORT')) {
        liveReload = util.format('://%s:%s', config.get('NOTIFIER_LIVERELOAD_HOST'), config.get('NOTIFIER_LIVERELOAD_PORT'));
        csp['connect-src'].push(socketScheme + liveReload);
        csp['script-src'].push(scheme + liveReload);
    }
    csp = Object.keys(csp).reduce(function (acc, key) {
        var values;
        values = csp[key].map(function (value) {
            if (value.match(/.:/))
                return value;
            return util.format('\'%s\'', value);
        });
        return acc + util.format('%s %s; ', key, values.join(' '));
    }, '');
    res.setHeader('Content-Security-Policy', csp);
    if (forceHttps) {
        res.setHeader('Strict-Transport-Security', util.format('max-age=%d', 60 * 60 * 24 * 30));
        if (req.get('x-forwarded-proto') === 'http') {
            res.redirect('https://' + req.headers['x-forwarded-host'] + req.url);
        }
    }
    next();
}
exports.default = default_1;
//# sourceMappingURL=security.js.map