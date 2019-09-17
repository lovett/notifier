import m from 'mithril';

//import User from '../models/User';
import MessageList from '../models/MessageList';

function clearAll(e: Event) {
    e.preventDefault();
}

function undo(e: Event) {
    e.preventDefault();
}

export default {
    view() {
        return [
            m('header#messageListSummary', MessageList.summary),
            m('main#messageListBody', 'hi'),
            m('footer#messageListFooter', [
                m(m.route.Link, { href: '/settings' }, 'Settings'),

                m('a', {
                    href: '#clear-all',
                    onclick: clearAll,
                }, 'Clear All'),

                m('a', {
                    href: '#undo',
                    onclick: undo,
                }, 'Undo'),

                m(m.route.Link, { href: '/logout' }, 'Logout'),
            ]),
        ];
    },
};
