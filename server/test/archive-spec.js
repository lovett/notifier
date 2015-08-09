describe('/archive', function () {
    var endpoint, tokenKey, tokenValue, altTokenKey, altTokenValue;
    endpoint = '/archive/10';

    before(function (done) {
        server.sync(function () {
            server.createUser('test2', 'test2', function (err) {
                if (err) {
                    throw new Error(err);
                }

                agent.post('/auth')
                    .set('Accept', 'application/json')
                    .send({'username': 'test', 'password': 'test'})
                    .end(function (err, res) {
                        tokenKey = res.body.key;
                        tokenValue = res.body.value;

                        agent.post('/auth')
                            .set('Accept', 'application/json')
                            .send({'username': 'test2', 'password': 'test2'})
                            .end(function (err, res) {
                                altTokenKey = res.body.key;
                                altTokenValue = res.body.value;
                                done();
                            });
                    });
            });
        });
    });

    describe('GET', function () {

        it('accepts valid authorization', function (done) {
            agent.get(endpoint)
                .auth(tokenKey, tokenValue)
                .expect('Content-Type', /json/)
                .expect(200).end(done);
        });

        it('rejects missing authorization', function (done) {
            agent.get(endpoint)
                .expect(401).end(done);
        });

        it('rejects invalid auth tokenKey', function (done) {
            agent.get(endpoint)
                .auth(tokenKey, 'wrong value')
                .expect(401).end(done);
        });

        it('rejects invalid auth user', function (done) {
            agent.get(endpoint)
                .auth('wrong user', tokenValue)
                .expect(401).end(done);
        });

        it('requires a numeric count', function (done) {
            agent.get('/archive/foo')
                .auth(tokenKey, tokenValue)
                .expect('Content-Type', /json/)
                .expect(400).end(done);
        });

        it('rejects negative counts', function (done) {
            agent.get('/archive/-100')
                .auth(tokenKey, tokenValue)
                .expect('Content-Type', /json/)
                .expect(400).end(done);
        });

        it('enforces minimum count value', function (done) {
            agent.get('/archive/0')
                .auth(tokenKey, tokenValue)
                .expect(200)
                .expect(function (res) {
                    if (res.body.limit !== 1) {
                        throw new Error('Min count value was not limited');
                    }
                })
                .end(done);
        });

        it('enforces maximum count value', function (done) {
            agent.get('/archive/999')
                .auth(tokenKey, tokenValue)
                .expect(200)
                .expect(function (res) {
                    if (res.body.limit !== 100) {
                        throw new Error('Max count value was not limited');
                    }
                })
                .end(done);
        });

        it('rejects user token passed on querystring', function (done) {
            agent.get('/archive/10/' + tokenValue).expect(404).end(done);
        });

        it('does not expose message id', function (done) {
            agent.post('/message')
                .auth(tokenKey, tokenValue)
                .send({ title: 'test'})
                .end(function () {
                    agent.get(endpoint)
                        .auth(tokenKey, tokenValue)
                        .expect(function (res) {
                            if (res.body.messages[0].hasOwnProperty('id')) {
                                throw new Error('Message contains id property');
                            }
                        })
                        .end(done);
                });
        });

        it('does not expose message user id', function (done) {
            agent.post('/message')
                .auth(tokenKey, tokenValue)
                .send({ title: 'test'})
                .end(function () {
                    agent.get(endpoint)
                        .auth(tokenKey, tokenValue)
                        .expect(function (res) {
                            if (res.body.messages[0].hasOwnProperty('UserId')) {
                                throw new Error('Message contains UserId property');
                            }
                        }).end(done);
                    });
        });

        it('returns successfully if a numeric since value is provided', function (done) {
            agent.get(endpoint + '?since=' + (new Date()).getTime())
                .auth(tokenKey, tokenValue)
                .expect('Content-Type', /json/)
                .expect(200).end(done);
        });

        it('returns successfully if a non-numeric since value is provided', function (done) {
            agent.get(endpoint + '?since=' + (new Date()).getTime())
                .auth(tokenKey, tokenValue)
                .expect('Content-Type', /json/)
                .expect(200).end(done);
        });

        it('only returns messages for the requesting user', function (done) {
            var source = 'archive-check-user';
            agent.post('/message')
                .auth(altTokenKey, altTokenValue)
                .send({'title': 'test', 'source': source})
                .end(function (err) {
                    if (err) {
                        throw new Error(err);
                    }

                    agent.get(endpoint)
                        .auth(tokenKey, tokenValue)
                        .expect(function (res) {
                            res.body.messages.forEach(function (message) {
                                if (message.source === source) {
                                    throw new Error('Found message belonging to another user');
                                }
                            });
                        }).end(done);
                });
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
