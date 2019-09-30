import m from 'mithril';
import Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;

        if (cache.isOffline) {
            return 'Disconnected';
        }

        if (cache.items.size === 0) {
            return '';
        }

        if (cache.items.size === 1) {
            return '1 message';
        }

        return `${cache.items.size} messages`;
    },
};
