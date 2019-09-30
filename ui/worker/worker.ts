import Command from './command';

let eventSource: EventSource;
let reconnectTimer: number;

/**
 * Open a persistent connection to the server for real-time push.
 */
function connect() {
    eventSource = new EventSource('push');

    eventSource.onopen = () => {
        self.postMessage(Command.online);
    };

    eventSource.onmessage = (e: MessageEvent) => {
        const json = JSON.parse(e.data);
        self.postMessage(json);
    };

    eventSource.onerror = () => {
        self.postMessage(Command.offline);

        clearTimeout(reconnectTimer);

        reconnectTimer = setTimeout(connect, 5000);
    };
}

/**
 * Close a previously-opened EventSource connection.
 */
function disconnect() {
    if (eventSource) {
        eventSource.close();
    }
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
