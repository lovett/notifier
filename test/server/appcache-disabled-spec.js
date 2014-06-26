process.env.NOTIFIER_APPCACHE_ENABLED = 'false';

delete require.cache[require.resolve('../../server.js')];

server = require('../../server');
agent = supertest.agent(server.app);

describe('/notifier.appcache', function () {

    before(function (done) {
        server.sync(function () {
            done();
        });
    });
    
    describe('GET', function () {
        it('returns 410 when appcache is disabled', function (done) {
            agent.get('/notifier.appcache').expect(410).end(done);
        });
    });
});
