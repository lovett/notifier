import m from 'mithril';

export default {
    view() {
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
