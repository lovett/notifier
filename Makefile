.PHONY: dummy

DEV_URL := http://localhost:8080
TMUX_SESSION_NAME := notifier

export PATH := ./node_modules/.bin:$(PATH)

# Gather and compile the server and UI files in preparation for deployment.
build: dummy setup
	rm -rf build
	tsc -p server --outDir build
	parcel build --out-dir build/public --no-source-maps --log-level=1 ui/index.html
	cp -r server/schema build/
	cp package.json package-lock.json .npmrc build/
	cd build && npm ci --production
	cd build && rm package.json package-lock.json .npmrc

# Install git hook scripts.
hooks: dummy
	cp hooks/* .git/hooks/

# Install NPM packages quietly.
setup:
	DISABLE_OPENCOLLECTIVE=1 npm install

# Start a server instance for development.
backend-server:
	ls build/***.js | entr -r node build/server.js

backend-tsc:
	tsc -p server --watch

# Build front-end assets for the browser UI.
ui: dummy
	parcel watch ui/index.html --out-dir build/public --no-hmr

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
badgemessage: .cookiejar
	curl -b .cookiejar -d "title=custom badge test message" -d "body=Custom message" -d "localId=badgemessage" -d "badge=test.svg"  $(DEV_URL)/message

# Send a batch of messages.
multimessage:
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

# Automation for setting up a tmux session.
workspace:
## 0: Editor
	tmux new-session -d -s "$(TMUX_SESSION_NAME)" "$$SHELL"
	tmux send-keys -t "$(TMUX_SESSION_NAME)" "$(EDITOR) ." C-m

## 1: Shell
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" "$$SHELL"

## 2: UI
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "ui" "make ui"

## 3: Dev server
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "backend-server" "make backend-server"

## 4: TSC
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "backend-tsc" "make backend-tsc"

## Activate
	tmux select-window -t "$(TMUX_SESSION_NAME)":0
	tmux attach-session -t "$(TMUX_SESSION_NAME)"

# Install the application on the production host via Ansible.
install: build
	ansible-playbook ansible/install.yml

# Lint the source files for the server.
lint-server:
	tsc --noEmit -p server
	eslint --max-warnings=0 --ext=.ts server

# Lint the source files for the browser UI.
lint-ui:
	tsc --noEmit -p ui
	eslint --max-warnings=0 --ext=.ts ui

# Lint the source files for the UI web worker.
lint-worker:
	tsc --noEmit -p worker
	eslint --max-warnings=0 --ext=.ts worker

# Lint everything.
lint: lint-ui lint-server lint-worker

# Recreate the dev database.
resetdb:
	dropdb -U postgres notifier_dev
	createdb -U postgres notifier_dev
	rm -f .cookiejar

# Push the repository to GitHub.
mirror:
	git push --force git@github.com:lovett/notifier.git master:master

# Local Variables:
# truncate-lines: t
# End:
