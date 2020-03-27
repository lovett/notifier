import m from 'mithril';

export default {
    view(vnode: m.Vnode): m.Vnode {
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
                m('span.icon'),
            ]),
        ]);
    },
};
