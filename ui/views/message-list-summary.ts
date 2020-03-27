import m from 'mithril';
import Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode): m.Vnode {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;
        const selector = 'header#messageListSummary';

        if (cache.isOffline) {
            return m(selector, { class: 'offline' }, 'Disconnected');
        }

        if (cache.items.size === 0) {
            return m(selector, '');
        }

        if (cache.items.size === 1) {
            return m(selector, '1 message');
        }

        return m(selector, `${cache.items.size} messages`);
    },
};
