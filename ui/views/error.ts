import m from 'mithril';

// import User from '../models/User';

export default {
    view() {
        return [
            m('p', 'An error occurred'),
            m(m.route.Link, { href: '/' }, 'Home'),
        ];
    },
};
