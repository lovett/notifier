# Notifier
A web service for sending yourself notifications. Similar to OS or app-specific notification systems, but more agnostic.

It provides:
  - an HTTP endpoint for receiving messages
  - a browser UI for viewing them
  - relaying to another service via webhook


## Deployment
The application runs as a Podman container managed by systemd.

The container image is not hosted in a public registry. Build it
locally by running `make image`.

To bring the local image onto a remote host, create 2 environment variables:

  - `NOTIFIER_DEPLOY_HOST`: The host that will run the container.
  - `NOTIFIER_CONTAINER_REGISTRY`: The registry that will host the container image.

Now run `make deploy`. It will:

  - Push the image created by `make image` to `NOTIFIER_CONTAINER_REGISTRY`.
  - Rsync a Podman Quadlet service file to `NOTIFIER_DEPLOY_HOST` so
    that the application can be managed as a systemd service.
  - Pull the image onto `NOTIFIER_DEPLOY_HOST`
  - Start the container via systemd.

The `systemd/notifier.container` service references the file
`notifier.image`.  This file should be created manually at
`/etc/containers/systemd/notifier.image` on `NOTIFIER_DEPLOY_HOST`.
and have the following contents:

```
[Unit]
After=myregistry.container
Requires=myregistry.container

[Image]
Image=myregistry.example.com/notifier:latest
```

The Unit section can be omitted if the container registry runs on a
different host.


## Configuration
The server is configured through the following environment
variables. The systemd service sources them from the file
`/etc/notifier.vars`.

`NOTIFIER_BADGE_BASE_URL`: Where to find custom message
badges. Messages that specify a custom badge only list a
filename. This value provides the rest of the URL. Default: `/svg`.

`NOTIFIER_BASE_URL`: The root URL path of the application. Default: `/`.

`NOTIFIER_DB_DSN`: The connection string for the Postgres database.
Default: `socket://notifier@/var/run/postgresql?db=notifier`.

`NOTIFIER_HTTP_PORT`: The port the server should listen on.
Default: `8080`.

`NOTIFIER_PUBLIC_DIR`: The filesystem path of the public directory.
Default: `./public`.

`NOTIFIER_TRUSTED_IPS`: A comma-separated list of IP addresses or
subnets that are allowed to send messages without providing a
username/password pair. They can instead use the username for both
values. Addresses are matched by string prefix, so `192.168.0` covers
that entire subnet. The subnets `127.0.0` and `::1` are always
trusted.


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
host    sameuser        notifier        samenet                 trust
local   sameuser        notifier                                trust
```

For this to work, the `postgresql.conf` file should contain:

```
listen_addresses = '*'
```

Other approaches are possible, but this is a decent starting point.


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
  - [Mithril](https://mithril.js.org/)
  - [Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
  - [Express](https://expressjs.com/)
  - [Bun](https://bun.sh/)
  - [Typescript](https://www.typescriptlang.org/)


## Attribution

This project uses icons from [Bootstrap](https://github.com/twbs/icons).
