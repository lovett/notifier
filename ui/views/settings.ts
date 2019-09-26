import m from 'mithril';
import User from '../models/User';
import * as bns from '../models/BrowserNotificationService';

export default {
    oninit() {
        User.getServices();
        bns.prompt();
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

                    m('.status-message.error', {
                        hidden: User.hasNoErrorMessage(),
                    }, User.current.errorMessage),

                    m('.status-message.success', {
                        hidden: User.hasNoSuccessMessage(),
                    }, User.current.successMessage),

                    m('.field', [
                        m('span', bns.onOffMessage()),
                        bns.isDenied() ? m('p', bns.notificationsDeniedMessage) : null,
                        bns.isGranted() ? m('p', bns.notificationsEnabledMessage) : null,
                    ]),
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
