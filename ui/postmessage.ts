enum Command {
    connect = 'CONNECT',
    disconnect = 'DISCONNECT',
}

enum Event {
    connected = 'CONNECTED',
    disconnected = 'DISCONNECTED',
    error = 'ERROR',
}

export { Command, Event };
