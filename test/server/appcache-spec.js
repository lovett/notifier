describe('/notifier.appcache', function () {

    before(function (done) {
        server.sync(function () {
            done();
        });
    });

    after(function (done) {
        server.setAppcache(true);
        done();
    });
    
    describe('GET', function () {
        it('returns 410 when appcache is disabled', function (done) {
            server.setAppcache(false);
            agent.get('/notifier.appcache').expect(410).end(done);
        });

        it('returns 200 when appcache is enabled', function (done) {
            server.setAppcache(true);
            agent.get('/notifier.appcache')
                .expect('Content-Type', /text\/cache-manifest/)
                .expect(200).end(done);
        });
        
    });    
});
