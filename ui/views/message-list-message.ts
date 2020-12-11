import m from 'mithril';
import Message from '../models/Message';
import Cache from '../models/Cache';

export default {
    expirationTimer: 0,
    expiresAt: '',

    startExpirationTimer(vnode: m.Vnode): void {
        const attrs = vnode.attrs as m.Attributes;
        const message = attrs.message as Message;
        const cache = attrs.cache as Cache;

        if (this.expirationTimer) {
            return;
        }

        this.expirationTimer = setInterval(() => {
            if (message.isExpired()) {
                cache.retract(message.publicId);
                return;
            }

            const expiresAt = message.expiresAt();

            if (this.expiresAt !== expiresAt) {
                m.redraw();
            }

            this.expiresAt = expiresAt;
        }, 1000);
    },

    stopExpirationTimer(): void {
        clearInterval(this.expirationTimer);
    },

    oninit(vnode: m.Vnode): void {
        const attrs = vnode.attrs as m.Attributes;
        const message = attrs.message as Message;

        if (message.expiration) {
            this.startExpirationTimer(vnode);
        }
    },

    // When a message arrives via push...
    onupdate(vnode: m.Vnode): void {
        const attrs = vnode.attrs as m.Attributes;
        const message = attrs.message as Message;

        this.stopExpirationTimer();

        if (message.expiration) {
            this.startExpirationTimer(vnode);
        }

    },

    onremove(): void {
        this.stopExpirationTimer();
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

        rootAttrs.onclick = () => {
            message.visit();
        }

        return m(rootTag, rootAttrs, [
            (message.badge) ? m('img.badge', { src: message.badge }) : m('.badge'),

            m('.details', [
                m('.title', message.title),

                m('time', (message.expiration) ? message.expiresAt() : message.receivedAt()),

                (message.domain) ? m('.domain', message.domain) : null,
                m('.body', message.body),
            ]),

            m('.index', index + 1),

            m('a.closer', {
                href: '#',
                onclick: (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cache.remove(message.publicId);
                },
            }),


        ]);
    },
};
