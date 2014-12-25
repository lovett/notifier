# Notifier

Notifier is a web-based notification service. Messages come in via 
HTTP and go out over websocket to connected clients. Clients can
be web browsers or other scripts written in any language.

The notifer server is a Node.js application. It handles incoming
messages, manages websocket connections, and serves the browser
UI. The browser UI uses AngularJS. 

## Installation

The first thing you'll need to run Notifier is Node.js. If you can
invoke Node.js as "node", you're set. If your installation provides
"nodejs" but not "node" (as is the case with Node.js packages on
Debian for example), symlink `/usr/bin/node` to `/usr/bin/nodejs`.

Next, you'll need 4 NPM packages installed globally:

`npm install -g grunt-cli bunyan nodemon bower`

Then install the remaining NPM packages locally:

`npm install`

Next, install the bower packages:

`bower install`

The notifier server is configured via a JSON file. A default file is
provided as `env-sample.json`. Copy this file to `env.json`:

`cp env-sample.json env.json`

Now use Grunt to build the browser UI:

`grunt`

Start the server:

`grunt shell:server`

Send yourself a test message via grunt:

`grunt http:authtoken; grunt http:onemessage`

Finally, view the application in a web browser. By default, it will be
running on localhost:8080. The default username and password are both
"notifier".

