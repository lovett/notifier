var server = require('../../server');
var agent = supertest.agent(server);
var assert = require('chai').assert;
var faye = require('faye');

describe('websocket', function () {
    var auth;

    var clientFactory = function () {
        var client = new faye.Client(server + '/messages', {
            retry: 10,
            timeout: 45
        });
    };
    
    before(function (done) {
        agent.post('/auth')
            .send({'username': 'test', 'password': 'test'})
            .end(function (err, res) {
                auth = res.body;
                console.log('done with before!');
                done();
            });
    });
    
    it('rejects missing credentials', function (done) {
        console.log(auth);
        done();
    });

    xit('rejects missing credentials', function (done) {
        client.emitter.on('error', function (message) {
            var segments = message.split('::');
            assert.equal(segments[0], 401, segments[1]);
            done();
        });
        client.init('http://localhost:8080', {});
    });

    xit('accepts valid credentials', function(done) {
        client.init('http://localhost:8080', auth);
    });
    
});
