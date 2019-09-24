import m from 'mithril';
import Message from './Message';

import Command from '../worker/command';

export default class Cache {
    private worker?: Worker;

    public items: { [index: string]: Message } = {};

    /**
     * Set up a cache to hold and manage messages.
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

    public activate(message: Message) {
        Object.keys(this.items).forEach((key: string) => {
            this.items[key].active = (key === message.publicId);
        });
        m.redraw();
    }

    public activateByIndex(index: number) {
        console.log('activate index ', index);
        const key = this.keyOfIndex(index);
        if (key) {
            this.activate(this.items[key]);
        }
    }

    public active(): Message | null {
        const items = this.itemList();

        for (const item of items) {
            if (item.active) {
                return item;
            }
        }

        return null;
    }

    public activateByStep(step: number) {
        const currentIndex = this.activeIndex();
        const lastIndex = this.size() - 1;
        let targetIndex = currentIndex + step;

        if (targetIndex > lastIndex) {
            targetIndex %= this.size();
        }

        if (targetIndex < 0) {
            targetIndex = this.size() - Math.abs(targetIndex);
        }

        this.activateByIndex(targetIndex);
    }

    public activeIndex(): number {
        for (const key of Object.keys(this.items)) {
            if (this.items[key].active) {
                return this.indexOfKey(key);
            }
        }

        return -1;
    }

    public activeKey() {
        const activeIndex = this.activeIndex();
        return this.keyOfIndex(activeIndex);
    }

    public deactivate() {
        for (const key of Object.keys(this.items)) {
            this.items[key].active = false;
        }
        m.redraw();
    }

    public add(message: Message) {
        this.items[message.publicId] = message;
    }

    public remove(publicId: string) {
        const message = this.items[publicId];

        if (!message) {
            return;
        }

        m.request({
            body: { publicId: message.publicId },
            method: 'POST',
            url: 'message/clear',
            withCredentials: true,
        }).then(() => {
            this.discard(message.publicId);
        }).catch((e) => {
            console.log(e);
            message.state = 'stuck';
            console.log('Message could not be cleared');
        });
    }

    public reset() {
        this.items = {};
    }

    public removeAll() {
        console.log('remove all');
    }

    public retract(id: string) {
        delete this.items[id];
    }

    public undo() {
    }

    public keys() {
        return Object.keys(this.items);
    }

    public size() {
        return this.keys().length;
    }

    public message(key: string) {
        return this.items[key];
    }

    public hasMessage(message: Message) {
        return this.items.hasOwnProperty(message.publicId);
    }

    public allExcept(messages: Message[]) {
        const keys = this.keys();

        const excludedKeys = messages.map((message) => message.publicId);

        const difference = keys.filter((key) => {
            return excludedKeys.indexOf(key) === -1;
        });

        return difference.map((key) => {
            return this.message(key);
        });
    }

    public itemList(): Message[] {
        const messages = Object.keys(this.items).map((k: string) => this.items[k]);

        return messages.sort((a, b) => {
            return b.received.getTime() - a.received.getTime();
        });
    }

    protected indexOfKey(key: string) {
        const messages = this.itemList();

        for (let i = 0; i < messages.length; i++) {
            if (messages[i].publicId === key) {
                return i;
            }
        }
        return -1;
    }

    protected keyOfIndex(index: number): string | null {
        const items = this.itemList();

        if (!items[index]) {
            return null;
        }

        return items[index].publicId;
    }

    public fill() {
        m.request({
            method: 'GET',
            url: 'archive',
            withCredentials: true,
            deserialize: Message.fromJsonArray,
        }).then((messages: Message[]) => {
            for (let message of messages) {
                this.add(message);
            }
        });
    }

    private onWorkerPush(e: MessageEvent) {
        const message = Message.fromJson(e.data);

        if (message.isExpired()) {
            this.discard(message.publicId);
            return;
        }

        this.add(message);
        m.redraw();
    }

    private discard(publicId: string) {
        //message.closeBrowserNotification();
        delete this.items[publicId];
    }
}
