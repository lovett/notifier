#!/usr/bin/env node

var CONFIG = require('config');
var faye = require('faye');
var util = require('util');
var spawn = require('child_process').spawn;
var program = require('commander');
var path = require('path');

program.option('-S, --server <url>', 'The notifier server to connect to, such as http://localhost:8080/faye');
program.parse(process.argv);


if (!program.server) {
    program.help();
}

var client = new faye.Client(program.server);

client.subscribe("/messages/git", function (message) {
    var repository, shell_command;

    try {
        message = JSON.parse(message);
    } catch (e) {
        return;
    }

    if (message.group !== 'git') {
        return;
    }

    repository = CONFIG.git[message.url] || '';

    if (repository === '') {
        return;
    }

    if (message.event === 'push_received') {
        shell_command = spawn('git', ['pull'], { cwd: repository});

        shell_command.on('error', function (error) {
            shell_command.kill();
        });

        shell_command.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });

        shell_command.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });
    }
});
