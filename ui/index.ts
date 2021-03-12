import m from 'mithril';

import error from './views/error';
import login from './views/login';
import logout from './views/logout';
import messageList from './views/message-list';
import settings from './views/settings';
import shortcuts from './views/shortcuts';

import Message from './models/Message';
import Cache from './models/Cache';
import { ShortcutService } from './models/ShortcutService';
import User from './models/User';
import {Command, Event} from '../worker/postmessage';

const root = document.getElementById('app-container') as HTMLElement;
const cache = new Cache();
const shortcutService = new ShortcutService(cache);
const worker = new Worker('worker.js');
let offline = false;

function onMessage(e: MessageEvent): void {
    offline = false;

    if (e.data === Event.connected) {
        cache.fill();
        return;
    }

    if (e.data === Event.disconnected) {
        offline = true;
        return;
    }

    if (e.data === Event.error) {
        offline = true;
        m.redraw();
        return;
    }

    const message = Message.fromJson(e.data);

    if (message.isExpired()) {
        cache.drop(message);
        m.redraw();
        return;
    }

    cache.add(message);

    if (message.deliveryStyle === 'normal' && !document.hasFocus()) {
        message.sendBrowserNotification();
    }

    m.redraw();

}

worker.addEventListener('message', onMessage);

document.addEventListener('keydown', (e: KeyboardEvent) => {
    const charCode: number = e.which || e.keyCode;

    if (e.target && (e.target as HTMLElement).nodeName === 'INPUT') {
        return;
    }

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
        onmatch() {
            if (User.isLoggedOut()) {
                m.route.set('/login');
                return;
            }

            worker.postMessage(Command.connect);
        },
        render() {
            return m(messageList, { cache, offline } as m.Attributes);
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

            cache.empty();
            worker.postMessage(Command.disconnect);
        },
        render() {
            return m(logout);
        },
    } as m.RouteResolver,

    '/settings': {
        onmatch: () => {
            if (User.isLoggedOut()) {
                m.route.set('/login');
            }
        },
        render() {
            return m(settings);
        },
    } as m.RouteResolver,

    '/shortcuts': {
        onmatch: () => {
            if (User.isLoggedOut()) {
                m.route.set('/login');
            }
        },
        render() {
            return m(shortcuts, { shortcutService } as m.Attributes);
        },
    } as m.RouteResolver,
});
