# Notifier

Notifier is a web-based notification service using Node.js. Messages
are received over HTTP and sent over websocket to connected clients.

Messages are stateful. When a client clears a messge, it is
revoked from all other clients.

Message are also stored by the server, even after they have been cleared.

## Installation and Setup

Third-party libraries can be installed using standard `npm install`
procedures. Everything is application-local with no implicit
dependency on globally-available packages.

The server is configured with internal defaults that can be
selectively overriden via an external JSON file. This file can either
be located at `/etc/notifier.json` or within the application directory
under `server/config-{env}.json` where `{env}` corresponds to the
value of NODE_ENV.

Before the application can be used, the browser UI must be be built by running:

`npm run -s build`

The server can be started by running:

`npm run -s start`

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

The browser UI uses [AngularJS 1](https://angularjs.org).
