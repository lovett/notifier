'use strict';

function main (app, message, callback) {
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
        let channelSegments;

        if (!token || !token.User) {
            message.error = '401::Invalid Credentials';
            callback(message);

            return false;
        }

        // Is the requested channel still valid?
        channelSegments = message.subscription.replace(/^\//, '').split('/');

        if (channelSegments[0] !== 'messages') {
            //console.log({channel: message.subscription}, 'invalid channel');
            message.error = '400::Invalid subscription channel';
            callback(message);

            return;
        }

        if (channelSegments[1] !== token.User.getChannel()) {
            //console.log({channel: message.subscription}, 'stale channel');
            message.error = '301::' + token.User.getChannel();
            callback(message);

            return;
        }

        // Advance the token updatedAt value
        token.setDataValue('updatedAt', new Date());
        token.save().then(() => callback(message));
    }

    app.locals.Token.find({
        include: [app.locals.User],
        where: {
            value: message.ext.authToken
        }
    }).then(tokenFound).catch(tokenNotFound);
}

module.exports = exports = main;
