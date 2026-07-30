#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

. scripts/vars.sh

lint_server() {
    echo "Running biome on server files..."
	$BIOME lint server

    echo ""

    echo "Running tsc on server files..."
    $BUN x tsc --noEmit --project server
}

lint_ui() {
    echo "Running biome on ui files..."
    $BIOME lint ui

    echo ""

    echo "Running tsc on ui files..."
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
