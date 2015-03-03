process.env.NODE_ENV = 'test';

var fs = require('fs');
var server = require('../notifier-server');
var supertest = require('supertest');
var assert = require('chai').assert;
var Chance = require('chance');

fs.unlink('test.log', function () {});
fs.unlink('test.sqlite', function () {});

global.supertest = supertest;
global.server = server;
global.agent = supertest.agent(server.app);
global.assert = assert;
global.chance = new Chance();
