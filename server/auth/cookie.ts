import {Strategy as CookieStrategy} from 'passport-cookie';

export default (app) => {
    return new CookieStrategy((cookieValue, next) => {
        const [key, value] = cookieValue.split(',');


        app.locals.Token.findOne({
            include: [ app.locals.User],
            where: {key, value},
        }).then((token) => {
            if (!token) {
                return next(null, false);
            }

            token.User.token = {key, value};

            return next(null, token.User);
        }).catch(() => {
            next(new Error('Application error'));
        });
    });
};
