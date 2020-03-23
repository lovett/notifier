# Notifier

Notifier is a web service for sending yourself notifications.

It provides an HTTP endpoint you can send messages to, a browser-based
interface for viewing them, and a hook point for relaying to other
services.

Unlike OS- or app-based notifications, Notifier is free-form and
standalone. You control when a notification is sent, what it says, and
how it looks.

## What it's made of

The browser UI uses Mithril.

Message delivery to the browser is done with server-sent events.

The server uses Express and a PostgresSQL database.

The browser UI and the server are both written in Typescript.

## Attribution

This project uses icons from the [Typicons](http://typicons.com) library.
