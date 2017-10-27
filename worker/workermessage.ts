import {WorkerEvent} from '../worker/events';

export class WorkerMessage  {
    private payload: worker.Reply;

    constructor(event: WorkerEvent, message?: worker.Message) {
        this.payload = {event, message};
    }

    public setRetractions(ids: string[]) {
        this.payload.retractions = ids;
    }

    public send() {
        postMessage(this.payload);
    }
}
