declare module 'passport-cookie' {
    import passport = require('passport');
    import express = require('express');

    class Strategy implements passport.Strategy {
        public authenticate: (req: express.Request, options?: object) => void;
        constructor(verify: (cookieValue: string, done: (error: any, user?: any) => void) => void);
    }

}
