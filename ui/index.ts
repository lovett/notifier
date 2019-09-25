import m from 'mithril';

import error from './views/error';
import login from './views/login';
import logout from './views/logout';
import messageList from './views/message-list';
import settings from './views/settings';
import shortcuts from './views/shortcuts';

import Cache from './models/Cache';
import { ShortcutService } from './models/ShortcutService';
import User from './models/User';

const root = document.getElementById('app-container') as HTMLElement;

const loginRequired = () => {
    if (User.isLoggedOut()) {
        m.route.set('/login');
    }
};

const cache = new Cache(window.navigator.userAgent);
const shortcutService = new ShortcutService(cache);

document.addEventListener('keydown', (e: KeyboardEvent) => {
    const charCode: number = e.which || e.keyCode;

    // Avoid conflict with browser UI shortcuts.
    if (e.altKey === true || e.ctrlKey === true) {
        return;
    }

    // Safari triggers a keyless keydown event during login autofill.
    if (!charCode) {
        return;
    }

    shortcutService.match(e.key);
});

m.route(root, '/', {
    '/': {
        onmatch: loginRequired,
        render() {
            return m(messageList, { cache } as m.Attributes);
        },
    } as m.RouteResolver,

    '/error': {
        render() {
            return m(error);
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
        },
    } as m.RouteResolver,

    '/shortcuts': {
        onmatch: loginRequired,
        render() {
            return m(shortcuts, { shortcutService } as m.Attributes);
        },
    } as m.RouteResolver,
});
