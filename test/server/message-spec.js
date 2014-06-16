var supertest = require('supertest');

process.env.NODE_ENV = 'test';
var server = require('../../server');
var agent = supertest.agent(server);

describe('/message', function () {
    var endpoint = '/message';
    var token;

    beforeEach(function (done) {
        agent.post('/auth')
            .send({'username': 'test', 'password': 'test'})
            .end(function (err, res) {
                token = res.body.token;
                done();
            });
    });

    describe('GET', function () {
        it('is refused', function (done) {
            agent.get(endpoint).expect(404).end(done);
        });

    });

    describe('POST', function () {
        var request;

        beforeEach(function () {
            request = agent.post(endpoint);
        });

        it('accepts valid authorization', function (done) {
            agent.post(endpoint)
                .set('X-Token', token)
                .send({'title': 'test'})
                .expect(204).end(done);
        });

        it('rejects missing authorization', function (done) {
            agent.post(endpoint)
                .send({'title': 'test'})
                .expect(401).end(done);
        });

        it('rejects invalid authorization', function (done) {
            agent.post(endpoint)
                .set('X-Token', 'test')
                .send({'title': 'test'})
                .expect(401).end(done);
        });

        it('rejects empty message', function (done) {
            agent.post(endpoint)
                .set('X-Token', token)
                .expect(400).end(done);
        });

        it('rejects blank value', function (done) {
            agent.post(endpoint)
                .set('X-Token', token)
                .send({'title': ''})
                .expect(400).end(done);
        });
        
        
    });
});
