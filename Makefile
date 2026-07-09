.PHONY: ui server image deploy

MAKEFLAGS += --no-print-directory
DEV_URL := http://localhost:8080
MAIN := $(shell jq .main package.json)

setup:
	bun install

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
