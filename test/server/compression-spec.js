var server = require('../../server');
var agent = supertest.agent(server);

describe('compression', function () {
    
    describe('GET', function () {
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
