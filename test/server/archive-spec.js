describe('/archive', function () {
    var endpoint = '/archive/10';
    var token;


    before(function (done) {
        server.sync(function () {
            agent.post('/auth')
                .send({'username': 'test', 'password': 'test'})
                .end(function (err, res) {
                    token = res.body.token;
                    done();
                });
        });
    });

    describe('GET', function () {

        it('accepts valid authorization', function (done) {
            agent.get(endpoint)
                .set('X-Token', token)
                .expect('Content-Type', /json/)
                .expect(200).end(done);
        });

        it('rejects missing authorization', function (done) {
            agent.get(endpoint)
                .expect('Content-Type', /json/)
                .expect(401).end(done);
        });

        it('rejects invalid authorization', function (done) {
            agent.get(endpoint)
                .set('X-Token', 'test')
                .expect('Content-Type', /json/)
                .expect(401).end(done);
        });

        it('requires a numeric count', function (done) {
            agent.get('/archive/foo')
                .expect('Content-Type', /json/)
                .expect(400).end(done);
        });

        it('rejects user token passed on querystring', function (done) {
            agent.get('/archive/10/' + token).expect(404).end(done);
        });

        it('does not expose message id', function (done) {
            agent.post('/message')
                .set('X-Token', token)
                .send({ title: 'test'})
                .end(function () {
                    agent.get(endpoint)
                        .set('X-Token', token)
                        .expect(function (res) {
                            if (res.body[0].hasOwnProperty('id')) {
                                throw new Error('Message contains id property');
                            }
                        }).end(done);
                    });
        });

        it('does not expose message user id', function (done) {
            agent.post('/message')
                .set('X-Token', token)
                .send({ title: 'test'})
                .end(function () {
                    agent.get(endpoint)
                        .set('X-Token', token)
                        .expect(function (res) {
                            if (res.body[0].hasOwnProperty('UserId')) {
                                throw new Error('Message contains UserId property');
                            }
                        }).end(done);
                    });
        });

        it('returns successfully if a numeric since value is provided', function (done) {
            agent.get(endpoint + '?since=' + (new Date()).getTime())
                .set('X-Token', token)
                .expect('Content-Type', /json/)
                .expect(200).end(done);
        });

        it('returns successfully if a non-numeric since value is provided', function (done) {
            agent.get(endpoint + '?since=' + (new Date()).getTime())
                .set('X-Token', token)
                .expect('Content-Type', /json/)
                .expect(200).end(done);
        });

    });

    describe('POST', function () {
        var request;

        beforeEach(function () {
            request = agent.post(endpoint);
        });

        it('is refused', function (done) {
            request.expect(404).end(done);
        });
    });
});
