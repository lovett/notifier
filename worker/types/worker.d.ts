declare namespace worker {
    type Command  = 'CONNECT' | 'FAUXCONNECT' | 'DISCONNECT';
    type ReplyEvent = 'ADD' | 'CONNECTED' | 'DISCONNECTED' | 'DROPPED' | 'PARSEFAIL';

    interface Reply {
        event: ReplyEvent;
        message?: Message;
        retractions?: string[];
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
}
