describe('/', function () {
    var endpoint = '/';

    before(function (done) {
        server.sync(function () {
            done();
        });
    });
    
    describe('GET', function () {
        var request;

        beforeEach(function () {
            request = agent.get(endpoint);
        });
        
        it('returns 200 as text/html with Angular markup', function (done) {
            request.expect(200)
                .expect('Content-Type', /text\/html/)
                .expect(/ng-view/)
                .expect(/<html.*?ng-app/)
                .end(done);
        });

        it('omits X-Powered-By header', function (done) {
            request.expect(function (res) {
                if (res.header.hasOwnProperty('x-powered-by')) {
                    throw new Error('x-powered-by header is set to "' + res.header['x-powered-by'] + '"');
                }
            }).end(done);
        });

        it('includes Strict-Transport-Security header', function (done) {
            request.expect('Strict-Transport-Security', /max-age=[0-9]+/, done);
        });

        it('includes X-Frame-Options header', function (done) {
            request.expect('X-Frame-Options', 'DENY', done);
        });

        it('includes Content-Security-Policy header', function (done) {
            request.expect('Content-Security-Policy', /default-src/, done);
        });

        it('includes X-Response-Time header', function (done) {
            request.expect('X-Response-Time', /[0-9]+ms$/, done);
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
