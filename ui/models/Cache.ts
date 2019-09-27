import Command from '../worker/command';
import Message from './Message';
import m from 'mithril';

/**
 * A container to hold notification messages.
 */
export default class Cache {
    private worker?: Worker;

    public hasFilled = false;

    public items: Map<string, Message> = new Map();

    public undoQueue: string[] = [];

    /**
     * Attach the instance to a web worker for push-based updates.
     *
     * There is a long-standing problem with EventSource on Firefox
     * for Android that causes the browser to crash. The exact nature
     * of the problem is unknown, but skipping real-time push
     * sidesteps the problem. On mobile this isn't entirely terrible
     * because usage more likely to be shorter-term than on desktopp.
     */
    public constructor(userAgent: string) {
        const isAndroid = userAgent.indexOf('Android') > -1;
        const isFirefox = userAgent.indexOf('Firefox') > -1;

        if (isAndroid && isFirefox) {
            return;
        }

        this.worker = new Worker('../worker/worker.ts');
        this.worker.onmessage = this.onWorkerPush.bind(this);
        this.worker.postMessage(Command.connect);
    }

    public canRestore() {
        return this.undoQueue.length > 0;
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
     * Select a message based on distance to the current one.
     */
    public selectRelative(step: number) {
        const currentIndex = this.selectedIndex();
        const lastIndex = this.items.size - 1;
        let targetIndex = currentIndex + step;

        if (targetIndex > lastIndex) {
            targetIndex %= this.items.size;
        }

        if (targetIndex < 0) {
            targetIndex = this.items.size - Math.abs(targetIndex);
        }

        this.selectByIndex(targetIndex);
    }

    /**
     * Locate the selected message and return its index.
     */
    public selectedIndex(): number {
        const message = this.selected();

        if (message) {
            return this.indexOfKey(message.publicId!);
        }

        return -1;
    }

    public selectedKey() {
        const selectedIndex = this.selectedIndex();
        return this.keyOfIndex(selectedIndex);
    }

    public close() {
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

    public add(message: Message) {
        this.items.set(message.publicId!, message);
    }

    /**
     * Mark a message as read and remove it from the container.
     */
    public remove(publicId: string) {
        if (!this.items.has(publicId)) {
            return;
        }

        m.request({
            body: { publicId: publicId },
            method: 'POST',
            url: 'message/clear',
            withCredentials: true,
        }).then(() => {
            this.retract(publicId);
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
    }

    /**
     * Find a message index from its key.
     */
    protected indexOfKey(wantedKey: string): number {
        if (!this.items.has(wantedKey)) {
            return -1;
        }

        let counter = 0;
        for (let currentKey of this.items.keys()) {
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

        for (let message of this.items.values()) {
            if (counter === index) {
                return message.publicId!;
            }
            counter++;
        }

        return null;
    }

    /**
     * Add notifications via HTTP request.
     */
    public fill() {
        m.request({
            method: 'GET',
            url: 'archive',
            withCredentials: true,
            deserialize: Message.fromJsonArray,
        }).then((messages: Message[]) => {
            this.hasFilled = true;
            for (let message of messages) {
                this.add(message);
            }
        });
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
     * Add a notification received by the web worker.
     */
    private onWorkerPush(e: MessageEvent): void {
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

}
