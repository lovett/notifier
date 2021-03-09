import {Command, Event} from './postmessage';

let eventSource: EventSource;
let reconnectTimer: number;
let pollingTimer: number;

const isAndroid = self.navigator.userAgent.indexOf('Android') > -1;
const isFirefox = self.navigator.userAgent.indexOf('Firefox') > -1;

/**
 * There is a long-standing problem with worker-based EventSource
 * connections on Firefox for Android that causes the browser to crash
 * when the page is reloaded or closed. Fetch-based polling is used as
 * a workaround.
 */
const usePolling = (isAndroid && isFirefox);
const pollingInterval = 5000;

/**
 * Open a persistent connection to the server for real-time push.
 */
function connect() {
    if (usePolling) {
        self.postMessage(Event.connected);
        pollingTimer = setInterval(poll, pollingInterval);
        return;
    }

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

async function poll() {
    const since = Date.now() - pollingInterval;
    const response = await fetch(
        `archive?since=${since}`,
        { credentials: 'same-origin' },
    );
    const json = await response.json();
    json.forEach((message: unknown) => {
        self.postMessage(message);
    });
}

/**
 * Stop listening (or polling) for new messages.
 */
function disconnect() {
    clearTimeout(pollingTimer);

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
