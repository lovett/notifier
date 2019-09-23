import m from 'mithril';
import Cache from '../models/Cache';

export default {
    view(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const cache = attrs.cache as Cache;

        const itemCount = Object.keys(cache.items).length;

        if (itemCount === 0) {
            return '';
        }

        if (itemCount === 1) {
            return '1 message';
        }

        return `${itemCount} messages`;
    },
};
