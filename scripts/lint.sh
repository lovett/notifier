#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

BIOME_IMAGE="ghcr.io/biomejs/biome"
BUN_IMAGE="docker.io/oven/bun:alpine"

if ! podman image exists "$BIOME_IMAGE"; then
    echo "Pulling $BIOME_IMAGE"
    podman pull -q "$BIOME_IMAGE"
fi

if ! podman image exists "$BUN_IMAGE"; then
    echo "Pulling $BUN_IMAGE"
    podman pull -q "$BUN_IMAGE"
fi

BIOME="podman run --rm -it -v $PWD:/app:Z -w /app $BIOME_IMAGE"
BUN="podman run --rm -v $PWD:/app:Z -w /app $BUN_IMAGE bun"

lint_server() {
    echo "Running biome..."
	$BIOME lint server

    echo ""

    echo "Running tsc..."
    $BUN x tsc --noEmit --project server
}

lint_ui() {
    echo "Running biome..."
    $BIOME lint ui

    echo ""

    echo "Running tsc..."
    $BUN x tsc --noEmit --project ui
}

case "${1:-}" in
    server)
        lint_server
        ;;
    ui)
        lint_ui
        ;;
    *)
        lint_server
        lint_ui
        ;;
esac
