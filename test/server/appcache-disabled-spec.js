process.env.NOTIFIER_APPCACHE_ENABLED = 'false';

delete require.cache[require.resolve('../../server.js')];

var server = require('../../server');
var agent = supertest.agent(server);

describe('/notifier.appcache', function () {
    describe('GET', function () {
        it('returns 410 when appcache is disabled', function (done) {
            agent.get('/notifier.appcache').expect(410).end(done);
        });
    });
});
