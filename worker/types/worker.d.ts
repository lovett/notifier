declare namespace worker {
    interface Command {
        action: 'CONNECT' | 'DISCONNECT';
        agent?: string;
        token?: string;
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
        event: 'ADD' | 'CONNECTED' | 'DISCONNECTED' | 'DROPPED' | 'PARSEFAIL';
        message?: Message;
        retractions?: string[];
    }
}
