#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

. scripts/vars.sh

rm -f server/public/*.html server/public/*.js server/public*.css

$BUN build ui/index.html ui/worker.ts --outdir server/public

APP_VERSION="$(date +'%Y.%m.%d')+$(git rev-parse --short=5 HEAD)"
echo "$APP_VERSION" > "$VERSION_FILE"

podman build -t notifier \
       --inherit-labels=false \
       --label=org.opencontainers.image.created="$(date --rfc-3339='seconds')" \
       --label=org.opencontainers.image.description="$(jq -r .description package.json)" \
       --label=org.opencontainers.image.revision="$(git rev-parse HEAD)" \
       --label=org.opencontainers.image.title="$(jq -r .name package.json)" \
       --label=org.opencontainers.image.url="$(jq -r .homepage package.json)" \
       --label=notifier.version="$APP_VERSION" \
       .

podman image prune -f
git checkout -q "$VERSION_FILE"
