import * as express from 'express';
import * as uuid from 'uuid';

const router = express.Router();

router.get('/', (req: express.Request, res: express.Response) => {
    const id = uuid.v4();

    const timer = setInterval(() => {
        res.write('event:keepalive\ndata:\n\n');
    }, 30000);

    req.socket.setKeepAlive(true);
    req.socket.setTimeout(0);

    req.connection.on('close', () => {
        clearInterval(timer);
        delete req.app.locals.pushClients[id];
        res.end();
    });

    req.app.locals.pushClients[id] = res;

    // The no-transform value of the Cache-Control header tells the compresssion
    // middleware not to compress this response. Otherwise, the client never sees
    // any of the writes.
    res.writeHead(200, {
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
    });

    res.write('event:connection\ndata:\n\n');
});

export default router;
