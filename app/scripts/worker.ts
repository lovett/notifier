/// <reference path="../../modules/types/sse.d.ts" />
import * as types from './types';

let receiver: Receiver;

class WorkerMessage  {
    private payload: types.IReply;

    constructor(event: types.WorkerEvent, message?: types.IMessage) {
        this.payload = {event, message};
    }

    public setRetractions(ids: string[]) {
        this.payload.retractions = ids;
    }

    public send() {
        postMessage(this.payload);
    }
}

class Receiver {
    private eventSource: sse.IEventSourceStatic;

    public connect() {
        this.eventSource = new EventSource('push');

        this.eventSource.addEventListener('connection', (e: MessageEvent) => {
            const reply = new WorkerMessage(types.WorkerEvent.CONNECTED);
            return reply.send();
        });

        this.eventSource.addEventListener('keepalive', (e: MessageEvent) => {});

        this.eventSource.addEventListener('message', (e: MessageEvent) => {
            const reply: WorkerMessage = this.parseMessage(e.data);
            return reply.send();
        });

        this.eventSource.addEventListener('error', (e: sse.IOnMessageEvent) => {
            const reply = new WorkerMessage(types.WorkerEvent.DISCONNECTED);
            return reply.send();
        });
    }

    public disconnect() {
        this.eventSource.close();
    }

    public parseMessage(data: string) {
        let reply: WorkerMessage;
        let message: types.IMessage;

        try {
            message = JSON.parse(data);
        } catch (ex) {
            return new WorkerMessage(types.WorkerEvent.PARSEFAIL);
        }

        if (message.retracted) {
            reply = new WorkerMessage(types.WorkerEvent.DROPPED);
            reply.setRetractions(message.retracted);
            return reply;
        }

        return new WorkerMessage(types.WorkerEvent.ADD, message);
    }
}

self.addEventListener('message', (e: MessageEvent) => {
    const command: types.ICommand = e.data;

    if (!receiver) {
        receiver = new Receiver();
    }

    if (command.action === types.WorkerCommand.CONNECT) {
        receiver.connect();
        return true;
    }

    if (command.action === types.WorkerCommand.DISCONNECT) {
        receiver.disconnect();
        return true;
    }

    return false;
});
