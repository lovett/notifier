# Notifier

Notifier is a web-based notification service. Messages come in via 
HTTP and go out over websocket to connected clients. Clients can
be web browsers or other scripts written in any language.

The notifer server is a Node.js application. It handles incoming
messages, manages websocket connections, and serves the browser
UI.

## Installation

The first thing you'll need to run Notifier is Node.js. If you can
invoke Node.js as "node", you're set. If your installation provides
"nodejs" but not "node" (as is the case with Node.js packages on
Debian for example), symlink `/usr/bin/node` to `/usr/bin/nodejs`.

Next, you'll need 3 NPM packages installed globally:

`npm install -g grunt-cli bunyan nodemon`

Then install the remaining NPM packages locally:

`npm install`

The notifier server is configured via a JSON file. A default file is
provided as `env-sample.json`. Copy this file to `env.json` and
customize as appropriate. Now use Grunt to build the browser UI:

`grunt`

Now start the server:

`grunt shell:server`

Authenticate with the server and send yourself a test message via grunt:

`grunt http:authtoken; grunt http:onemessage`

Finally, view the application in a web browser. By default, it will be
running on localhost:8080. The default username and password are both
"notifier".

## Attribution

The icons used in the browser UI are taken from the
[Typicons](http://typicons.com) library.

The server and browser clients use [Faye](http://faye.jcoglan.com) for
publish-subscribe over websockets.

The browser UI uses [AngularJS](https://angularjs.org). 

