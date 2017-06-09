import {BasicStrategy} from "passport-http"

export default function (app) {
    return new BasicStrategy((key, value, next) => {

        app.locals.Token.findOne({
            include: [ app.locals.User],
            where: {
                value: value
            }
        }).then((token) => {
            if (!token || token.key !== key) {
                return next(null, false);
            }

            token.User.token = {
                key: key,
                value: value
            };

            return next(null, token.User);
        }).catch(() => {
            next(new Error('Application error'));
        });
    });
}
