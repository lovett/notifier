
describe('/message/clear', function () {
    var endpoint, tokenKey, tokenValue;
    endpoint = '/message/clear';

    before(function (done) {
        server.sync(function () {
            agent.post('/auth')
                .set('Accept', 'application/json')
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
        it('requires a public or local id', function (done) {
            agent.post(endpoint)
                .auth(tokenKey, tokenValue)
                .send({})
                .expect(400).end(done);
        });

        it('rejects an invalid public id', function (done) {
            agent.post(endpoint)
                .auth(tokenKey, tokenValue)
                .send({'publicId': 'test'})
                .expect(400).end(done);
        });
        
        it('rejects an invalid local id', function (done) {
            agent.post(endpoint)
                .auth(tokenKey, tokenValue)
                .send({'localId': 'test'})
                .expect(400).end(done);
        });

        it('accepts a valid local id', function (done) {
            
            var message = {
                'localId': chance.guid(),
                'title': 'test',
                'body': 'test'
            };
                
            var callback = function () {
                agent.post(endpoint)
                    .auth(tokenKey, tokenValue)
                    .send({'localId': message.localId})
                    .expect(204).end(done);
            };
            
            agent.post('/message')
                .auth(tokenKey, tokenValue)
                .send(message).end(callback);
        });
        
    });
    
});    
