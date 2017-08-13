import {WorkerMessage} from './workermessage';

export class Receiver {
    private eventSource: sse.IEventSourceStatic;

    public connect() {
        this.eventSource = new EventSource('push');

        this.eventSource.addEventListener('connection', () => {
            const reply = new WorkerMessage(worker.WorkerEvent.CONNECTED);
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
            const reply = new WorkerMessage(worker.WorkerEvent.DISCONNECTED);
            return reply.send();
        });
    }

    public disconnect() {
        this.eventSource.close();
    }

    public parseMessage(data: string) {
        let reply: WorkerMessage;
        let message: worker.IMessage;

        try {
            message = JSON.parse(data);
        } catch (ex) {
            return new WorkerMessage(worker.WorkerEvent.PARSEFAIL);
        }

        if (message.retracted) {
            reply = new WorkerMessage(worker.WorkerEvent.DROPPED);
            reply.setRetractions(message.retracted);
            return reply;
        }

        return new WorkerMessage(worker.WorkerEvent.ADD, message);
    }
}
