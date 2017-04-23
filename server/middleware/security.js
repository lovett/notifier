var util = require('util');

function main (config) {
    return function (req, res, next) {
        var connectSrc, headerValue, hostname, httpProtocol, liveReloadHostPort, scriptSrc, websocketProtocol;
        // Clickjacking - see
        // https://www.owasp.org/index.php/Clickjacking
        // --------------------------------------------------------------------
        res.setHeader('X-Frame-Options', 'DENY');

        // Content security policy - see
        // http://content-security-policy.com
        // --------------------------------------------------------------------

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

        httpProtocol = (parseInt(config.get('NOTIFIER_FORCE_HTTPS'), 10) === 1)? 'https':'http';
        websocketProtocol = (httpProtocol === 'https')? 'wss':'ws';

        if (config.get('NOTIFIER_WEBSOCKET_PORT')) {
            connectSrc += util.format(' %s://%s:%s', websocketProtocol, hostname, config.get('NOTIFIER_WEBSOCKET_PORT'));
            scriptSrc  += util.format(' %s://%s:%s', httpProtocol, hostname, config.get('NOTIFIER_WEBSOCKET_PORT'));
        }

        if (config.get('NOTIFIER_LIVERELOAD_HOST') && config.get('NOTIFIER_LIVERELOAD_PORT')) {
            liveReloadHostPort = util.format('%s:%s', config.get('NOTIFIER_LIVERELOAD_HOST'), config.get('NOTIFIER_LIVERELOAD_PORT'));
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

        // Flash cross domain policy file - see
        // http://www.adobe.com/devnet-docs/acrobatetk/tools/AppSec/CrossDomain_PolicyFile_Specification.pdf
        // --------------------------------------------------------------------
        if (req.path === '/crossdomain.xml') {
            res.set('Content-Type', 'text/x-cross-domain-policy');
        }

        // Require HTTPS
        if (config.get('NOTIFIER_FORCE_HTTPS') === 'true') {
            // HTTP Strict Transport Security - see
            // https://www.owasp.org/index.php/HTTP_Strict_Transport_Security
            // --------------------------------------------------------------------
            res.setHeader('Strict-Transport-Security', util.format('max-age=%d', 60 * 60 * 24 * 30));

            if (req.headers['x-forwarded-proto'] === 'http') {
                res.redirect('https://' + req.headers['x-forwarded-host'] + req.url);
            }
        }

        return next();
    };
}

exports = module.exports = main;
