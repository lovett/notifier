import m from 'mithril';
import Cache from './Cache';

export interface Shortcut {
    description: string;
    run: (messageIndex?: number) => void;
}

export class ShortcutService {
    public bag: Map<string, Shortcut> = new Map();

    private accumulatingDigit = 0;

    constructor(cache: Cache) {
        this.bag.set('j', {
            run() {
                cache.selectRelative(-1);
            },
            description: 'Move to previous message',
        });

        this.bag.set('k', {
            run() {
                cache.selectRelative(1);
            },
            description: 'Move to next message',
        });

        this.bag.set('o', {
            run() {
                cache.visitSelected();
            },
            description: 'Visit the link of the selected message',
        });

        this.bag.set('x', {
            run() {
                cache.removeSelected();
            },
            description: 'Mark the selected message as read and remove it',
        });

        this.bag.set('L', {
            run() {
                m.route.set('/logout');
            },
            description: 'Log out',
        });

        this.bag.set('S', {
            run() {
                m.route.set('/settings');
            },
            description: 'Go to settings',
        });

        this.bag.set('Z', {
            run() {
                cache.restore();
            },
            description: 'Undo',
        });

        this.bag.set('?', {
            run() {
                m.route.set('/shortcuts');
            },
            description: 'Show the shortcut list',
        });

        this.bag.set('Escape', {
            run() {
                m.route.set('/');
                cache.deselect();
            },
            description: 'Hide the shortcut list',
        });

        this.bag.set('digit', {
            run(messageIndex: number) {
                cache.selectByReverseIndex(messageIndex);
            },
            description: 'Select a message by its number',
        });
    }

    /**
     * Run the shortcut for the given key.
     *
     * Letter keys are mapped directly to a shortcut. Number keys are
     * mapped to the digit shortcut and involve a timer delay to allow
     * for multi-digit values.
     */
    public match(key: string) {
        let shortcut = this.bag.get(key);

        if (shortcut) {
            shortcut.run();
            return;
        }

        const digit = parseInt(key, 10);
        if (digit >= 0) {
            this.accumulatingDigit = this.accumulatingDigit * 10 + digit;

            setTimeout(() => {
                if (this.accumulatingDigit === 0) {
                    return;
                }

                shortcut = this.bag.get('digit') as Shortcut;
                shortcut.run(this.accumulatingDigit);
                this.accumulatingDigit = 0;
            }, 250);
        }
    }
}
