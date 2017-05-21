#!/bin/sh

set -e
set -u
set -x

PATH=./node_modules/.bin:$PATH

export NPM_CONFIG_LOGLEVEL=error
export NPM_CONFIG_PROGRESS=false

ARTIFACT=notifier.tar.gz

npm install --no-optional

grunt --no-color build:full

if [ -f "$ARTIFACT" ]; then
    rm "$ARTIFACT"
fi

rsync -ar \
      --include='package.json' \
      --include='README.md' \
      --include='notifier.js' \
      --include='public/***' \
      --include='node_modules/***' \
      --include='modules/***' \
      --include='views/***' \
      --include='build.txt' \
      --exclude='***/.bin' \
      --exclude='***/test' \
      --exclude='***/tests' \
      --exclude='***/doc' \
      --exclude='***/docs' \
      --exclude='***/*.md' \
      --exclude='***/Makefile' \
      --exclude='***/CHANGES' \
      --exclude='***/AUTHORS' \
      --exclude='***/bower.json' \
      --exclude='***/*.ts' \
      --exclude='***/.coverage' \
      --exclude='***/.travis.yml' \
      --exclude='***/.eslintrc' \
      --exclude='***/.grunt' \
      --exclude='***/.sass-cache' \
      --exclude='***/.idea' \
      --exclude='***/docs-build' \
      --exclude='config-*.json' \
      --exclude='*' \
      --delete \
      --delete-excluded \
      . notifier

cd notifier

npm prune --production

cd ../

tar --create --gzip --file="$ARTIFACT" notifier
