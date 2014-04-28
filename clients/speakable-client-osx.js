#!/usr/bin/env node

var faye = require('faye');
var util = require('util');
var spawn = require('child_process').spawn;
var program = require('commander');

program.option('-S, --server <url>', 'The notifier server to connect to, such as http://localhost:8080/faye');
program.parse(process.argv);


if (!program.server) {
    program.help();
}

var client = new faye.Client(program.server);

client.subscribe("/messages/*", function (message) {
    try {
        message = JSON.parse(message);
    } catch (e) {
        return;
    }

    var shell_command = spawn('osascript', ['speak.scpt', message.title.replace(/"/g, '\\"')]);

    shell_command.stderr.on('data', function (data) {
        console.log(data);
    });
});
