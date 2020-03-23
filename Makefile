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

# Check for outdated NPM packages
outdated: dummy
	npm outdated || true

# Install NPM packages quietly.
setup:
	DISABLE_OPENCOLLECTIVE=1 NODE_ENV=dev npm install

devserver: dummy
	ts-node-dev --respawn --transpileOnly server/server.ts

ui: dummy
	parcel watch ui/index.html --out-dir server/public --no-hmr

# Send a test message
#
onemessage: dummy
	clients/send-notification -s $(DEV_URL) -t "Single test message" -e "5 hours" -u "http://example.com" -l "onemessage"

# Retract a previously-sent test message
#
onemessage-retract: dummy
	clients/send-notification -s $(DEV_URL) -c -l onemessage

badgemessage: dummy
	clients/send-notification -s $(DEV_URL) -t "Badged message test" -g sysup -i "test.svg" -e "5 hours" -u "http://example.com" -l "badged"

multimessage: dummy
	clients/send-notification -s $(DEV_URL) -t "email group test message"		-g email		-b "Message 1"	-l "multi-email"
	clients/send-notification -s $(DEV_URL) -t "phone group test message"		-g phone		-b "Message 2"	-l "multi-phone"
	clients/send-notification -s $(DEV_URL) -t "web group test message"		-g web			-b "Message 3"	-l "multi-web"
	clients/send-notification -s $(DEV_URL) -t "reminder group test message"	-g reminder		-b "Message 4"	-l "multi-reminder"
	clients/send-notification -s $(DEV_URL) -t "calendar group test message"	-g calendar		-b "Message 5"	-l "multi-calendar"
	clients/send-notification -s $(DEV_URL) -t "sysdown group test message"	-g sysdown		-b "Message 6"	-l "multi-sysdown"
	clients/send-notification -s $(DEV_URL) -t "sysdown group test message"	-g sysdown		-b "Message 7"	-l "multi-sysdown"
	clients/send-notification -s $(DEV_URL) -t "sysup group test message"		-g sysup		-b "Message 8"	-l "multi-sysup"
	clients/send-notification -s $(DEV_URL) -t "chore group test message"		-g chore		-b "Message 9"	-l "multi-chore"
	clients/send-notification -s $(DEV_URL) -t "education group test message"	-g education	-b "Message 10"	-l "multi-education"
	clients/send-notification -s $(DEV_URL) -t "computer group test message"	-g computer	    -b "Message 11"	-l "multi-computer"
	clients/send-notification -s $(DEV_URL) -t "financial group test message"	-g financial    -b "Message 12"	-l "multi-financial"
	clients/send-notification -s $(DEV_URL) -t "timer group test message"	    -g timer        -b "Message 13"	-l "multi-timer"
	clients/send-notification -s $(DEV_URL) -t "custom badge test message"                     -b "Message 14" -l "mult-badge" -i "test.svg"

# Create a package upgrade commit.
#
# "puc" stands for Package Upgrade Commit
#
puc: dummy
	git checkout master
	git add package.json package-lock.json
	git commit -m "Upgrade npm packages"

# Automation for setting up a tmux session
#
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

# Install the application on the production host via Ansible
#
install:
	ansible-playbook ansible/install.yml

lint-server:
	tsc --noEmit -p server

lint-ui:
	tsc --noEmit -p ui
