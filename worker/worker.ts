import {Receiver} from './classes/receiver';

let receiver: Receiver;

self.addEventListener('message', (e: MessageEvent) => {
    const command: worker.Command = e.data;

    if (!receiver) {
        receiver = new Receiver();
    }

    if (command.action === worker.WorkerCommand.CONNECT) {
        receiver.connect();
        return true;
    }

    if (command.action === worker.WorkerCommand.DISCONNECT) {
        receiver.disconnect();
        return true;
    }

    return false;
});
