describe('templates', function () {
    describe('GET', function () {
        before(function (done) {
            server.sync(function () {
                done();
            });
        });
        
        it('accepts requests without querystring', function (done) {
            agent.get('/templates/login.html')
                .expect(200)
                .end(done);
        });

        it('rejects requests with querystring', function (done) {
            agent.get('/templates/login.html?foo=bar')
                .expect(400)
                .end(done);
        });

    });

    describe('POST', function () {
        before(function (done) {
            server.sync(function () {
                done();
            });
        });
        
        it('is refused', function (done) {
            agent.post('/templates/login.html')
                .expect(405)
                .end(done);
        });
    });
});
