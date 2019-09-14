import m from 'mithril';

export default {
    view(vnode) {
        return m('main.layout', [
            m('section', vnode.children),
        ]);
    },
};
