import m from 'mithril';
import type Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode): m.Vnode {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;
        const offline = attrs.offline as boolean;
        const selector = 'footer#messageListFooter';

        const logout = m(m.route.Link, { href: '/logout' }, 'Logout');

        if (offline) {
            return m(selector, { class: 'offline' }, logout);
        }

        return m(selector, [
            m(m.route.Link, { href: '/settings' }, 'Settings'),

            cache.canRestore()
                ? m(
                      'a',
                      {
                          href: '#undo',
                          onclick: (e: Event) => {
                              e.preventDefault();
                              cache.restore().then(m.redraw);
                          },
                      },
                      'Undo',
                  )
                : null,

            logout,
        ]);
    },
};
