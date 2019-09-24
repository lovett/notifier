import m from 'mithril';
import messageListSummary from './message-list-summary';
import messageListFooter from './message-list-footer';
import messageListMessage from './message-list-message';
import Cache from '../models/Cache';

const cache = new Cache(window.navigator.userAgent);

let lastKeydownNumber = 0;

function onKeydown(e: KeyboardEvent) {
    const charCode: number = e.which || e.keyCode;

    // Avoid conflict with browser UI shortcuts.
    if (e.altKey === true || e.ctrlKey === true) {
        return;
    }

    // Safari triggers a keyless keydown event during login autofill.
    if (!charCode) {
        return;
    }

    // Message activation by index.
    const numericValue = parseInt(e.key, 10);
    if (numericValue >= 0) {
        lastKeydownNumber = lastKeydownNumber * 10 + numericValue;

        setTimeout(() => {
            if (lastKeydownNumber > 0) {
                cache.activateByIndex(lastKeydownNumber - 1);
                lastKeydownNumber = 0;
            }
        }, 250);
        return;
    }
}

function onVisibilityChange() {
    if (document.hidden) {
        cache.deactivate()
        return;
    }
}

function onWindowBlur() {
    cache.deactivate();
}

export default {
    oninit() {
        cache.fill();
        document.addEventListener('keydown', onKeydown);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('blur', onWindowBlur);
    },

    view() {
        return [
            m('header#messageListSummary', [
                m(messageListSummary, { cache } as m.Attributes),
            ]),

            m('main#messageListBody', Object.keys(cache.items).map((key, index) => {
                const message = cache.items[key];
                return m(messageListMessage, { message, index, cache })
            })),

            m('footer#messageListFooter', [
                m(messageListFooter, { cache } as m.Attributes),
            ]),
        ];
    },
};
