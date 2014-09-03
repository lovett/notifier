describe('/message', function () {
    var endpoint, tokenKey, tokenValue;
    endpoint = '/message';

    before(function (done) {
        server.sync(function () {
            agent.post('/auth')
                .send({'username': 'test', 'password': 'test'})
                .end(function (err, res) {
                    tokenKey = res.body.key;
                    tokenValue = res.body.value;
                    done();
                });
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
                .auth(tokenKey, tokenValue)
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
                .auth(tokenKey, tokenValue)
                .expect(400).end(done);
        });

        it('requires title', function (done) {
            agent.post(endpoint)
                .auth(tokenKey, tokenValue)
                .send({'url': 'http://example.com'})
                .expect(400).end(done);
        });

        it('rejects blank required value', function (done) {
            agent.post(endpoint)
                .auth(tokenKey, tokenValue)
                .send({'title': '', 'url': 'http://example.com'})
                .expect(400).end(done);
        });

        it('accepts body with markup', function (done) {
            agent.post(endpoint)
                .auth(tokenKey, tokenValue)
                .send({'title': 'Test', 'body': '<p>This string contains <em>acceptable</em> markup</p>'})
                .expect(204).end(done);
        });

        it('accepts a fully-populated message', function (done) {
            agent.post(endpoint)
                .auth(tokenKey, tokenValue)
                .send({'title': 'test',
                       'url': 'http://example.com',
                       'source': 'mocha',
                       'body': 'testing',
                       'group': 'message-spec'
                      })
                .expect(204).end(done);
        });
    });
});
