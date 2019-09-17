import m from 'mithril';

import User from '../models/User';

export default {
    oninit() {
        User.getServices();
    },

    view() {
        return [
            m('header'),
            m('form#settings', {
                onsubmit(e: Event) {
                    e.preventDefault();
                },
            }, [
                m('fieldset', [
                    m('h1', 'Settings'),
                    Object.keys(User.current.settings!).map((name: string) => {
                        const value = User.current.settings![name];
                        return m('.field', [
                            m('label', { for: name }, name),
                            m('input', { type: 'text', value }),
                        ]);
                    }),
                    m('.field', m('button', 'save')),
                ]),
            ]),
            m('footer#messageListFooter', [
                m(m.route.Link, { href: '/' }, 'Messages'),
                m(m.route.Link, { href: '/logout' }, 'Logout'),
            ]),
        ];
    },
};
