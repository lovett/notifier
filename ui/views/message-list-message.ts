import m from 'mithril';
import Message from '../models/Message';
import Cache from '../models/Cache';
import messageListMessageOptions from './message-list-message-options';

export default {
    view(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const message = attrs.message as Message;
        const index = attrs.index as number;
        const cache = attrs.cache as Cache;
        const rootTag = message.rootTag();
        const rootAttrs: m.Attributes = {};

        if (rootTag.startsWith('a')) {
            rootAttrs.href = message.url;
            rootAttrs.rel = 'noopener noreferrer';
            rootAttrs.target = '_blank';
        }

        return m(rootTag, rootAttrs, [
            m('.badge', m('div')),

            m('header', [
                m('h1', message.title),

                m('time', message.receivedAt()),

                m('p.expiration', message.expiresAt()),

                (message.domain) ? m('p.domain', message.domain) : null,
            ]),

            m('p', message.body),

            m(messageListMessageOptions, { message, cache }),

            m('.index', index + 1),
        ]);
    },
};
