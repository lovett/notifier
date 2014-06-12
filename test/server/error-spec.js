var supertest = require('supertest');

process.env.NODE_ENV = 'test';
var server = require('../../server');
var agent = supertest.agent(server);

describe('invalid route', function () {
    var endpoint = '/invalid';

    describe('GET', function () {
        it('is refused', function (done) {
            agent.get(endpoint).expect(404).end(done);
        });
    });

    describe('POST', function () {
        it('is refused', function (done) {
            agent.get(endpoint).expect(404).end(done);
        });
    });
});    
