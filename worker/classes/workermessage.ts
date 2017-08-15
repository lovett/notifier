import * as worker from '../../types/worker';

export class WorkerMessage  {
    private payload: worker.IReply;

    constructor(event: worker.WorkerEvent, message?: worker.IMessage) {
        this.payload = {event, message};
    }

    public setRetractions(ids: string[]) {
        this.payload.retractions = ids;
    }

    public send() {
        postMessage(this.payload);
    }
}
