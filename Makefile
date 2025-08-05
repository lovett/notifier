.PHONY: ui server image

MAKEFLAGS += --no-print-directory
DEV_URL := http://localhost:8080
TMUX_SESSION_NAME := notifier

setup:
	bun install

image:
	podman build -t notifier .
	podman image prune -f
build:
	bun build server/server.ts ui/index.html ui/worker.ts --compile --target=bun-linux-x64-baseline --outfile notifier

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

ui:
	bun --watch build ui/index.html ui/worker.ts --outdir server/public

server: favicon
	bun --watch run server/server.ts

# Send a test message in normal mode
onemessage:
	@curl -u notifier:notifier -d "title=Single test message, normal mode" -d "url=http://example.com" -d "localId=onemessage" $(DEV_URL)/message

# Send a test message in whisper mode.
onemessage-whisper:
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=Single test message, whisper mode" -d "expiresAt=10 minutes" -d "url=http://example.com" -d "localId=onemessage" $(DEV_URL)/message

# Retract a previously-sent test message.
onemessage-retract:
	@curl -u notifier:notifier -d "localId=onemessage" $(DEV_URL)/message/clear

# Send a test message with an expiration
onemessage-expiring:
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=Expiring message" -d "expiresAt=10 minutes" -d "url=http://example.com" $(DEV_URL)/message

# Send a test message with a custom badge.
badgemessage:
	@curl -u notifier:notifier -d "title=custom badge test message" -d "body=Custom message" -d "localId=badgemessage" -d "badge=test.svg"  $(DEV_URL)/message

# Send a batch of messages.
multimessage:
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=email group test message"     -d "group=email"     -d "body=Message 1"  -d "localId=multi-email"     $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=web group test message"       -d "group=web"       -d "body=Message 2"  -d "localId=multi-web"       $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=reminder group test message"  -d "group=reminder"  -d "body=Message 3"  -d "localId=multi-reminder"  $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=calendar group test message"  -d "group=calendar"  -d "body=Message 4"  -d "localId=multi-calendar"  $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=sysdown group test message"   -d "group=sysdown"   -d "body=Message 5"  -d "localId=multi-sysdown"   $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=sysup group test message"     -d "group=sysup"     -d "body=Message 6"  -d "localId=multi-sysup"     $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=chore group test message"     -d "group=chore"     -d "body=Message 7"  -d "localId=multi-chore"     $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=computer group test message"  -d "group=computer"  -d "body=Message 8"  -d "localId=multi-computer"  $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=financial group test message" -d "group=financial" -d "body=Message 9"  -d "localId=multi-financial" $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=timer group test message"     -d "group=timer"     -d "body=Message 10" -d "localId=multi-timer"     $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=warning group test message"   -d "group=warning"   -d "body=Message 11" -d "localId=multi-warning"   $(DEV_URL)/message
	@curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=weather group test message"   -d "group=weather"   -d "body=Message 12" -d "localId=multi-weather"   $(DEV_URL)/message

# Automation for setting up a tmux session.
workspace:
## 0: Editor
	tmux new-session -d -s "$(TMUX_SESSION_NAME)" "$$SHELL"
	tmux send-keys -t "$(TMUX_SESSION_NAME)" "$(EDITOR) ." C-m

## 1: Shell
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" "$$SHELL"

## 2: UI
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "ui" "make ui"

## 3: Server
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "server" "make server"

## Activate
	tmux select-window -t "$(TMUX_SESSION_NAME)":0
	tmux attach-session -t "$(TMUX_SESSION_NAME)"

# Install the application on the production host via Ansible.
install: build
	ansible-playbook ansible/install.yml

# Lint server files only.
lint-server:
	biome lint server
	bun x tsc --noEmit --project server

# Lint ui files only.
lint-ui:
	biome lint ui
	bun x tsc --noEmit --project ui

# Lint everything.
lint: lint-ui lint-server

# Recreate the dev database.
resetdb:
	dropdb -U postgres notifier_dev
	createdb -U postgres notifier_dev

# Push the repository to GitHub.
mirror:
	git push --force git@github.com:lovett/notifier.git master:master

# Local Variables:
# truncate-lines: t
# End:
