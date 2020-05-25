import { Request, Response, Router } from 'express';
import User from '../User';
import * as uuid from 'uuid';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const user = req.user as User;
    const clientId = uuid.v4();

    if (!req.app.locals.pushClients.has(user.id)) {
        req.app.locals.pushClients.set(user.id, new Map());
    }

    const clients = req.app.locals.pushClients.get(user.id);

    const timer = setInterval(() => {
        res.write('event:keepalive\ndata:\n\n');
    }, 30000);

    req.socket.setKeepAlive(true);
    req.socket.setTimeout(0);

    req.connection.on('close', () => {
        clearInterval(timer);
        clients.delete(clientId);
        res.end();
    });

    clients.set(clientId, res);

    // The no-transform value of the Cache-Control header tells the
    // compresssion middleware not to compress this
    // response. Otherwise, the client never sees any of the writes.
    res.writeHead(200, {
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
        'X-Accel-Buffering': 'no',
    });

    res.write('event:connection\ndata:\n\n');
});

export default router;
