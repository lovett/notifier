process.env.NOTIFIER_APPCACHE_ENABLED = 'true';

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
        it('returns 200 when appcache is enabled', function (done) {
            agent.get('/notifier.appcache')
                .expect('Content-Type', /text\/cache-manifest/)
                .expect(200).end(done);
        });
    });
});
