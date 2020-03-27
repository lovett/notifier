import m from 'mithril';
import { ShortcutService } from '../models/ShortcutService';

export default {
    view(vnode: m.Vnode): Array<m.Vnode> {
        const attrs = vnode.attrs as m.Attributes;
        const shortcutService = attrs.shortcutService as ShortcutService;
        return [
            m('header'),
            m('main#shortcuts', [
                m('h1', 'Keyboard Shortcuts'),
                m('table', Array.from(shortcutService.bag.entries()).map(([key, shortcut]) => {
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
