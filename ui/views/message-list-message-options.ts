import m from 'mithril';

export default {
    view(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const message = attrs.message;
        const cache = attrs.cache;

        const rootAttrs = {
            'data-public-id': message.publicId,
        };

        return m('.options', rootAttrs, [
            m('a', {
                href: '#',
                onclick: (e: Event) => {
                    e.preventDefault();
                    cache.remove(message.publicId);
                },
            }, [
                m('span', [
                    m('svg.icon.icon-close', {
                        'aria-label': 'Close icon',
                        'role': 'img',
                    }, [
                        m('use', {
                            'xlink:href': '#icon-close',
                        }),
                    ]),
                ]),
            ]),
        ]);
    },
};
