import m from 'mithril';
import Message from '../models/Message';
import Cache from '../models/Cache';
import messageListMessageOptions from './message-list-message-options';

export default {
    oncreate(vnode: m.VnodeDOM): void {
        const attrs = vnode.attrs as m.Attributes;
        const message = attrs.message as Message;

        let touchStartX = 0;
        let touchEndX = 0;
        vnode.dom.addEventListener('touchstart', (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        vnode.dom.addEventListener('touchend', (e: TouchEvent) => {
            touchEndX = e.changedTouches[0].screenX;

            if (touchEndX < touchStartX) {
                message.extended = true;
            }

            if (touchEndX > touchStartX) {
                message.extended = false;
            }

            m.redraw();
        });
    },

    view(vnode: m.Vnode): m.Vnode {
        const attrs = vnode.attrs as m.Attributes;
        const message = attrs.message as Message;
        const index = attrs.index as number;
        const cache = attrs.cache as Cache;
        const rootTag = message.rootTag();
        const rootAttrs: m.Attributes = {
            class: 'online',
        };

        if (cache.isOffline) {
            rootAttrs.class = 'offline';
        }

        if (rootTag.startsWith('a')) {
            rootAttrs.href = message.url;
            rootAttrs.rel = 'noopener noreferrer';
            rootAttrs.target = '_blank';
        }


        return m(rootTag, rootAttrs, [
            m('.badge', [
                (message.badge) ? m('img', { src: message.badge }) : m('div'),
            ]),

            m('header', [
                m('h1', message.title),

                m('time', (message.hasExpiration()) ? message.expiresAt() : message.receivedAt()),

                (message.domain) ? m('p.domain', message.domain) : null,
            ]),

            m('p', message.body),

            m(messageListMessageOptions, { message, cache } as m.Attributes),

            m('.index', [
                (message.localId) ? `#${message.localId} / ` : '',
                index + 1,
            ]),
        ]);
    },
};
