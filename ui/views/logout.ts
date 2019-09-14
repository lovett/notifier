import m from 'mithril';

export default {
    view() {
        return m('.centered', [
            m('h1', 'Goodbye'),
            m('p', 'You have been logged out'),
            m('button', {
                autofocus: true,
                onclick: (e: Event) => {
                    e.preventDefault();
                    m.route.set('/login');
                },
            }, 'Sign in again'),
        ]);
    },
};
