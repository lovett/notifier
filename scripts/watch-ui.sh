#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

PUBLIC="server/public"

find "$PUBLIC" -type f \( -name "*.css" -o -name "*.js" -o -name "*.html" \) -exec rm {} +

bun --watch build ui/index.html ui/worker.ts --outdir "$PUBLIC"
