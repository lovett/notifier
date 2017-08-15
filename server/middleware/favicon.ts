import serveFavicon = require('serve-favicon');

export default function (public_dir) {
    return serveFavicon(public_dir + '/favicon/favicon.ico');
}
