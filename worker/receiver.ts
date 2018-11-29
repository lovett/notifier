import {WorkerMessage} from './workermessage';
import {WorkerEvent} from '../worker/events';

export class Receiver {
    private eventSource: any;

    private reconnectTimer: number = 0;

    public connect(userAgent?: string) {
        // There is a problem with EventSource on Firefox for Android.
        // The browser will crash if the page is reloaded or unloaded
        // after the EventSource connection has been made. The exact
        // nature of the problem is unknown; this is a
        // workaround. Pretending the connection was successful allows
        // the initial message fetch to continue working. Real-time
        // updates are lost, but on a mobile screen this is not
        // entirely terrible because usage is probably short-lived
        // anyway. A long-running connection isn't happening on mobile
        // the way it is on desktop.
        const isAndroid = userAgent && userAgent.indexOf('Android') > -1;
        const isFirefox = userAgent && userAgent.indexOf('Firefox') > -1;
        if (isAndroid && isFirefox) {
            const reply = new WorkerMessage(WorkerEvent.connected);
            return reply.send();
        }

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
