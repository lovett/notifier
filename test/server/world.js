var fs = require('fs');
global.supertest = require('supertest');

process.env.NODE_ENV = 'test';

try {
    fs.unlinkSync('./test.sqlite');
} catch (e) {
};
