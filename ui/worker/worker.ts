import Command from './command';

let eventSource: EventSource;

/**
 * Open a persistent connection to the server for real-time push.
 */
function connect() {
    eventSource = new EventSource('push');

    eventSource.onopen = () => {
        console.log('Connected to push endpoint');
    };

    eventSource.onmessage = (e: MessageEvent) => {
        const json = JSON.parse(e.data);
        self.postMessage(json);
    };

    eventSource.onerror = (e: Event) => {
        console.log(e);
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
