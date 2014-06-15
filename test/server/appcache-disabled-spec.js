var supertest = require('supertest');
var chai = require('chai');

process.env.NOTIFIER_APPCACHE_ENABLED = 'false';
process.env.NODE_ENV = 'test';

delete require.cache[require.resolve('../../server.js')]

var server = require('../../server');
var agent = supertest.agent(server);

describe('/notifier.appcache', function () {
    describe('GET', function () {
        it('returns 410 when appcache is disabled', function (done) {
            console.log(process.env.NOTIFIER_APPCACHE_ENABLED);
            agent.get('/notifier.appcache').expect(410).end(done);
        });
    });
});
