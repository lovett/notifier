import {Receiver} from './receiver';
import {WorkerCommand} from './events';


let receiver: Receiver;

self.addEventListener('message', (e: MessageEvent) => {
    const command: worker.Command = e.data;

    if (!receiver) {
        receiver = new Receiver();
    }

    if (command.action === WorkerCommand.connect) {
        receiver.connect();
        return true;
    }

    if (command.action === WorkerCommand.disconnect) {
        receiver.disconnect();
        return true;
    }

    return false;
});
