import m from 'mithril';
import messageListSummary from './message-list-summary';
import messageListFooter from './message-list-footer';
import messageListMessage from './message-list-message';
import Cache from '../models/Cache';

let isOffline = false;
let redrawTimer: number = 0;

export default {
    oninit(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;
        cache.fill();
    },

    oncreate(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;

        document.addEventListener(
            'visibilitychange',
            cache.deselect.bind(cache),
        );

        window.addEventListener(
            'offline',
            cache.goOffline.bind(cache),
        );

        window.addEventListener(
            'online',
            cache.goOnline.bind(cache),
        );

        window.addEventListener(
            'blur',
            cache.deselect.bind(cache),
        );

        redrawTimer = setInterval(() => {
            const expirations = cache.impendingExpirations();
            let shouldRedraw = false;

            if (cache.isOffline !== isOffline) {
                isOffline = cache.isOffline;
                shouldRedraw = true;
            }

            if (expirations.size > 0) {
                shouldRedraw = true;
            }

            if (shouldRedraw) {
                m.redraw();
            }

        }, 1000);
    },

    onremove(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;

        document.removeEventListener(
            'visibilitychange',
            cache.deselect.bind(cache),
        );

        window.removeEventListener(
            'blur',
            cache.deselect.bind(cache),
        );

        window.removeEventListener(
            'online',
            cache.goOnline.bind(cache),
        );

        window.removeEventListener(
            'offline',
            cache.goOffline.bind(cache),
        );

        clearInterval(redrawTimer);
    },

    view(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;
        const nodes: m.Vnode[] = [];

        nodes.push(m(messageListSummary, { cache } as m.Attributes));

        if (cache.items.size === 0) {
            nodes.push(m('main#messageListEmptyBody', [
                m('.icon'),
                m('p', 'You have no messages.'),
            ]));
        } else {
            const messageList: m.Vnode[] = [];

            for (const [, message] of cache.items) {
                messageList.push(m(messageListMessage, { message, index: 1, cache } as m.Attributes));
            }

            nodes.push(m('main', [
                m('#messages', messageList),
            ]));
        }

        nodes.push(m(messageListFooter, { cache } as m.Attributes));

        return nodes;
    },
};
