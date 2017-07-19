self.importScripts('faye-browser-min.js');

let client;

const enum CommandAction {
    'INIT' = 'init',
    'SUBSCRIBE' = 'subscribe',
    'UNSUBSCRIBE' = 'unsubscribe',
    'DISCONNECT' = 'disconnect',
}

const enum WorkerEvent {
    'ADD' = 'add',
    'CONNECT' = 'connected',
    'DISCONNECT' = 'disconnected',
    'DROP' = 'drop',
    'RESUB' = 'resubscribe',
}

interface IMessage {
    localId?: string;
    title: string;
    body?: string;
    source?: string;
    url?: string;
    group?: string;
    deliveredAt?: string;
    retracted?: string[];
}

interface ICommand {
    action: CommandAction;
    channel?: string;
    token?: string;
}

interface IReply {
    event: WorkerEvent;
    message?: IMessage;
    channel?: string;
    retractions?: string[];
}

class WorkerMessage  {
    private payload: IReply;

    constructor(event: WorkerEvent, message?: IMessage) {
        this.payload = {event, message};
    }

    public setChannel(value: string) {
        this.payload.channel = value;
    }

    public setRetractions(ids: string[]) {
        this.payload.retractions = ids;
    }

    public send() {
        postMessage(this.payload);
    }
}

self.addEventListener('message', (e: MessageEvent) => {
    const command: ICommand = e.data;

    switch (command.action) {
    case CommandAction.INIT:
        init(command.token);
        break;
    case CommandAction.SUBSCRIBE:
        subscribe(command.channel);
        break;
    case CommandAction.UNSUBSCRIBE:
        unsubscribe(command.channel);
        break;
    case CommandAction.DISCONNECT:
        disconnect();
        break;
    default:
        return false;
    }

    return true;
});

function init(token: string) {
    client = new Faye.Client('messages');

    client.addExtension({
        incoming:  (message, callback) => {
            let code: number;
            let segments: string[];

            if (message.error) {
                segments = message.error.split('::');
                code = parseInt(segments[0], 10);

                if (code === 301) {
                    const workerMessage = new WorkerMessage(WorkerEvent.RESUB);
                    workerMessage.setChannel(segments[1]);
                    return workerMessage.send();
                }
            }

            return callback(message);
        },

        outgoing: (message, callback) => {
            if (message.channel !== '/meta/subscribe') {
                return callback(message);
            }

            if (!message.ext) {
                message.ext = {};
            }
            message.ext.authToken = token;

            return callback(message);
        },
    });

    client.on('transport:down', () => {
        const message = new WorkerMessage(WorkerEvent.DISCONNECT);
        message.send();
    });

    client.on('transport:up', () => {
        const message = new WorkerMessage(WorkerEvent.CONNECT);
        message.send();
    });
}

function disconnect() {
    client.disconnect();
}

function subscribe(channel: string) {
    client.subscribe(channel, (channelMessage: string) => {
        let message: IMessage;
        let workerMessage: WorkerMessage;

        try {
            message = JSON.parse(channelMessage);
        } catch (exception) {
            console.error('JSON parse failed', exception);
            return false;
        }

        if (message.retracted) {
            workerMessage = new WorkerMessage(WorkerEvent.DROP);
            workerMessage.setRetractions(message.retracted);
            return workerMessage.send();
        }

        workerMessage = new WorkerMessage(WorkerEvent.ADD, message);
        return workerMessage.send();
    });
}

function unsubscribe(channel: string) {
    client.unsubscribe(channel);
}
