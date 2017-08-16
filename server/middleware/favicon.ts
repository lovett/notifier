import serveFavicon = require('serve-favicon');

export default (public_dir) => {
    return serveFavicon(public_dir + '/favicon.png');
};
