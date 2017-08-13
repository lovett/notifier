declare namespace worker {
    export interface ICommand {
        action: WorkerCommand;
        token?: string;
    }

    export enum WorkerCommand {
        CONNECT,
        DISCONNECT,
    }

    export enum WorkerEvent {
        ADD,
        CONNECTED,
        DISCONNECTED,
        DROPPED,
        PARSEFAIL,
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

}
