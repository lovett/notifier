import {Strategy as LocalStrategy} from "passport-local"

export default function (app) {
    return new LocalStrategy((username, password, done) => {
        app.locals.User.find({ where: { username: username } }).then((user) => {
            if (!user) {
                return done(null, false);
            }

            user.checkPassword(password, (valid) => {
                if (valid) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        }).catch((error) => done(error));
    });
}
