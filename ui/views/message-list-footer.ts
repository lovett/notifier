import m from 'mithril';
import Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;

        return [
            m(m.route.Link, { href: '/settings' }, 'Settings'),

            m('a', {
                href: '#clear-all',
                onclick: (e: Event) => {
                    e.preventDefault();
                    cache.removeAll();
                },
            }, 'Clear All'),

            m('a', {
                href: '#undo',
                onclick: (e: Event) => {
                    e.preventDefault();
                    cache.undo();
                },
            }, 'Undo'),

            m(m.route.Link, { href: '/logout' }, 'Logout'),
        ];
    },
};
