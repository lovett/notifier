# Notifier

Notifier is a web service for reminders about important things. It's
similar to the notification systems built into desktop and mobile
operating systems, but more agnostic.

Notifier consists of a Node.js server that is meant to be
self-hosted. There is a browser-based UI that presents messages in
real-time. Everything happens over HTTP.

What constitutes a message is open-ended. Anything that can trigger an
HTTP request is fair game.

## What it's made of

The browser UI uses AngularJS and a web worker.

Message delivery to the browser UI is done with server-sent events.

The server uses Express and Sequelize against a PostgresSQL database.

Typescript is used for both the server and the browser UI.

## Attribution

This project uses icons from the [Typicons](http://typicons.com) library.
