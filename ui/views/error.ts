import m from 'mithril';

export default {
    view(): Array<m.Vnode> {
        return [
            m('header'),

            m('main', [
                m('p', 'An error occurred'),
                m(m.route.Link, { href: '/' }, 'Home'),
            ]),

            m('footer'),
        ];
    },
};
