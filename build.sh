#!/bin/sh

set -e
set -u
set -x

PATH=./node_modules/.bin:$PATH

export NPM_CONFIG_LOGLEVEL=error
export NPM_CONFIG_PROGRESS=false

npm install --no-optional

grunt --no-color build:full

npm prune --production

rsync -ar --include-from=rsync.conf --delete --delete-excluded . notifier

tar --create --gzip --file=notifier.tar.gz notifier
