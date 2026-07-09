#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

rm -f *.html *.js *.css
bun --watch build ui/index.html ui/worker.ts --outdir server/public
