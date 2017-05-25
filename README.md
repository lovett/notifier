# Notifier

Notifier is a web-based notification service for keeping track of
important things as they happen.

It consists of a Node.js server that you self-host and a browser-based
interface that presents messages as they arrive.

Delivery happens over HTTP and websockets.

What constitutes a message is up to you. Anything that can trigger an
HTTP request is fair game.

Messages are stateful and also stored on the server. If one client
marks a message as read, it is revoked from all other clients.

Notifier doesn't do much by itself--it's more of a utility or a
service that you build on top of and connect with other things.

## Use cases

Notifier is handy for reminders. Using cron and curl, schedule a
message to be sent every day at 6:00 AM reminding you to take your
daily vitamins.

It's also useful for reminders about upcoming events, such as an
upcoming dentist appointment. This could be cron-based as well, or it
could involve syncing with a calender.

With some additional programming effort, Notifier can be the place
where you get notifications of newly-arrived email. Or where you see
caller ID for an incoming phone call.

Each of these things can be accomplished in other ways. The benefit of
Notifer is having everything funnel into one location, and having
control over what gets sent as well as how it is sent. Plus the
ability to access your messages from any device with a web browser.



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
