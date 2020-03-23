.PHONY: dummy

DEV_URL := http://localhost:8080
TMUX_SESSION_NAME := notifier

export PATH := ./node_modules/.bin:$(PATH)

build: export NODE_ENV = production
build: setup
	rsync -ar \
	--exclude='***/.bin' \
	--exclude='***/test' \
	--exclude='***/tests' \
	--exclude='***/doc' \
	--exclude='***/docs' \
	--exclude='***/*.md' \
	--exclude='***/Makefile' \
	--exclude='***/CHANGES' \
	--exclude='***/AUTHORS' \
	--exclude='***/bower.json' \
	--exclude='***/*.ts' \
	--exclude='***/.coverage' \
	--exclude='***/.travis.yml' \
	--exclude='***/.eslintrc' \
	--exclude='***/.grunt' \
	--exclude='***/.sass-cache' \
	--exclude='***/.idea' \
	--exclude='***/docs-build' \
	--exclude='config-*.json' \
	--include='package.json' \
	--include='README.md' \
	--include='node_modules/***' \
	--include='migrations/***' \
	--exclude='*' \
	--delete \
	--delete-excluded \
	. notifier
	tsc -p server
	parcel build ui/index.html --out-dir notifier/public
	# cd notifier; npm prune --production
	# rm -f "notifier.tar.gz"
	# tar --create --gzip --file="notifier.tar.gz" notifier

hooks: dummy
	cp hooks/* .git/hooks/

# Check for outdated NPM packages.
outdated: dummy
	npm outdated || true

# Install NPM packages quietly.
setup:
	DISABLE_OPENCOLLECTIVE=1 NODE_ENV=dev npm install

# Start a server instance for development.
devserver: dummy
	ts-node-dev --respawn --transpileOnly server/server.ts

# Build front-end assets for the browser UI.
ui: dummy
	parcel watch ui/index.html --out-dir server/public --no-hmr

# Authenticate with the server as the default user.
.cookiejar:
	curl -c .cookiejar -d "username=notifier" -d "password=notifier" $(DEV_URL)/auth

# Send a single test message.
onemessage: .cookiejar
	curl -b .cookiejar -d "title=Single test message" -d "expiresAt=10 minutes" -d "url=http://example.com" -d "localId=onemessage" $(DEV_URL)/message

# Retract a previously-sent test message.
onemessage-retract: .cookiejar
	curl -b .cookiejar -d "localId=onemessage" $(DEV_URL)/message/clear

# Send a test message with a custom badge.
badgemessage: dummy
	curl -b .cookiejar -d "title=custom badge test message" -d "body=Custom message" -d "localId=badgemessage" -d "badge=test.svg"  $(DEV_URL)/message

# Send a batch of serveral messages.
multimessage: dummy
	curl -b .cookiejar -d "title=email group test message"     -d "group=email"     -d "body=Message 1"	 -d "localId=multi-email"     $(DEV_URL)/message
	curl -b .cookiejar -d "title=phone group test message"     -d "group=phone"     -d "body=Message 2"	 -d "localId=multi-phone"     $(DEV_URL)/message
	curl -b .cookiejar -d "title=web group test message"       -d "group=web"       -d "body=Message 3"	 -d "localId=multi-web"       $(DEV_URL)/message
	curl -b .cookiejar -d "title=reminder group test message"  -d "group=reminder"  -d "body=Message 4"	 -d "localId=multi-reminder"  $(DEV_URL)/message
	curl -b .cookiejar -d "title=calendar group test message"  -d "group=calendar"  -d "body=Message 5"	 -d "localId=multi-calendar"  $(DEV_URL)/message
	curl -b .cookiejar -d "title=sysdown group test message"   -d "group=sysdown"   -d "body=Message 6"	 -d "localId=multi-sysdown"   $(DEV_URL)/message
	curl -b .cookiejar -d "title=sysdown group test message"   -d "group=sysdown"   -d "body=Message 7"	 -d "localId=multi-sysdown"   $(DEV_URL)/message
	curl -b .cookiejar -d "title=sysup group test message"     -d "group=sysup"     -d "body=Message 8"	 -d "localId=multi-sysup"     $(DEV_URL)/message
	curl -b .cookiejar -d "title=chore group test message"     -d "group=chore"     -d "body=Message 9"	 -d "localId=multi-chore"     $(DEV_URL)/message
	curl -b .cookiejar -d "title=education group test message" -d "group=education" -d "body=Message 10" -d "localId=multi-education" $(DEV_URL)/message
	curl -b .cookiejar -d "title=computer group test message"  -d "group=computer"  -d "body=Message 11" -d "localId=multi-computer"  $(DEV_URL)/message
	curl -b .cookiejar -d "title=financial group test message" -d "group=financial" -d "body=Message 12" -d "localId=multi-financial" $(DEV_URL)/message
	curl -b .cookiejar -d "title=timer group test message"     -d "group=timer"     -d "body=Message 13" -d "localId=multi-timer"     $(DEV_URL)/message


# Create a package upgrade commit.
puc:
	git checkout master
	git add package.json package-lock.json
	git commit -m "Upgrade npm packages"

# Automation for setting up a tmux session.
workspace:
## 0: Editor
	tmux new-session -d -s "$(TMUX_SESSION_NAME)" bash
	tmux send-keys -t "$(TMUX_SESSION_NAME)" "$(EDITOR) ." C-m

## 1: Shell
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" bash

## 2: UI
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "ui" "make ui"

## 3: Dev server
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "server" "make devserver"

	tmux select-window -t "$(TMUX_SESSION_NAME)":0

	tmux attach-session -t "$(TMUX_SESSION_NAME)"

# Install the application on the production host via Ansible.
install:
	ansible-playbook ansible/install.yml

# Lint the source files for the server.
lint-server:
	tsc --noEmit -p server

# Lint the source files for the browser UI.
lint-ui:
	tsc --noEmit -p ui
