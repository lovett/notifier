import m from 'mithril';

// import User from '../models/User';

export default {
    view() {
        return [
            m('p', 'Placeholder view for message list'),
            m(m.route.Link, { href: '/logout' }, 'Logout'),
        ];
    },
};
