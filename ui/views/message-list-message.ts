import m from 'mithril';
import Message from '../models/Message';
import Cache from '../models/Cache';

export default {
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

        rootAttrs.onclick = () => {
            message.visit();
        }

        return m(rootTag, rootAttrs, [
            m('.badge', [
                (message.badge) ? m('img', { src: message.badge }) : m('div'),
            ]),

            m('header', [
                m('h1', message.title),

                m('time', (message.expiration) ? message.expiresAt() : message.receivedAt()),

                (message.domain) ? m('p.domain', message.domain) : null,
            ]),

            m('p', message.body),

            m('a.close', {
                href: '#',
                onclick: (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cache.remove(message.publicId);
                },
            }, [
                m('span'),
            ]),

            m('.index', index + 1),
        ]);
    },
};
