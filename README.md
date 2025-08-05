# Notifier
A web service for sending yourself notifications.

It provides:
  - an HTTP endpoint you can send messages to
  - a browser-based interface for viewing them
  - a webhook option for relaying messages to another service

Unlike OS or in-app notifications, Notifier is a standalone service
geared toward self-hosted use.

## Container
The application can run as a Podman or Docker container. To build the
image, run `make image`.

## Configuration
The server is configured through a small collection of environment
variables.

`NOTIFIER_BADGE_BASE_URL`: Where to find custom message
badges. A message with a custom badge only specifies the
filename. This value provides the rest. Message badges are only
loaded from one location. Default: `/svg`.

`NOTIFIER_BASE_URL`: The root URL path of the application. Default: `/`.

`NOTIFIER_DB_DSN`: The connection string for the Postgres database.
Default: `socket://notifier@/var/run/postgresql?db=notifier`.

`NOTIFIER_FORCE_HTTPS`: Whether HTTPs is required. Default: `0`.

`NOTIFIER_HTTP_PORT`: The port the server should listen on.
Default: `8080`.

`NOTIFIER_PUBLIC_DIR`: The filesystem path of the public directory.
Default: `./public`.

`NOTIFIER_TRUSTED_IPS`: A comma-separated list of IP addresses or
subnets that are allowed to send messages without providing a
username/password pair. They can instead use the username as the
password for Basic Auth. This is meant for server scripts that would
be inconvenienced by token expiration. Addresses are matched by string
prefix, so `192.168.0` covers that entire subnet.  Default:
`127.0.0.1`.


## Database setup

Postgres is currently the only supported database.

Using the default value for `NOTIFIER_DB_DSN` described above,
database creation would look something like:

```
sudo -u postgres createuser --pwprompt notifier
sudo -u postgres createdb -O notifier notifier
```

The database schema should be manually populated using the files in
the schema directory, applied sequentially:

```
psql -U notifier notifier -f schema/00-base-schema.sql
```

In order for database authentication to succeed, the Postgres
`pg_hba.conf` should have a setup like this:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    all             all             127.0.0.1/32            ident

# IPv4 local connections:
host    notifier        notifier        127.0.0.1/32            md5
```

The second "host" line is what the application will use. The first one
is convenient for command-line or other access.

Other approaches are possible, but these are reasonable starting points.


## User setup

To add a user, run:

```
node server.js adduser myusername mypassword
```


## Message Schema

The endpoint for sending messages to a Notifier is `/message`. It
accepts POST requests with the following fields, all of which are
optional except for title:

**body**: A short blurb. A supplement to the title field.

**deliveryStyle**: If _whisper_, the server should accept and display
the message but not send webhooks or in-browser notifications.

**expiresAt**: The lifetime of the message specified in relative units
(such as "1 hour" or "45 minutes") from the time it is received. The
server will clear the message automatically when the expiration is
reached.

**badge**: The filename of a image to use as the message icon.  This
file should be available under the base URL defined in
`NOTIFIER_BADGE_BASE_URL`.

**group**: A keyword used to color-coordinate related
messages. Notifier has built-in styling for the following values:
computer, email, web, reminder, calendar, sysdown, sysup,
chore, financial, timer.

**localId**: A semi-unique identifier. Multiple messages can share the
same localId to allow newer ones to replace older ones (for example, a
timer that sends one message when it starts and another when it
finishes).

**title**: The purpose of the message. Similar to the subject line of
an email. This field is required.

**url**: An offsite link. When set, the notification is clickable.

## What it's made of

The browser UI uses Mithril.

Message delivery to the browser is done with server-sent events.

The server uses Express.

Both the browser UI and server are both written in Typescript.


## Attribution

This project uses icons from [Bootstrap](https://github.com/twbs/icons).
