import * as needle from "needle";

export default function (app, user, message) {
    // This is not a URL. It must be an absolute path.
    let channel = '/messages/' + user.getChannel();

    app.locals.bayeuxClient.publish(channel, JSON.stringify(message));

    user.getServiceTokens(() => {
        let pushbulletParams;

        if (!user.serviceTokens.hasOwnProperty('pushbullet')) {
            return;
        }

        if (message.pushbulletId === '0') {
            return;
        }

        if (message.hasOwnProperty('retracted')) {
            app.locals.Message.find({
                where: { 'publicId': message.retracted },
                attributes: ['pushbulletId']
            }).then((message) => {
                if (message.pushbulletId === '0') {
                    return;
                }
                needle.delete('https://api.pushbullet.com/v2/pushes/' + message.pushbulletId, null, {
                    'username': user.serviceTokens.pushbullet,
                    'password': ''
                });
            });
        } else {

            if (message.url) {
                pushbulletParams = {
                    'type': 'link',
                    'title': message.title,
                    'body': message.body,
                    'url': message.url
                };
            } else {
                pushbulletParams = {
                    'type': 'note',
                    'title': message.title,
                    'body': message.body
                };
            }

            needle.post('https://api.pushbullet.com/v2/pushes', pushbulletParams, {
                'username': user.serviceTokens.pushbullet,
                'password': ''
            }, (err, res) => {
                if (res.body.error) {
                    return false;
                }

                app.locals.Message.update(
                    { pushbulletId: res.body.iden },
                    { where: { id: message.id } }
                );
            });
        }
    });
}
