#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

VERSION_FILE="server/public/version.txt"

rm -f server/public/*.html server/public/*.js server/public*.css

bun build ui/index.html ui/worker.ts --outdir server/public

date +'%Y.%m.%d+' > "$VERSION_FILE"
truncate -s-1 "$VERSION_FILE"
git rev-parse --short=5 HEAD >> "$VERSION_FILE"

podman build -t notifier \
       --inherit-labels=false \
	   --label=org.opencontainers.image.created="$(date --rfc-3339='seconds')" \
	   --label=org.opencontainers.image.description="$(jq .description package.json)" \
	   --label=org.opencontainers.image.revision="$(git rev-parse HEAD)" \
	   --label=org.opencontainers.image.title="$(jq .name package.json)" \
	   --label=org.opencontainers.image.url="$(jq .homepage package.json)" \
	   .

podman image prune -f
git checkout -q "$VERSION_FILE"
