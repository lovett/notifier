.PHONY: ui server image deploy

MAKEFLAGS += --no-print-directory
DEV_URL := http://localhost:8080
MAIN := $(shell jq .main package.json)

export LOCAL_REGISTRY_AUTH_FILE=$(HOME)/.config/containers/auth.json
export REMOTE_REGISTRY_AUTH_FILE=/root/.config/containers/auth.json

setup:
	bun install

deploy:
	test -n "$(NOTIFIER_CONTAINER_REGISTRY)"  # Has NOTIFIER_CONTAINER_REGISTRY been set?
	test -n "$(NOTIFIER_DEPLOY_HOST)"  # Has NOTIFIER_DEPLOY_HOST been set?
	ssh -o "ControlPersist=15" -MNf $(NOTIFIER_DEPLOY_HOST)
	podman push --authfile=$(LOCAL_REGISTRY_AUTH_FILE) notifier:latest $(NOTIFIER_CONTAINER_REGISTRY)/notifier
	rsync -avz --rsync-path="sudo rsync" --chown=root:root systemd/ \
		$(NOTIFIER_DEPLOY_HOST):/etc/containers/systemd
	ssh $(NOTIFIER_DEPLOY_HOST) sudo podman pull --authfile=$(REMOTE_REGISTRY_AUTH_FILE) $(NOTIFIER_CONTAINER_REGISTRY)/notifier
	ssh $(NOTIFIER_DEPLOY_HOST) sudo systemctl daemon-reload
	ssh $(NOTIFIER_DEPLOY_HOST) sudo systemctl restart notifier
	ssh -O exit -q $(NOTIFIER_DEPLOY_HOST)

image: clean
	date +'%Y.%m.%d+' > server/public/version.txt
	truncate -s-1 server/public/version.txt
	git rev-parse --short=5 HEAD >> server/public/version.txt
	podman build -t notifier --inherit-labels=false \
	--label=org.opencontainers.image.created="$(shell date --rfc-3339='seconds')" \
	--label=org.opencontainers.image.description=$(shell jq .description package.json) \
	--label=org.opencontainers.image.revision=$(shell git rev-parse HEAD) \
	--label=org.opencontainers.image.title=$(shell jq .name package.json) \
	--label=org.opencontainers.image.url=$(shell jq .homepage package.json) \
	.
	podman image prune -f
	rm -f server/public/version.txt

build:
	bun build $(MAIN) ui/index.html ui/worker.ts --compile --target=bun-linux-x64-baseline --outfile notifier

clean:
	rm -rf server/public/*
	@$(MAKE) favicon

# This is here because bun doesn't otherwise see the favicon <link>
# tags in index.html. Handle it manually instead.
favicon:
	mkdir -p server/public
	cp ui/svg/notifier.svg server/public/notifier.svg

# Biome should be available on PATH. It isn't handled as a package dependency.
format:
	biome format --fix

ui: clean
	bun --watch build ui/index.html ui/worker.ts --outdir server/public

server: favicon
	bun --watch run $(MAIN)

# Recreate the dev database.
resetdb:
	dropdb -U postgres notifier_dev
	createdb -U postgres notifier_dev

# Local Variables:
# truncate-lines: t
# End:
