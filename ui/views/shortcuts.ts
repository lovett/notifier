import m from 'mithril';
import ShortcutMap from '../models/ShortcutMap';

export default {
    view(vnode: m.Vnode) {
        const attrs = vnode.attrs as m.Attributes;
        const shortcutMap = attrs.shortcutMap as ShortcutMap;
        return [
            m('header'),
            m('main#shortcuts', [
                m('h1', 'Keyboard Shortcuts'),
                m('table', Object.keys(shortcutMap.shortcuts).map((key) => {
                    const shortcut = shortcutMap.shortcuts[key];
                    return m('tr', [
                        m('td', [
                            m('kbd', key),
                        ]),
                        m('td', shortcut.description),
                    ]);
                })),
            ]),
            m('footer'),
        ];
    },
};
