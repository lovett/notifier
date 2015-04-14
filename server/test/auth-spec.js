describe('/auth', function () {
    var endpoint = '/auth';

    before(function (done) {
        server.sync(function () {
            done();
        });
    });

    describe('GET', function () {
        var request;

        beforeEach(function () {
            request = agent.get(endpoint);
        });

        it('is refused', function (done) {
            request.expect(404).end(done);
        });
    });

    describe('POST', function () {
        var request;

        beforeEach(function () {
            request = agent.post(endpoint);
        });

        it('rejects empty request', function (done) {
            request.expect(400).end(done);
        });

        it('rejects incomplete credentials', function (done) {
            request = request.send({'username': 'test'});
            request.expect(400).end(done);
        });

        it('rejects invalid username', function (done) {
            request = request.send({'username': 'foo', 'password': 'bar'});
            request.expect(401).end(done);
        });

        it('rejects invalid password', function (done) {
            request = request.send({'username': 'test', 'password': 'bar'});
            request.expect(401).end(done);
        });

        it('accepts valid login with label', function (done) {
            request = request.send({'username': 'test', 'password': 'test', 'label': 'test'});
            request.expect(200).end(done);
        });

        it('returns token and channel', function (done) {
            request = request.send({'username': 'test', 'password': 'test'}).set('Accept', 'application/json');
            request.expect('Content-Type', /json/).expect(function (res) {
                if (!res.body.hasOwnProperty('key')) {
                    throw new Error('No key');
                }
                
                if (!res.body.hasOwnProperty('value')) {
                    throw new Error('No value');
                }

                if (!res.body.hasOwnProperty('channel')) {
                    throw new Error('No channel');
                }
            }).end(done);
        });

    });
});
