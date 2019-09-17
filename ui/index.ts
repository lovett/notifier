import m from 'mithril';

import error from './views/error';
import layout from './views/layout';
import login from './views/login';
import logout from './views/logout';
import messages from './views/messages';
import settings from './views/settings';

import User from './models/User';

const root = document.getElementById('app-container') as HTMLElement;

const loginRequired = () => {
    if (User.isLoggedOut()) {
        m.route.set('/login');
    }
}

m.route(root, '/', {
    '/': {
        onmatch: loginRequired,
        render() {
            if (User.isLoggedIn()) {
                return m(messages);
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
            return m(login);
        },
    } as m.RouteResolver,

    '/logout': {
        onmatch: () => {
            if (User.isLoggedIn()) {
                User.logOut();
            }
        },
        render() {
            return m(logout);
        },
    } as m.RouteResolver,

    '/settings': {
        onmatch: loginRequired,
        render() {
            return m(settings);
        }
    } as m.RouteResolver,
});
