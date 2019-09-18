import m from 'mithril';

import User from '../models/User';
import BrowserNotification from '../models/BrowserNotification';

const notificationOffMessage = `Browser notifications are off.`;
const notificationOnMessage = `Browser notifications are on.`;
const notificationsDeniedMessage = `They can be turned on from the brower's settings page.`;
const notificationsEnabledMessage = `They can be turned off from the browser's settings page.`;
const notificationEnableLabel = `Turn them on`;

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
                    m('.field', [
                        m('span', BrowserNotification.isGranted() ? notificationOnMessage : notificationOffMessage),

                        BrowserNotification.isDenied() ? m('p', notificationsDeniedMessage) : null,
                        BrowserNotification.isGranted() ? m('p', notificationsEnabledMessage) : null,
                        BrowserNotification.isDefault() ? m('a', {
                            href: '#browser-notifications',
                            onclick: (e: Event) => {
                                e.preventDefault();
                                BrowserNotification.prompt();
                            },
                        }, notificationEnableLabel) : null,

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
