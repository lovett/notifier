import Command from '../../worker/command';
import Message from './Message';
import m from 'mithril';

type ItemMap = Map<string, Message>;

type ItemIterator = IterableIterator<[string, Message]>;

type ItemIteratorResult = {
    done: boolean;
    value: Message;
}

/**
 * A container to hold notification messages.
 */
export default class Cache {
    public hasFilled = false;

    public isOffline = false;

    public items: ItemMap = new Map();

    public undoQueue: string[] = [];

    private worker?: Worker;

    /**
     * Attach the instance to a web worker for push-based updates.
     *
     * A custom iterator is used on the item map so that messages
     * can be displayed in reverse-chronological order.
     */
    public constructor() {
        this.startWorker();

        const reverseIterator = function(this: ItemMap): ItemIterator {
            const pairs = Array.from(this.entries());

            let index = pairs.length;

            return {
                [Symbol.iterator](): ItemIterator { return this; },
                next(): ItemIteratorResult {
                    return {
                        done: index === 0,
                        value: pairs[--index],
                    };
                },
            };
        }

        this.items[Symbol.iterator] = reverseIterator;
    }

    public canRestore(): boolean {
        return this.undoQueue.length > 0;
    }

    public goOnline(): void {
        this.isOffline = false;
        this.startWorker();
        m.redraw();
    }

    public goOffline(attemptReconnect = false): void {
        this.isOffline = true;

        if (attemptReconnect === false) {
            this.stopWorker();
        }

        m.redraw();
    }

    public impendingExpirations(): Map<string, Date> {
        const expirations: Map<string, Date> = new Map();
        const now = new Date();
        this.items.forEach((item) => {
            if (!item.expiration) {
                return;
            }

            if (item.expiration < now) {
                this.retract(item.publicId);
            }

            if (item.expiringSoon()) {
                expirations.set(item.publicId, item.expiration);
            }
        });

        return expirations;
    }

    /**
     * Mark a message as being in-focus by the UI.
     */
    public select(publicId: string): void {
        this.items.forEach((value: Message) => {
            value.selected = (value.publicId === publicId);
        });
        m.redraw();
    }

    /**
     * Select a message based on its reverse index in the container.
     *
     * It's a reverse index because the container is displayed in
     * newest-first order, but its insertion order is oldest-first.
     */
    public selectByReverseIndex(index: number): void {
        const reverseIndex = this.items.size - index;
        let counter = 0;

        for (const message of this.items.values()) {
            message.selected = (counter === reverseIndex);
            counter++;
        }

        m.redraw();
    }

    /**
     * Locate the selected message.
     */
    public selected(): Message | null {
        for (const message of this.items.values()) {
            if (message.selected) {
                return message;
            }
        }

        return null;
    }

    /**
     * Select a message by its distance from the currently-selected message.
     *
     * If no message is currently selected, infer which end of the
     * list to select from based on whether the step is positive or
     * negative.
     */
    public selectRelative(step: number): void {
        const selectedMessage = this.selected();
        let targetIndex: number;

        if (selectedMessage) {
            targetIndex = this.items.size - this.indexOfKey(selectedMessage.publicId) - step;
        } else {
            if (step < 0) {
                targetIndex = 1;
            } else {
                targetIndex = this.items.size;
            }
        }

        if (targetIndex < 1) {
            targetIndex = this.items.size;
        }

        if (targetIndex > this.items.size) {
            targetIndex = 1;
        }

        this.selectByReverseIndex(targetIndex);
    }

    public startWorker(): void {
        if (this.worker) {
            return;
        }

        this.worker = new Worker('../../worker/worker.ts');
        this.worker.onmessage = this.onWorkerPush.bind(this);
        this.worker.postMessage(Command.connect);
    }

    public stopWorker(): void {
        if (!this.worker) {
            return;
        }
        this.worker.postMessage(Command.disconnect);
        this.worker.terminate();
    }

    public deselect(): void {
        for (const message of this.items.values()) {
            message.selected = false;
        }
        m.redraw();
    }

    public add(message: Message, withStorage = true): void {
        this.items.set(message.publicId, message);

        if (withStorage) {
            sessionStorage.setItem(message.publicId, JSON.stringify(message));
        }
    }

    /**
     * Mark a message as read and remove it from the container.
     */
    public remove(publicId: string): void {
        if (!this.items.has(publicId)) {
            return;
        }

        this.retract(publicId);

        m.request('message/clear', {
            body: { publicId },
            method: 'POST',
            withCredentials: true,
        }).then(() => {
            this.undoQueue.push(publicId);
        }).catch(() => {
            const message = this.items.get(publicId);
            if (message) {
                message.state = 'stuck';
                console.log('Message could not be cleared');
            }
        });
    }

    /**
     * Mark the selected message as read.
     */
    public removeSelected(): void {
        const message = this.selected();
        if (message) {
            this.remove(message.publicId)
        }
    }

    /**
     * Bring back a previously-removed message.
     */
    public restore(): void {
        if (this.undoQueue.length === 0) {
            return;
        }

        const publicId = this.undoQueue.pop() as string;

        m.request({
            body: { publicId },
            method: 'POST',
            url: 'message/unclear',
            withCredentials: true,
        }).then(() => {
            m.redraw();
        }).catch(() => {
            this.undoQueue.push(publicId);
            console.log('Message could not be restored');
        });
    }

    /**
     * Remove a message from the container.
     */
    public retract(publicId: string): void {
        if (!this.items.has(publicId)) {
            return;
        }

        const message = this.items.get(publicId) as Message;

        if (message.browserNotification) {
            message.browserNotification.close();
        }

        this.items.delete(publicId);
        sessionStorage.removeItem(publicId);
        m.redraw();
    }

    /**
     * Add notifications via HTTP request.
     */
    public fill(): void {
        this.fillFromStorage();

        m.request('archive', {
            extract: this.extract,
            method: 'GET',
            withCredentials: true,
        } as m.RequestOptions<Message[]>).then((messages: Message[]) => {
            for (const message of messages) {
                this.add(message);
            }

            this.hasFilled = true;
        }).catch(() => {
            m.route.set('/logout');
        });
    }

    public flushStorage(): void {
        sessionStorage.clear();
    }

    /**
     * Open the URL of the selected message.
     */
    public visitSelected(): void {
        const message = this.selected();

        if (message) {
            message.visit();
        }
    }

    /**
     * Find a message index from its key.
     */
    protected indexOfKey(wantedKey: string): number {
        if (!this.items.has(wantedKey)) {
            return -1;
        }

        let counter = 0;
        for (const currentKey of this.items.keys()) {
            if (currentKey === wantedKey) {
                break;
            }
            counter++;
        }

        return counter;
    }

    private fillFromStorage(): void {
        const messages: Message[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i) as string;
            const value = sessionStorage.getItem(key);

            if (!value) {
                return;
            }

            const json = JSON.parse(value);
            const message = Message.fromJson(json);
            messages.push(message);
        }

        messages.sort((a: Message, b: Message) => {
            if (a.received > b.received) {
                return 1;
            }

            return -1;
        });

        messages.forEach((message) => {
            this.add(message, false);
        });

        if (this.items.size > 0) {
            this.hasFilled = true;
        }

        m.redraw();
    }

    /**
     * Add a notification received by the web worker.
     */
    private onWorkerPush(e: MessageEvent): void {
        if (e.data === Command.offline) {
            this.goOffline(true);
            return;
        }

        if (e.data === Command.online) {
            this.goOnline();
            return;
        }

        const message = Message.fromJson(e.data);

        if (message.isExpired()) {
            this.retract(message.publicId);
            return;
        }

        this.add(message);

        if (!document.hasFocus()) {
            message.sendBrowserNotification();
        }

        m.redraw();
    }

    /**
     * Convert an XHR response to a list of Message instances.
     */
    private extract(xhr: XMLHttpRequest): Array<Message> {
        if (xhr.status === 401) {
            throw new Error(xhr.responseText);
        }

        try {
            const json = JSON.parse(xhr.responseText);
            return json.reduce((accumulator: Message[], item: object) => {
                accumulator.push(Message.fromJson(item));
                return accumulator;
            }, []);
        } catch (e) {
            return [];
        }
    }
}
