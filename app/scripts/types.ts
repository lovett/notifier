export const enum WorkerCommand {
    CONNECT,
    DISCONNECT,
}

export const enum WorkerEvent {
    ADD,
    CONNECTED,
    DISCONNECTED,
    DROPPED,
    PARSEFAIL,
}

export interface ICommand {
    action: WorkerCommand;
    token?: string;
}

export interface IMessage {
    localId?: string;
    title: string;
    body?: string;
    source?: string;
    url?: string;
    group?: string;
    deliveredAt?: string;
    retracted?: string[];
}

export interface IReply {
    event: WorkerEvent;
    message?: IMessage;
    retractions?: string[];
}
