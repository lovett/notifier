import Command from '../../worker/command';
import Message from './Message';
import m from 'mithril';

type ItemMap = Map<string, Message|null>;

type ItemIterator = IterableIterator<[string, Message|null]>;

type MessageIterator = IterableIterator<Message>;

type ItemIteratorResult = {
    done: boolean;
    value: [string, Message|null];
}

/**
 * A container to hold notification messages.
 */
export default class Cache {
    public hasFilled = false;

    public isOffline = false;

    private items: ItemMap = new Map();

    private undoQueue: string[] = [];

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
                        value: pairs[--index]
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
        this.fill();
        m.redraw();
    }

    public goOffline(attemptReconnect = false): void {
        this.isOffline = true;

        if (attemptReconnect === false) {
            this.stopWorker();
        }

        m.redraw();
    }

    public *messages(): MessageIterator {
        for (const [, value] of this.items) {
            if (!value) continue;
            yield value;
        }
    }

    public messageCount(): number {
        return this.items.size - this.undoQueue.length;
    }

    /**
     * Mark a message as being in-focus by the UI.
     */
    public select(publicId: string): void {
        for (const message of this.messages()) {
            message.selected = (message.publicId === publicId);
        }
        m.redraw();
    }

    /**
     * Select a message based on its index in the container.
     */
    public selectByIndex(index: number): void {
        let counter = 1;
        for (const message of this.messages()) {
            message.selected = (counter === index);
            counter++;
        }

        m.redraw();
    }

    /**
     * Locate the selected message.
     */
    public selected(): Message | null {
        for (const message of this.messages()) {
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

        this.selectByIndex(targetIndex);
    }

    public startWorker(): void {
        if (this.worker) {
            return;
        }

        this.worker = new Worker('worker.js');
        this.worker.onmessage = this.onWorkerPush.bind(this);
        this.worker.postMessage(Command.connect);
    }

    public stopWorker(): void {
        if (!this.worker) {
            return;
        }
        this.worker.postMessage(Command.disconnect);
        this.worker.terminate();
        this.worker = undefined;
    }

    public deselect(): void {
        for (const message of this.messages()) {
            message.selected = false;
        }
        m.redraw();
    }

    public add(message: Message): void {
        this.items.set(message.publicId, message);
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
        const message = this.items.get(publicId);

        if (!message)  {
            return;
        }

        if (message.browserNotification) {
            message.browserNotification.close();
        }

        this.items.set(publicId, null);
        m.redraw();
    }

    /**
     * Load notifications via HTTP request.
     */
    public fill(): void {
        this.clear();

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

    public clear(): void {
        this.items.clear();
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

        if (message.deliveryStyle === 'normal' && !document.hasFocus()) {
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
            return json.reduce((accumulator: Message[], item: unknown) => {
                accumulator.push(Message.fromJson(item));
                return accumulator;
            }, []);
        } catch (e) {
            return [];
        }
    }
}
