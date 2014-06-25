var fs = require('fs');
global.supertest = require('supertest');

process.env.NODE_ENV = 'test';

try {
    fs.unlinkSync('./test.sqlite');
    fs.unlinkSync('./test.log');
} catch (e) {
};
