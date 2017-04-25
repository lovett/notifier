var util = require('util');

function main (req, res, next) {
    var connectSrc, headerValue, hostname, httpProtocol, liveReloadHostPort, scriptSrc, websocketProtocol;
    // Clickjacking - see
    // https://www.owasp.org/index.php/Clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Content security policy - see
    // http://content-security-policy.com

    // get hostname without port
    hostname = req.headers['x-forwarded-host'] || req.headers.host;
    hostname = hostname.replace(/:[0-9]+$/, '', hostname);

    // account for custom websocket port
    connectSrc = 'connect-src \'self\'';
    scriptSrc = 'script-src \'self\'';

    // allow inline scripts for Safari only to avoid a "Refused to
    // execute inline script..." error when extensions such as
    // ublock are installed.
    if (req.headers['user-agent'].indexOf('Safari') > -1 && req.headers['user-agent'].indexOf('Chrome') === -1) {
        scriptSrc += ' \'unsafe-inline\'';
    }

    httpProtocol = (res.locals.force_https)? 'https':'http';
    websocketProtocol = (httpProtocol === 'https')? 'wss':'ws';

    if (res.locals.websocket_port) {
        connectSrc += util.format(' %s://%s:%s', websocketProtocol, hostname, res.locals.websocket_port);
        scriptSrc  += util.format(' %s://%s:%s', httpProtocol, hostname, res.locals.websocket_port);
    }

    if (res.locals.livereload_host && res.locals.livereload_port) {
        liveReloadHostPort = util.format('%s:%s', res.locals.livereload_host, res.locals.livereload_port);
        connectSrc += util.format(' %s://%s', websocketProtocol, liveReloadHostPort);
        scriptSrc += util.format(' %s://%s', httpProtocol, liveReloadHostPort);
    }

    headerValue = [];
    headerValue.push('default-src \'self\'');
    headerValue.push('style-src \'self\' \'unsafe-inline\'');
    headerValue.push('img-src \'self\' data:');
    headerValue.push(connectSrc);
    headerValue.push(scriptSrc);

    res.setHeader('Content-Security-Policy', headerValue.join('; '));

    // Require HTTPS
    if (res.locals.force_https === 'true') {
        // HTTP Strict Transport Security - see
        // https://www.owasp.org/index.php/HTTP_Strict_Transport_Security
        // --------------------------------------------------------------------
        res.setHeader('Strict-Transport-Security', util.format('max-age=%d', 60 * 60 * 24 * 30));

        if (req.headers['x-forwarded-proto'] === 'http') {
            res.redirect('https://' + req.headers['x-forwarded-host'] + req.url);
        }
    }

    next();
}

module.exports = exports = main;
