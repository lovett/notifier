import {Listener} from './listener';

const listener = new Listener();

self.addEventListener('message', (e: MessageEvent) => {
    listener.do(e.data);
});
