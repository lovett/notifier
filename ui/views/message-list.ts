import m from 'mithril';
import messageListSummary from './message-list-summary';
import messageListFooter from './message-list-footer';
import messageListMessage from './message-list-message';
import Cache from '../models/Cache';

const cache = new Cache(window.navigator.userAgent);

export default {
    oninit() {
        cache.fill();
    },

    view() {
        return [
            m('header#messageListSummary', [
                m(messageListSummary, { cache }),
            ]),

            m('main#messageListBody', Object.keys(cache.items).map((key, index) => {
                const message = cache.items[key];
                return m(messageListMessage, { message, index, cache })
            })),

            m('footer#messageListFooter', [
                m(messageListFooter, { cache }),
            ]),
        ];
    },
};
