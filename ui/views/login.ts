import m from 'mithril';

import User from '../models/User';

export default {
    view(): Array<m.Vnode> {
        return [
            m('header'),
            m('form#login', {
                onsubmit(e: Event) {
                    e.preventDefault();
                    User.logIn();
                },
            }, [
                m('fieldset', [
                    m('h1', 'Hello'),
                    m('.status-message.error', {
                        hidden: User.hasNoErrorMessage(),
                    }, User.current.errorMessage),
                    m('.field', [
                        m('label', { for: 'username' }, 'Username'),
                        m('input', {
                            autocapitalize: 'off',
                            autocomplete: 'username',
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
                            autocomplete: 'current-password',
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
                        m('label', { for: 'login_remember' }, [
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
            ]),
            m('footer'),
        ];
    },
};
