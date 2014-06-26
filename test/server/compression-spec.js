describe('compression', function () {
    
    describe('GET', function () {
        before(function (done) {
            server.sync(function () {
                done();
            });
        });
        
        it('routes are compressed', function (done) {
            agent.get('/')
                .expect(200)
                .expect('Content-Encoding', /gzip/)
                .end(done);
        });
        
        it('static files are compressed', function (done) {
            agent.get('/robots.txt')
                .expect(200)
                .expect('Content-Encoding', /gzip/)
                .end(done);
        });
    });
});
