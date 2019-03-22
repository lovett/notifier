import {Reply} from './reply';
import {Command} from './command';
import {ReplyEvent} from './events';

export class Listener {
    private eventSource?: EventSource;

    private reconnectTimer = 0;

    public do(command: worker.Command) {
        if (command === Command.connect) {
            this.connect();
        }

        if (command === Command.fauxconnect) {
            this.fauxconnect();
        }

        if (command === Command.disconnect) {
            this.disconnect();
        }
    }

    /**
     * Simulate a successful connection
     *
     * This bypasses EventSource and is a workaround for Firefox for
     * Android, as described in app/services.ts.
     */
    private fauxconnect() {
        const reply = new Reply(ReplyEvent.connected);
        return reply.send();
    }

    /**
     * Open a persistent connection to the server
     */
    private connect() {
        this.eventSource = new EventSource('push');

        this.eventSource.addEventListener('connection', () => {
            const reply = new Reply(ReplyEvent.connected);
            reply.send();
            return;
        });

        this.eventSource.onmessage = (e: MessageEvent) => {
            const reply = this.buildReply(e.data);
            reply.send();
            return;
        };

        this.eventSource.onerror = (() => {
            this.setReconnectTimer();
            const reply = new Reply(ReplyEvent.disconnected);
            reply.send();
            return;
        });

        this.clearReconnectTimer();
    }

    /**
     * Close a previously-opened EventSource connection
     */
    private disconnect() {
        if (this.eventSource === undefined) {
            return;
        }

        this.eventSource.close();
    }

    private clearReconnectTimer() {
        clearTimeout(this.reconnectTimer);
    }

    private setReconnectTimer() {
        const self = this;
        this.clearReconnectTimer();

        this.reconnectTimer = setTimeout(() => {
            self.reconnect();
        }, 2000);
    }

    private reconnect() {
        this.disconnect();
        this.connect();
    }

    private buildReply(data: string): Reply {
        let message: worker.Message;

        try {
            message = JSON.parse(data);
        } catch (ex) {
            return new Reply(ReplyEvent.parsefail);
        }

        if (message.retracted) {
            const reply = new Reply(ReplyEvent.dropped);
            reply.setRetractions(message.retracted);
            return reply;
        }

        return new Reply(ReplyEvent.add, message);
    }
}
