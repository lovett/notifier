# Notifier

Notifier is a web-based notification service using Node.js. Messages
are received over HTTP and sent over websocket to connected clients.

Messages are stateful. When a client clears a messge, it is
revoked from all other clients.

Message are also stored by the server, even after they have been cleared.

## Installation and Setup

Third-party libraries can be installed using the standard technique:

`npm install`

All libraries are application-local. Globally-available packages are
not referenced, even if a package would prefer to be installed
globally.

Once libraries are installed, the browser UI can be built by running:

`npm run build`

To start the server, run:

`npm run start`

By default the server will run using a reasonable default
configuration that can be selectively overriden with an externa JSON
file.  This file can either be located at `/etc/notifier.json` or
within the application directory under `config-[env].json`
where `[env]` corresponds to the value of NODE_ENV.

By default, the server runs on `localhost:8080` with a default
username and password of "notifier".

## Usage

Authenticate with the server and send yourself a test message via grunt:

`grunt http:authtoken; grunt http:onemessage`


## Attribution

The icons used in the browser UI are taken from the
[Typicons](http://typicons.com) library.

The server and browser clients use [Faye](http://faye.jcoglan.com) for
publish-subscribe over websockets.

The browser UI uses [AngularJS 1](https://angularjs.org).
