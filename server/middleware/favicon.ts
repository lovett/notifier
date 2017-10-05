import * as serveFavicon from 'serve-favicon';

export default (public_dir: string) => {
    return serveFavicon(public_dir + '/favicon.png');
};
