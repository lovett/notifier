import * as serveFavicon from 'serve-favicon';

export default (publicDir: string) => {
    return serveFavicon(publicDir + '/favicon.png');
};
