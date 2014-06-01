var path = require('path');
var util = require('util');
var execSync = require('exec-sync');
var client = require('./client');
var applescriptPath = path.join(__dirname, 'speak.scpt');
var remoteServer = process.argv[2];
            
if (!remoteServer) {
    console.error('Specify the server to connect to. For example, http://localhost:8080');
    process.exit();
}

// Using the contents of $HOME/.notifier, authenticate with the server
// and get an auth token
client.authorize(remoteServer);

// Listen for messages
client.emitter.on('message', function (message) {
    var command = util.format('osascript %s "%s"', applescriptPath, message.title.replace(/"/g, '\\"'));

    // execSync prevents simultaneous enunciations when messages
    // arrive in quick succession
    var result = execSync(command, true);
    
    if (result.sterr !== '') {
        console.log(result.stderr);
    }
});


