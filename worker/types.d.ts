declare namespace worker {
    interface Command {
        action: WorkerCommand;
        token?: string;
    }

    enum WorkerCommand {
        CONNECT,
        DISCONNECT,
    }

    enum WorkerEvent {
        ADD,
        CONNECTED,
        DISCONNECTED,
        DROPPED,
        PARSEFAIL,
    }

    interface Message {
        localId?: string;
        title: string;
        body?: string;
        source?: string;
        url?: string;
        group?: string;
        received?: string;
        retracted?: string[];
    }

    interface Reply {
        event: WorkerEvent;
        message?: IMessage;
        retractions?: string[];
    }
}
