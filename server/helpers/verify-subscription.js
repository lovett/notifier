"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(app, message, callback) {
    if (!message.ext || !message.ext.authToken) {
        message.error = '401::Credentials missing';
        callback(message);
        return false;
    }
    function tokenNotFound() {
        message.error = '500::Unable to verify credentials at this time';
        callback(message);
        return false;
    }
    function tokenFound(token) {
        var channelSegments;
        if (!token || !token.User) {
            message.error = '401::Invalid Credentials';
            callback(message);
            return false;
        }
        channelSegments = message.subscription.replace(/^\//, '').split('/');
        if (channelSegments[0] !== 'messages') {
            message.error = '400::Invalid subscription channel';
            callback(message);
            return;
        }
        if (channelSegments[1] !== token.User.getChannel()) {
            message.error = '301::' + token.User.getChannel();
            callback(message);
            return;
        }
        token.setDataValue('updatedAt', new Date());
        token.save().then(function () { return callback(message); });
    }
    app.locals.Token.find({
        include: [app.locals.User],
        where: {
            value: message.ext.authToken
        }
    }).then(tokenFound).catch(tokenNotFound);
}
exports.default = default_1;
//# sourceMappingURL=verify-subscription.js.map