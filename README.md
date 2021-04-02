# Notifier
Notifier is a web service for sending yourself notifications.

It provides an HTTP endpoint you can send messages to, a browser-based
interface for viewing them, and a hook point for relaying to other
services.

Unlike OS- or app-based notifications, Notifier is free-form and
standalone. You control when a notification is sent, what it says, and
how it looks.


## Configuration
The server's default configuration is reasonable for production use.
Changes to the defaults can be made with environment variables or a
JSON file. The JSON file can be loaded from several places:

  - `config-[NODE_ENV].json` in the application root
  - `config.json` in the application root
  - `/etc/notifier.json`

`NOTIFIER_BADGE_BASE_URL`: Where to find custom message
badges. A message with a custom badge only specifies the
filename. This value provides the rest. Message badges are only
loaded from one location.
Default: `/svg`.

`NOTIFIER_BASE_URL`: The URL path of the application. Default: `/`.

`NOTIFIER_DB_DSN`: The connection string for the Postgres database.
Default: `postgres://notifier:notifier@localhost:5432/notifier`.

`NOTIFIER_FORCE_HTTPS`: Whether HTTPs is required. Default: `0`.

`NOTIFIER_HTTP_IP`: The IP address the server should listen on.
Default: `127.0.0.1`.

`NOTIFIER_HTTP_PORT`: The port the server should listen on.
Default: `8080`.

`NOTIFIER_PUBLIC_DIR`: The filesystem path of the public directory.
Default: `./public`.

`NOTIFIER_DEFAULT_USER`: A user account to be created automatically.
Default: _not specified_.

`NOTIFIER_DEFAULT_USER_PASSWORD`: The password for the default user.
Default: _not specified_.

## Database setup

The application will create the database schema automatically at
startup. But the database itself must already exist.

Using the default value for `NOTIFIER_DB_DSN` described above:

```
createdb -U postgres notifier
```

If the configuration specifies a default user, it will similarly be
created automatically at server startup.

## What it's made of
The browser UI uses Mithril.

Message delivery to the browser is done with server-sent events.

The server uses Express and a PostgresSQL database.

The browser UI and the server are both written in Typescript.


## Attribution
This project uses icons from [Font Awesome](https://fontawesome.com/license/free)
under the Creative Commons Attribution 4.0 International license.
