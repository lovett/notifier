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
                    const data = new FormData(e.target as HTMLFormElement);
                    User.saveServices(data);
                },
            }, [
                m('fieldset', [
                    m('h1', 'Settings'),
                    m('.message.error', {
                        hidden: User.hasNoErrorMessage(),
                    }, User.current.errorMessage),
                    m('.message.success', {
                        hidden: User.hasNoSuccessMessage(),
                    }, User.current.successMessage),
                    Object.keys(User.current.settings!).map((name: string) => {
                        const value = User.current.settings![name];
                        return m('.field', [
                            m('label', { for: name }, name),
                            m('input', { name, type: 'text', value }),
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
