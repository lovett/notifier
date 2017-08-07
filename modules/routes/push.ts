import * as express from 'express';
import * as uuid from 'uuid';

const router = express.Router();

router.get('/', (req: express.Request, res: express.Response) => {
    const id = uuid.v4();
    req.socket.setKeepAlive(true);
    req.socket.setTimeout(0);

    req.connection.on('close', () => {
        delete req.app.locals.pushClients[id];
        res.end();
    });

    req.app.locals.pushClients[id] = res;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(200);
});

export default router;
