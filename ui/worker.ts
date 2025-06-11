import { Command, Event } from './postmessage';

let eventSource: EventSource;
let reconnectTimer: number;

/**
 * Open a persistent connection to the server for real-time push.
 */
function connect() {
    eventSource = new EventSource('push');
    eventSource.onopen = () => {
        self.postMessage(Event.connected);
    };

    eventSource.onmessage = (e: MessageEvent) => {
        const json = JSON.parse(e.data);
        self.postMessage(json);
    };

    eventSource.onerror = () => {
        self.postMessage(Event.error);

        clearTimeout(reconnectTimer);

        reconnectTimer = setTimeout(connect, 5000);
    };
}

/**
 * Stop listening for new messages.
 */
function disconnect() {
    if (eventSource) {
        eventSource.close();
    }

    self.postMessage(Event.disconnected);
}

/**
 * Dispatch commands sent via postMessage.
 */
self.addEventListener('message', (e: MessageEvent) => {
    switch (e.data) {
        case Command.connect:
            connect();
            break;
        case Command.disconnect:
            disconnect();
            break;
        default:
            console.log('Unrecognized command', e.data);
    }
});
