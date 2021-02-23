import m from 'mithril';
import messageListSummary from './message-list-summary';
import messageListFooter from './message-list-footer';
import messageListMessage from './message-list-message';
import Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode): Array<m.Vnode> {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;

        const nodes: m.Vnode[] = [];

        nodes.push(m(messageListSummary, { cache } as m.Attributes));

        if (cache.messageCount() === 0) {
            nodes.push(m('main#messageListEmptyBody', [
                m('.icon'),
                m('p', 'You have no messages.'),
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

        nodes.push(m(messageListFooter, { cache } as m.Attributes));

        return nodes;
    },
};
