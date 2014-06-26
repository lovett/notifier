describe('/login', function () {
    var endpoint = '/login';

    before(function (done) {
        server.sync(function () {
            done();
        });
    });
    
    describe('GET', function () {
        it('returns 200 as text/html with Angular markup', function (done) {
            agent.get(endpoint).expect(200)
                .expect('Content-Type', /text\/html/)
                .expect(/ng-view/)
                .expect(/<html.*?ng-app/)
                .end(done);
        });
    });

    describe('POST', function () {
        it('is refused', function (done) {
            agent.post(endpoint).expect(404).end(done);
        });
    });
    
});

describe('/logout', function () {
    var endpoint = '/logout';

    before(function (done) {
        server.sync(function () {
            done();
        });
    });
    
    describe('GET', function () {
        it('returns 200 as text/html with Angular markup', function (done) {
            agent.get(endpoint).expect(200)
                .expect('Content-Type', /text\/html/)
                .expect(/ng-view/)
                .expect(/<html.*?ng-app/)
                .end(done);
        });
    });

    describe('POST', function () {
        it('is refused', function (done) {
            agent.post(endpoint).expect(404).end(done);
        });
    });
    
});
