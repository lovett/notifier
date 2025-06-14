import m from 'mithril';

export default {
    view(): Array<m.Vnode> {
        return [
            m('header'),

            m('main#logout', [
                m('h1', 'Goodbye'),
                m('p', 'You have been logged out.'),
                m(
                    'button',
                    {
                        autofocus: true,
                        onclick: (e: Event) => {
                            e.preventDefault();
                            m.route.set('/login');
                        },
                    },
                    'Sign in again',
                ),
            ]),

            m('footer'),
        ];
    },
};
