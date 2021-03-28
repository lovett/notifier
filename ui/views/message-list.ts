import m from 'mithril';
import messageListSummary from './message-list-summary';
import messageListFooter from './message-list-footer';
import messageListMessage from './message-list-message';
import Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode): Array<m.Vnode> {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;
        const offline = attrs.offline as boolean;

        const nodes: m.Vnode[] = [];

        nodes.push(m(messageListSummary, { cache, offline } as m.Attributes));

        if (cache.messageCount() === 0) {
            let message = 'Checking…';
            let cssClass = '.checking';

            if (cache.filledOn) {
                message = 'You have no messages.';
                cssClass = '';
            }

            nodes.push(m(`main#messageListEmptyBody${cssClass}`, [
                m('.icon'),
                m('p', message),
            ]));
        } else {
            const messageList: m.Vnode[] = [];

            let index = 0;
            for (const message of cache.messages()) {
                messageList.push(m(messageListMessage, { message, index, cache } as m.Attributes));
                index++;
            }

            nodes.push(m('main', [
                m('#messages', messageList),
            ]));
        }

        nodes.push(m(messageListFooter, { cache, offline } as m.Attributes));

        return nodes;
    },
};
