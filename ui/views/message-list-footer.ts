import m from 'mithril';
import Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode): m.Vnode {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;
        const selector = 'footer#messageListFooter';

        const logout = m(m.route.Link, { href: '/logout' }, 'Logout');

        if (cache.isOffline) {
            return m(selector, { class: 'offline' }, logout);
        }

        return m(selector, [
            m(m.route.Link, { href: '/settings' }, 'Settings'),

            (cache.canRestore()) ? m('a', {
                href: '#undo',
                onclick: (e: Event) => {
                    e.preventDefault();
                    cache.restore();
                },
            }, 'Undo') : null,

            logout,
        ]);
    },
};
