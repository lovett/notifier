export default class Message {
    public static fromJson(message: IMessage) {
        const m = new Message();
        m.title = message.title;
        m.active = false;
        return m;
    }

    public active: boolean;
    public title: string;
    public body?: string;
    public group: string;
    public publicId: string;
    public received: Date;
    public url?: string;

}
