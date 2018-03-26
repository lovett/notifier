import {WorkerMessage} from './workermessage';
import {WorkerEvent} from '../worker/events';

export class Receiver {
    private eventSource: any;

    private reconnectTimer: number = 0;

    public connect() {

        this.eventSource = new EventSource('push');

        this.eventSource.addEventListener('connection', () => {
            const reply = new WorkerMessage(WorkerEvent.connected);
            return reply.send();
        });

        this.eventSource.addEventListener('keepalive', () => {
            // The server sends keepalives to maintain the connection,
            // they are otherwise ignored.
        });

        this.eventSource.addEventListener('message', (e: MessageEvent) => {
            const reply: WorkerMessage = this.parseMessage(e.data);
            return reply.send();
        });

        this.eventSource.addEventListener('error', () => {
            this.setReconnectTimer();
            const reply = new WorkerMessage(WorkerEvent.disconnected);
            return reply.send();
        });

        this.clearReconnectTimer();
    }

    public disconnect() {
        this.eventSource.close();
    }

    public clearReconnectTimer() {
        clearTimeout(this.reconnectTimer);
    }

    public setReconnectTimer() {
        const self = this;
        this.clearReconnectTimer();

        this.reconnectTimer = setTimeout(() => {
            self.reconnect();
        }, 2000);
    }

    public reconnect() {
        this.disconnect();
        this.connect();
    }

    public parseMessage(data: string) {
        let reply: WorkerMessage;
        let message: worker.Message;

        try {
            message = JSON.parse(data);
        } catch (ex) {
            return new WorkerMessage(WorkerEvent.parsefail);
        }

        if (message.retracted) {
            reply = new WorkerMessage(WorkerEvent.dropped);
            reply.setRetractions(message.retracted);
            return reply;
        }

        return new WorkerMessage(WorkerEvent.add, message);
    }
}
