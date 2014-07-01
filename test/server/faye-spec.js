describe('faye', function () {
    var token, channel, message;

    before(function (done) {
        server.sync(function () {
            agent.post('/auth')
                .send({'username': 'test', 'password': 'test'})
                .end(function (err, res) {
                    token = res.body.token;
                    channel = res.body.channel;
                    done();
                });
        });
    });

    beforeEach(function (done) {
        message = {
            ext: {
                authToken: token
            },
            subscription: '/messages/' + channel
        };
        done();
    });



    it('rejects missing credentials', function (done) {
        server.verifySubscription({}, function (message) {
            assert.property(message, 'error');
            assert.equal(message.error, '401::Credentials missing');
            done();
        });
    });

    it('rejects invalid credentials', function (done) {
        message.ext.authToken = 'invalid-for-test';
        server.verifySubscription(message, function (message) {
            assert.property(message, 'error');
            assert.equal(message.error, '401::Invalid Credentials');
            done();
        });
    });

    it('rejects invalid channel', function (done) {
        message.subscription = '/invalid/' + channel;
        server.verifySubscription(message, function (message) {
            assert.property(message, 'error');
            assert.equal(message.error, '400::Invalid subscription channel');
            done();
        });
    });

    it('accepts valid credentials', function (done) {
        server.verifySubscription(message, function (message) {
            assert.notProperty(message, 'error');
            done();
        });
    });

    it('redirects valid credentials with invalid channel', function (done) {
        message.subscription = '/messages/invalid-for-test';
        server.verifySubscription(message, function (message) {
            assert.property(message, 'error');
            assert.equal(message.error, '301::' + channel);
            done();
        });

    });

    /**
     * The previous tests ran against verifySubscription directly. Here we simulate
     * a client more directly.
     */
    it('verifies an incoming subscription without credentials', function (done) {
        var client = server.bayeuxClient;
        client.addExtension({
            incoming: function (message) {
                assert.isFalse(message.successful);
                assert.property(message, 'error');
                assert.equal(message.error, '401::Credentials missing');
                client.removeExtension(this);
                done();
            }
        });
       client.subscribe('/test');
    });

    it('rejects message publication without an app secret', function (done) {
        var client = server.bayeuxClient;
        client.addExtension({
            outgoing: function (message, callback) {
                // message.ext.secret exists at this point (added by
                // server), but we want to simulate a message sent
                // without it so we'll overwrite the object
                message.ext = {
                    authToken: token
                };
                return callback(message);
            },
            incoming: function (message) {
                assert.isFalse(message.successful);
                assert.property(message, 'error');
                assert.equal(message.error, '403::Forbidden');
                client.removeExtension(this);
                done();
            }
        });
        client.publish('/messages/' + channel, {text: 'hello'});
    });

    it('acccepts message publication with an app secret', function (done) {
        var client = server.bayeuxClient;
        client.addExtension({
            outgoing: function (message, callback) {
                message.ext.authToken = token;
                return callback(message);
            },
            incoming: function (message) {
                assert.isTrue(message.successful);
                assert.notProperty(message, 'error');
                client.removeExtension(this);
                done();
            }
        });
        client.publish('/messages/' + channel, {text: 'hello'});
    });

});
