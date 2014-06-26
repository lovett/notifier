process.env.NODE_ENV = 'test';

var fs = require('fs');
var server = require('../../server');
var supertest = require('supertest');

fs.unlink('test.log', function () {});
fs.unlink('test.sqlite', function () {});

global.supertest = supertest;
global.server = server;
global.agent = supertest.agent(server.app);


