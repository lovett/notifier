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

        if (cache.hasFilled === false) {
            console.log('too soon!');
            return;
        }

        const nodes: m.Vnode[] = [];

        nodes.push(m('header#messageListSummary', [
            m(messageListSummary, { cache } as m.Attributes),
        ]));

        if (cache.items.size === 0) {
            nodes.push(m('main#messageListEmptyBody', [
                m('svg.icon.icon-close', { role: 'img' }, [
                    m('use', { 'xlink:href': '#icon-waves' }),
                ]),
                m('p', 'You have no messages.'),

            ]));
        } else {
            nodes.push(m('main', [
                m('#messages', Array.from(cache.items.values()).map((message, index) => {
                    return m(messageListMessage, { message, index, cache } as m.Attributes);
                })),
            ]));
        }

        nodes.push(m('footer#messageListFooter', [
            m(messageListFooter, { cache } as m.Attributes),
        ]));

        return nodes;
    },
};
