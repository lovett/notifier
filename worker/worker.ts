import {Receiver} from './receiver';
import {WorkerCommand} from './events';


let receiver: Receiver;

self.addEventListener('message', (e: Event) => {
    const command: worker.Command = (e as MessageEvent).data;

    if (!receiver) {
        receiver = new Receiver();
    }

    if (command.action === WorkerCommand.connect) {
        receiver.connect();
    }

    if (command.action === WorkerCommand.disconnect) {
        receiver.disconnect();
    }
});
