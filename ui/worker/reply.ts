import {ReplyEvent} from './events';

export class Reply  {
    private payload: worker.Reply;

    constructor(event: ReplyEvent, message?: worker.Message) {
        this.payload = {event, message};
    }

    public setRetractions(ids: string[]) {
        this.payload.retractions = ids;
    }

    public send() {
        postMessage(this.payload);
    }
}
