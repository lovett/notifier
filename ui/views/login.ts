import m from 'mithril';

import User from '../models/User';

export default {
    view() {
        return m('form', {
            name: 'loginForm',
            onsubmit(e: Event) {
                e.preventDefault();
                User.logIn();
            },
        }, [
            m('fieldset', [
                m('h1', 'Hello'),
                m('.field.error', {
                    hidden: User.hasNoMessage(),
                }, User.current.message),
                m('.field', [
                    m('label', { for: 'username' }, 'Username'),
                    m('input', {
                        autocapitalize: 'off',
                        autocorrect: 'off',
                        autofocus: true,
                        id: 'username',
                        name: 'username',
                        oninput: (e: InputEvent) => {
                            const target = e.target as HTMLInputElement;
                            User.current.username = target.value;
                        },
                        required: true,
                        type: 'text',
                        value: User.current.username,
                    }),
                ]),

                m('.field', [
                    m('label', { for: 'password' }, 'Password'),
                    m('input', {
                        autocorrect: 'off',
                        id: 'password',
                        name: 'password',
                        oninput: (e: InputEvent) => {
                            const target = e.target as HTMLInputElement;
                            User.current.password = target.value;
                        },
                        required: true,
                        type: 'password',
                        value: User.current.password,
                    }),
                ]),

                m('.field', [
                    m('label.inline-label', { for: 'login_remember' }, [
                        m('input', {
                            checked: User.current.persist,
                            id: 'login_remember',
                            name: 'persist',
                            onclick: (e: Event) => {
                                const target = e.target as HTMLInputElement;
                                User.current.persist = target.checked;
                            },
                            type: 'checkbox',
                            value: 1,
                        }),
                        ' Stay logged in',
                    ]),
                ]),

                m('.field', [
                    m('button', {
                        disabled: User.isLoggingIn(),
                    }, (User.isLoggingIn() ? 'Signing in…' : 'Sign in')),
                ]),
            ]),
        ]);
    },
};
