import Message from './message';

enum Listenable {
    add, remove,
}

type ListenerCallback = (id: string) => void;

export default class Items {
    public items: { [index: string]: Message } = {};

    private listeners: Array<[Listenable, (id: string) => void]> = [];

    public onAdd(callback: ListenerCallback) {
        this.on(Listenable.add, callback);
    }

    public onRemove(callback: ListenerCallback) {
        this.on(Listenable.remove, callback);
    }

    public activate(message: Message) {
        Object.keys(this.items).forEach((key: string) => {
            this.items[key].active = (key === message.publicId);
        });
    }

    public active(): Message {
        const items = this.itemList();

        for (const item of items) {
            if (item.active) {
                return item;
            }
        }

        return items[0];
    }

    public activateByIndex(index: number) {
        const key = this.keyOfIndex(index);
        this.activate(this.items[key]);
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

    public activeIndex() {
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

    public add(message: Message) {
        this.items[message.publicId] = message;
        this.broadcast(Listenable.add, message.publicId);
    }

    public deactivate() {
        for (const key of Object.keys(this.items)) {
            this.items[key].active = false;
        }
    }

    public remove(message: Message) {
        this.removeKey(message.publicId);
    }

    public removeIndex(index: number) {
        const key = this.keyOfIndex(index);
        this.removeKey(key);
    }

    public removeKey(key: string) {
        if (!this.hasKey(key)) {
            return;
        }

        const item = this.items[key];
        item.prepareForRemoval();
        delete this.items[key];
        this.broadcast(Listenable.remove, key);
    }

    public reset() {
        this.items = {};
        this.listeners = [];
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

    public hasKey(key: string) {
        return this.items.hasOwnProperty(key);
    }

    public hasMessage(message: Message) {
        const id = message.publicId;
        return this.hasKey(id);
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

    public tallyByGroup() {
        return Object.keys(this.items).reduce((accumulator: { [key: string]: number; }, key) => {
            const group = this.items[key].group;
            if (group in accumulator === false) {
                accumulator[group] = 0;
            }
            accumulator[group] += 1;
            return accumulator;
        }, {});
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

    protected keyOfIndex(index: number) {
        const messages = this.itemList();

        return messages[index].publicId;
    }

    protected on(event: Listenable, callback: ListenerCallback) {
        this.listeners.push([event, callback]);
    }

    protected broadcast(event: Listenable, id: string) {
        this.listeners.forEach((listener) => {
            if (listener[0] === event) {
                listener[1](id);
            }
        });
    }
}
