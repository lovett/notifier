export enum WorkerCommand {
    connect = 'CONNECT',
    disconnect = 'DISCONNECT',
}

export enum WorkerEvent {
    add = 'ADD',
    connected = 'CONNECTED',
    disconnected = 'DISCONNECTED',
    dropped = 'DROPPED',
    parsefail = 'PARSEFAIL',
}
