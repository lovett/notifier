"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var uuid = require("uuid");
var router = express.Router();
router.get('/', function (req, res) {
    var id = uuid.v4();
    var timer = setInterval(function () {
        var d = new Date();
        res.write('event:keepalive\ndata:\n\n');
    }, 30000);
    req.socket.setKeepAlive(true);
    req.socket.setTimeout(0);
    req.connection.on('close', function () {
        clearInterval(timer);
        delete req.app.locals.pushClients[id];
        res.end();
    });
    req.app.locals.pushClients[id] = res;
    res.writeHead(200, {
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
    });
    res.write('event:connection\ndata:\n\n');
});
exports.default = router;
//# sourceMappingURL=push.js.map