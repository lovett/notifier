#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

MAIN=$(jq -r .main package.json)

bun --watch run "$MAIN"
