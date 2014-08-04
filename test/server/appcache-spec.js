describe('/notifier.appcache', function () {

    before(function (done) {
        server.sync(function () {
            done();
        });
    });

    describe('GET', function () {
        it('returns 200 when appcache is requested', function (done) {
            agent.get('/notifier.appcache')
                .expect('Content-Type', /text\/cache-manifest/)
                .expect(200).end(done);
        });

    });
});
