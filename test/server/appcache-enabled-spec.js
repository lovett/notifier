var supertest = require('supertest');

process.env.NOTIFIER_APPCACHE_ENABLED = 'true';
process.env.NODE_ENV = 'test';

delete require.cache[require.resolve('../../server.js')];

var server = require('../../server');
var agent = supertest.agent(server);

describe('/notifier.appcache', function () {
    describe('GET', function () {
        it('returns 200 when appcache is enabled', function (done) {
            agent.get('/notifier.appcache')
                .expect('Content-Type', /text\/cache-manifest/)
                .expect(200).end(done);
        });
    });
});
