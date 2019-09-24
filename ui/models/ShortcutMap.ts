import m from 'mithril';
import Cache from './Cache';

export interface Shortcut {
    description: string;
    action: (messageIndex?: number) => void;
}

export default class ShortcutMap {
    public shortcuts: { [index: string]: Shortcut } = {};

    private accumulatingDigit = 0;

    constructor(cache: Cache) {
        this.shortcuts.C = {
            action() {
                console.log('not yet implemented');
                // cache.clearAll();
            },
            description: 'Clear all messages',
        };

        this.shortcuts.j = {
            action() {
                cache.selectRelative(1);
            },
            description: 'Move to next message',
        };

        this.shortcuts.k = {
            action() {
                cache.selectRelative(-1);
            },
            description: 'Move to previous message',
        };

        this.shortcuts.x = {
            action() {
                console.log('not yet implemented');
                // cache.clearSelected();
            },
            description: 'Clear selected message',
        };

        this.shortcuts.Z = {
            action() {
                console.log('not yet implemented');
                // if (cache.canUnclear()) {
                //     cache.unclear();
                // }
            },
            description: 'Undo',
        };

        this.shortcuts.o = {
            action() {
                console.log('not yet implemented');
                // cache.visitSelected();
            },
            description: 'Visit the link of the selected message',
        };

        this.shortcuts['?'] = {
            action() {
                m.route.set('/shortcuts');
            },
            description: 'Show the shortcut list',
        };

        this.shortcuts.Escape = {
            action() {
                m.route.set('/');
            },
            description: 'Hide the shortcut list',
        };

        this.shortcuts.S = {
            action() {
                m.route.set('/settings');
            },
            description: 'Go to settings',
        };

        this.shortcuts.L = {
            action() {
                m.route.set('/logout');
            },
            description: 'Log out',
        };

        this.shortcuts.digit = {
            action(messageIndex: number) {
                cache.selectByIndex(messageIndex - 1);
            },
            description: 'Select a message by its number',
        };
    }

    public run(key: string) {
        if (this.shortcuts.hasOwnProperty(key)) {
            this.shortcuts[key].action();
            return;
        }

        const digit = parseInt(key, 10);
        if (digit >= 0) {
            this.accumulatingDigit = this.accumulatingDigit * 10 + digit;

            setTimeout(() => {
                if (this.accumulatingDigit > 0) {
                    this.shortcuts.digit.action(this.accumulatingDigit);
                    this.accumulatingDigit = 0;
                }
            }, 250);
        }
    }
}
