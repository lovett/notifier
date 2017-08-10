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
    private watch: number;
    private keepAliveTimer;

    public monitor() {
        this.keepAliveTimer = setInterval(() => {
            const delta = Date.now() - this.watch;

            if (delta > 10000) {
                console.log('Too long since last keepalive. Reconnecting');
                this.watch = Date.now();
                this.reconnect();
                return;
            }
        }, 2000);
    }

    public unmonitor() {
        clearInterval(this.keepAliveTimer);
    }

    public connect() {
        this.eventSource = new EventSource('push');

        this.eventSource.addEventListener('connection', (e: MessageEvent) => {
            console.log('Worker received connection confirmation');
            this.watch = Date.now();

            const reply = new WorkerMessage(types.WorkerEvent.CONNECTED);
            return reply.send();
        });

        this.eventSource.addEventListener('keepalive', (e: MessageEvent) => {
            console.log('got a keepalive');
            this.watch = Date.now();
        });

        this.eventSource.addEventListener('message', (e: MessageEvent) => {
            this.relay(e.data);
        });

        this.eventSource.addEventListener('error', (e: sse.IOnMessageEvent) => {
            const reply = new WorkerMessage(types.WorkerEvent.DISCONNECTED);
            return reply.send();
        });

        //this.monitor();
    }

    public reconnect() {
        console.log('Attempting to reconnect');
        // this.unmonitor();
        // this.eventSource.close();
    }

    public disconnect() {
        this.unmonitor();
        this.eventSource.close();
    }

    public relay(data: string) {
        let reply: WorkerMessage;
        let message: types.IMessage;

        try {
            message = JSON.parse(data);
        } catch (ex) {
            reply = new WorkerMessage(types.WorkerEvent.PARSEFAIL);
            return reply.send();
        }

        if (message.retracted) {
            reply = new WorkerMessage(types.WorkerEvent.DROPPED);
            reply.setRetractions(message.retracted);
            return reply.send();
        }

        reply = new WorkerMessage(types.WorkerEvent.ADD, message);
        return reply.send();
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
