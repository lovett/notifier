import m from 'mithril';

import error from './views/error';
import layout from './views/layout';
import login from './views/login';
import logout from './views/logout';
import messages from './views/messages';

import User from './models/User';

const root = document.getElementsByTagName('MAIN')[0];

m.route(root, '/', {
    '/': {
        onmatch: () => {
            if (User.isLoggedOut()) {
                m.route.set('/login');
            }
        },
        render() {
            if (User.isLoggedIn()) {
                return m(layout, m(messages));
            }

            return m.route.set('/login');
        },
    } as m.RouteResolver,

    '/error': {
        render() {
            return m(layout, m(error));
        },
    } as m.RouteResolver,

    '/login': {
        onmatch: () => {
            if (User.isLoggedIn()) {
                m.route.set('/');
            }
        },
        render() {
            return m(layout, m(login));
        },
    } as m.RouteResolver,

    '/logout': {
        onmatch: () => {
            if (User.isLoggedIn()) {
                User.logOut();
            }
        },
        render() {
            return m(layout, m(logout));
        },
    } as m.RouteResolver,
});
