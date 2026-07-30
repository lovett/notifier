#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

. scripts/vars.sh

if ! podman image exists "$BUN_IMAGE"; then
    echo "Pulling $BUN_IMAGE"
    podman pull -q "$BUN_IMAGE"
fi

if ! podman image exists "$BIOME_IMAGE"; then
    echo "Pulling $BIOME_IMAGE"
    podman pull -q "$BIOME_IMAGE"
fi

$BUN install
