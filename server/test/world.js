'use strict';

var Chance, assert, fs, server, supertest;

process.env.NODE_ENV = 'test';

fs = require('fs');
server = require('../notifier-server');
supertest = require('supertest');
assert = require('chai').assert;
Chance = require('chance');

fs.unlink('test.log', function () {});
fs.unlink('test.sqlite', function () {});

global.supertest = supertest;
global.server = server;
global.agent = supertest.agent(server.app);
global.assert = assert;
global.chance = new Chance();
