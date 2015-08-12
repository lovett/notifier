describe('configuration', function () {

    var dbConfig;

    before(function (done) {
        server.sync(function () {
            done();
        });
        dbConfig = server.getDbConfig();
    });

    //before(function (done) {
        // server.nconf.remove('file');
        // server.nconf.remove('env');
        // process.env.NOTIFIER_DB_USER = user;
        // process.env.NOTIFIER_DB_PASS = pass;
        // process.env.NOTIFIER_DB_NAME = dbname;
        // server.nconf.add('env');
        //
    //});

    // beforeEach(function (done) {
    //     dbConfig = server.getDbConfig();
    //     done();
    // });

    describe('username', function () {
        it('can be populated via file', function (done) {
            assert.equal(dbConfig.username, 'test-username');
            done();
        });

        it('can be populated via env', function (done) {
            var dbConfig, user;
            user = 'test-alt-user';
            server.nconf.set('NOTIFIER_DB_USER', user);
            dbConfig = server.getDbConfig();
            assert.equal(dbConfig.username, user);
            done();
        });
    });

    describe('password', function () {
        it('can be populated via file', function (done) {
            assert.equal(dbConfig.password, 'test-password');
            done();
        });

        it('can be populated via env', function (done) {
            var dbConfig, pass;
            pass = 'test-alt-pass';
            server.nconf.set('NOTIFIER_DB_PASS', pass);
            dbConfig = server.getDbConfig();
            assert.equal(dbConfig.password, pass);
            done();
        });
    });

    describe('sequelize object', function () {
        it('can be populated via file', function (done) {
            assert.isObject(dbConfig.sequelize);
            done();
        });

        it('is created if not specified', function (done) {
            var dbConfig;
            server.nconf.clear('NOTIFIER_DB_CONFIG');
            dbConfig = server.getDbConfig();
            assert.isObject(dbConfig);
            done();
        });
    });

    describe('query logging', function () {
        it('is activated ', function (done) {
            assert.isFunction(dbConfig.sequelize.logging);
            done();
        });
    });

});
