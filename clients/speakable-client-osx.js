#!/usr/bin/env node

var path = require('path');
var faye = require('faye');
var util = require('util');
var execSync = require('exec-sync');
var program = require('commander');

program.option('-s, --server <url>', 'The notifier server to connect to, such as http://localhost:8080/faye');
program.parse(process.argv);

if (!program.server) {
    program.help();
}

var client = new faye.Client(program.server, {
    retry: 10,
    timeout: 45
});

client.subscribe("/messages/speech/*", function (message) {
    try {
        message = JSON.parse(message);
    } catch (e) {
        return;
    }

    var script_path = path.join(__dirname, 'speak.scpt');

    var command = util.format("osascript %s '%s'", script_path, message.title.replace(/"/g, '\\"'));
    var result = execSync(command, true);

    if (result.sterr !== '') {
        console.log(result.stderr);
    }
});
