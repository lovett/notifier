import m from 'mithril';
import Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode): m.Vnode {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;
        const offline = attrs.offline as boolean;
        const selector = 'header#messageListSummary';
        const count = cache.messageCount();

        if (offline) {
            return m(selector, { class: 'offline' }, 'Disconnected');
        }

        if (count === 0) {
            return m(selector, '');
        }

        if (count === 1) {
            return m(selector, '1 message');
        }

        return m(selector, `${count} messages`);
    },
};
