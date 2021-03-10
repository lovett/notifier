import Message from './Message';
import m from 'mithril';

type MessageIterator = IterableIterator<[string, Message|null]>;

type MessageIteratorResult = {
    done: boolean;
    value: [string, Message|null];
}

/**
 * A container for a set of messages.
 */
export default class Cache {
    private undoQueue: Message[];

    private _messages: Map<string, Message|null>;

    public constructor() {
        this.undoQueue = [];
        this._messages = new Map();

        // The messages map gets a custom iterator so that it is easier
        // to display messages in newest-first order.
        this._messages[Symbol.iterator] = function(this): MessageIterator {
            const pairs = Array.from(this.entries());

            let index = pairs.length;

            return {
                [Symbol.iterator](): MessageIterator { return this; },
                next(): MessageIteratorResult {
                    return {
                        done: index === 0,
                        value: pairs[--index]
                    };
                },
            };
        }
    }

    /**
     * Whether there are messages that can be marked unread.
     */
    public canRestore(): boolean {
        return this.undoQueue.length > 0;
    }

    /**
     * Iterate unread messages.
     */
    public *messages(): IterableIterator<Message> {
        for (const [, value] of this._messages) {
            if (!value) continue;
            yield value;
        }
    }

    /**
     * Tally unread messages.
     */
    public messageCount(): number {
        let counter = 0;
        for (const message of this.messages()) {
            if (message) {
                counter++;
            }
        }
        return counter;
    }

    /**
     * Pick a message by its index in the messages map.
     */
    public selectByIndex(index: number): void {
        let counter = 0;
        for (const message of this.messages()) {
            counter++;
            message.selected = (counter === index);
        }
    }

    /**
     * Locate the picked message.
     */
    public selected(): [Message | null, number] {
        let counter = 0;
        for (const message of this.messages()) {
            counter++
            if (message.selected) {
                return [message, counter];
            }
        }

        return [null, 0];
    }

    /**
     * Pick a message by its distance from the current pick.
     */
    public selectRelative(step: number): void {
        const maxIndex = this.messageCount();
        const [_, selectedIndex] = this.selected();
        const targetIndex = selectedIndex + step;

        if (targetIndex < 1) {
            this.selectByIndex(maxIndex - (maxIndex % step));
            return;
        }

        if (targetIndex > maxIndex) {
            this.selectByIndex(1 + maxIndex % step);
            return;
        }

        this.selectByIndex(targetIndex);
    }

    /**
     * Append a message to the messages map.
     *
     * Messages should be added in oldest-first order.
     */
    public add(message: Message): void {
        this._messages.set(message.publicId, message);
    }

    /**
     * Tell the server to mark a message as read.
     */
    public clear(message: Message): void {
        this.drop(message);

        m.request('message/clear', {
            body: { publicId: message.publicId },
            method: 'POST',
            withCredentials: true,
        }).then(() => {
            this.undoQueue.push(message);
        }).catch(() => {
            message.state = 'stuck';
            console.error('Message could not be cleared');
        });
    }

    /**
     * Bring back the most recently removed message.
     */
    public restore(): Promise<void> {
        const message = this.undoQueue.pop();

        if (!message) {
            return Promise.resolve();
        }

        return m.request({
            body: { publicId: message.publicId },
            method: 'POST',
            url: 'message/unclear',
            withCredentials: true,
        });
    }

    /**
     * Remove a message from display.
     *
     * This is more elaborate than just deleting from the messages map
     * so that undo is easier.
     */
    public drop(message: Message): void {
        if (message.browserNotification) {
            message.browserNotification.close();
        }

        this._messages.set(message.publicId, null);
    }

    /**
     * Populate the messages map from the server.
     */
    public fill(): void {
        m.request('archive', {
            extract: this.extract,
            method: 'GET',
            withCredentials: true,
        } as m.RequestOptions<Message[]>).then((messages: Message[]) => {
            this.empty();

            for (const message of messages) {
                this.add(message);
            }
        }).catch(() => {
            m.route.set('/logout');
        });
    }

    /**
     * Empty out the messages map.
     */
    public empty(): void {
        this._messages.clear();
        this.undoQueue = [];
    }

    /**
     * Find a message index from its key.
     */
    protected indexOfKey(wantedKey: string): number {
        if (!this._messages.has(wantedKey)) {
            return -1;
        }

        let counter = 0;
        for (const currentKey of this._messages.keys()) {
            if (currentKey === wantedKey) {
                break;
            }
            counter++;
        }

        return counter;
    }

    /**
     * Convert an XHR JSON response to a list of messages.
     */
    private extract(xhr: XMLHttpRequest): Array<Message> {
        if (xhr.status === 403) {
            throw new Error(xhr.responseText);
        }

        try {
            const json = JSON.parse(xhr.responseText);
            return json.reduce((accumulator: Message[], message: unknown) => {
                accumulator.push(Message.fromJson(message));
                return accumulator;
            }, []);
        } catch (e) {
            return [];
        }
    }
}
