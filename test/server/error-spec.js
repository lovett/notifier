describe('invalid route', function () {
    var endpoint = '/invalid';

    before(function (done) {
        server.sync(function () {
            done();
        });
    });

    describe('GET', function () {
        it('is refused', function (done) {
            agent.get(endpoint).expect(404).end(done);
        });
    });

    describe('POST', function () {
        it('is refused', function (done) {
            agent.get(endpoint).expect(404).end(done);
        });
    });
});    
