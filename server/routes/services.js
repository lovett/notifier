"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var router = express.Router();
router.get('/', function (req, res, next) {
    req.user.getServiceTokens(function () {
        var services = req.user.serviceTokens.map(function (token) {
            if (token.label === 'service') {
                delete token.value;
            }
            delete token.label;
            return token;
        });
        res.json(services);
    });
});
router.post('/', function (req, res, next) {
    var additions = [];
    var removals = [];
    var whitelist = ['webhook'];
    for (var name_1 in req.body) {
        if (whitelist.indexOf(name_1) === -1) {
            continue;
        }
        removals.push(name_1);
        if (req.body[name_1].trim().length === 0) {
            continue;
        }
        additions.push({
            UserId: req.user.id,
            key: name_1,
            label: 'userval',
            persist: true,
            value: req.body[name_1],
        });
    }
    if (removals.length === 0 && additions.length === 0) {
        res.status(400).send('Nothing to be done');
        return;
    }
    req.app.locals.Token.destroy({
        where: {
            UserId: req.user.id,
            key: {
                $in: removals,
            },
        },
    }).then(function (affectedRows) {
        return req.app.locals.Token.bulkCreate(additions);
    }).then(function () {
        res.sendStatus(200);
    }).catch(function (error) {
        res.status(500).json(error);
    });
});
exports.default = router;
//# sourceMappingURL=services.js.map