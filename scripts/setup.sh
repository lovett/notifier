#!/usr/bin/env sh

set -eu

. "$(dirname "$0")/vars.sh"

cd "$(dirname "$0")/../"

BIOME_IMAGE="ghcr.io/biomejs/biome"
BUN_IMAGE="docker.io/oven/bun:alpine"

if ! podman image exists "$BUN_IMAGE"; then
    echo "Pulling $BUN_IMAGE"
    podman pull -q "$BUN_IMAGE"
fi

if ! podman image exists "$BIOME_IMAGE"; then
    echo "Pulling $BIOME_IMAGE"
    podman pull -q "$BIOME_IMAGE"
fi

$BUN install
