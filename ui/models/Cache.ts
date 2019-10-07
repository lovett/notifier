import Command from '../worker/command';
import Message from './Message';
import m from 'mithril';

/**
 * A container to hold notification messages.
 */
export default class Cache {
    public hasFilled = false;

    public isOffline = false;

    public items: Map<string, Message> = new Map();

    public undoQueue: string[] = [];

    private worker?: Worker;

    /**
     * Attach the instance to a web worker for push-based updates.
     *
     * A custom iterator is attached to the item map so that messages
     * can be displayed in reverse-chronological order.
     */
    public constructor() {
        this.startWorker();

        this.items[Symbol.iterator] = function() {
            const entries = Array.from(this.entries());

            let index = entries.length;

            return {
                [Symbol.iterator]() { return this; },
                next() {
                    return {
                        done: index === 0,
                        value: entries[--index],
                    };
                },
            };
        };
    }

    public canRestore() {
        return this.undoQueue.length > 0;
    }

    public goOnline() {
        console.log('going online');
        this.isOffline = false;
        this.startWorker();
        m.redraw();
    }

    public goOffline(attemptReconnect: boolean = false) {
        console.log('going offline');
        this.isOffline = true;

        if (attemptReconnect === false) {
            this.stopWorker();
        }

        m.redraw();
    }

    public impendingExpirations() {
        const expirations: Map<string, Date> = new Map();
        const now = new Date();
        this.items.forEach((item) => {
            if (!item.expiringSoon()) {
                return;
            }

            if (item.expiration! < now) {
                this.retract(item.publicId!);
            }

            expirations.set(item.publicId!, item.expiration!);

        });

        return expirations;
    }

    /**
     * Mark a message as being in-focus by the UI.
     */
    public select(publicId: string) {
        this.items.forEach((value: Message) => {
            value.selected = (value.publicId === publicId);
        });
        m.redraw();
    }

    /**
     * Select a message based on its index in the container.
     */
    public selectByIndex(index: number) {
        const key = this.keyOfIndex(index);
        if (key) {
            this.select(key);
            return;
        }

        this.deselect();
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
     * list to select from the sign of the step.
     */
    public selectRelative(step: number) {
        const currentIndex = this.selectedIndex();
        let targetIndex: number;

        if (currentIndex === null) {
            if (step < 0) {
                // Select the newest message.
                targetIndex = this.items.size - 1;
            } else {
                // Select the oldest message.
                targetIndex = 0;
            }
        } else {
            targetIndex = currentIndex + step;
        }

        if (targetIndex >= this.items.size) {
            targetIndex %= this.items.size;
        }

        if (targetIndex < 0) {
            targetIndex = this.items.size + targetIndex;
        }

        this.selectByIndex(targetIndex);
    }

    /**
     * Locate the selected message and return its index.
     */
    public selectedIndex(): number | null {
        const message = this.selected();

        if (message) {
            return this.indexOfKey(message.publicId!);
        }

        return null;
    }

    public startWorker() {
        if (this.worker) {
            return;
        }

        this.worker = new Worker('../worker/worker.ts');
        this.worker.onmessage = this.onWorkerPush.bind(this);
        this.worker.postMessage(Command.connect);
    }

    public stopWorker() {
        if (!this.worker) {
            return;
        }
        this.worker.postMessage(Command.disconnect);
        this.worker.terminate();
    }

    public deselect() {
        for (const key of Object.keys(this.items)) {
            this.items[key].selected = false;
        }
        m.redraw();
    }

    public add(message: Message, withStorage: boolean = true) {
        this.items.set(message.publicId!, message);

        if (withStorage) {
            sessionStorage.setItem(message.publicId!, JSON.stringify(message));
        }
    }

    /**
     * Mark a message as read and remove it from the container.
     */
    public remove(publicId: string) {
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
            message!.state = 'stuck';
            console.log('Message could not be cleared');
        });
    }

    /**
     * Open the URL of the selected message.
     */
    public removeSelected() {
        const message = this.selected();
        if (!message) {
            return;
        }
        this.remove(message.publicId!);
    }

    /**
     * Bring back a previously-removed message.
     */
    public restore() {
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
    public retract(publicId: string) {
        if (!this.items.has(publicId)) {
            return;
        }

        const message = this.items.get(publicId) as Message;

        if (message.browserNotification) {
            message.browserNotification.close();
        }

        this.items.delete(publicId);
        sessionStorage.removeItem(publicId);

    }

    /**
     * Add notifications via HTTP request.
     */
    public fill() {
        this.fillFromStorage();

        m.request('archive', {
            extract: this.extract,
            method: 'GET',
            withCredentials: true,
        } as m.RequestOptions<Message[]>).then((messages: Message[]) => {
            for (const message of messages) {
                this.add(message);
            }
        });
    }

    public flushStorage() {
        sessionStorage.clear();
    }

    /**
     * Open the URL of the selected message.
     */
    public visitSelected() {
        const message = this.selected();

        if (!message) {
            return;
        }

        message.visit();
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
     * Find a message key from its index.
     */
    protected keyOfIndex(index: number): string | null {
        let counter = 0;

        for (const message of this.items.values()) {
            if (counter === index) {
                return message.publicId!;
            }
            counter++;
        }

        return null;
    }

    private fillFromStorage() {
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
            this.retract(message.publicId!);
            return;
        }

        this.add(message);

        if (!document.hasFocus()) {
            message.sendBrowserNotification();
        }

        m.redraw();
    }

    private extract(xhr: XMLHttpRequest) {
        const json = JSON.parse(xhr.responseText);
        return json.reduce((accumulator: Message[], item: object) => {
            accumulator.push(Message.fromJson(item));
            return accumulator;
        }, []);
    }
}
