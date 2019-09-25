import m from 'mithril';
import messageListSummary from './message-list-summary';
import messageListFooter from './message-list-footer';
import messageListMessage from './message-list-message';
import Cache from '../models/Cache';

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
            'blur',
            cache.deselect.bind(cache),
        );
    },

    onremove(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;

        document.removeEventListener(
            'visibilitychange',
            cache.deselect.bind(cache),
        );

        window.addEventListener(
            'blur',
            cache.deselect.bind(cache),
        );
    },

    view(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;

        return [
            m('header#messageListSummary', [
                m(messageListSummary, { cache } as m.Attributes),
            ]),

            m('main#messageListBody', [
                m('#messages', Array.from(cache.items.values()).map((message, index) => {
                    return m(messageListMessage, { message, index, cache } as m.Attributes);
                })),
            ]),

            m('footer#messageListFooter', [
                m(messageListFooter, { cache } as m.Attributes),
            ]),
        ];
    },
};
