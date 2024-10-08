.PHONY: dummy

DEV_URL := http://localhost:8080
TMUX_SESSION_NAME := notifier
NPM_FILES := package.json package-lock.json

export PATH := ./node_modules/.bin:$(PATH)

# Reset the build directory to a pristine state.
clean: dummy
	rm -rf build

# Gather and compile the server and UI files in preparation for deployment.
build: dummy clean setup server ui
	cp $(NPM_FILES) build/
	cd build && npm ci --production
	cd build && rm $(NPM_FILES)

# Install git hook scripts.
hooks: dummy
	cp hooks/* .git/hooks/

# Install NPM packages quietly.
setup:
	DISABLE_OPENCOLLECTIVE=1 npm install

# Launch a server that restarts when files are modified.
dev-server: dummy
	find server -type f | entr -c -r -s 'make server && node --trace-warnings build/server.js'

# Watch for changes to the UI and recompile.
dev-ui: dummy
	find ui worker -type f | entr -c make ui

# Compile the backend.
server: dummy
	@echo Building Server
	esbuild --bundle \
		--outdir=build \
		--platform=node \
		--external:pg-native \
		--external:nconf \
		--external:express \
		--external:request \
		--external:yamlparser \
		--external:pg-cloudflare \
		server/server.ts
	cp -r server/schema build/

# Compile the frontend.
ui: dummy
	@echo Building UI
	esbuild --bundle --minify --target=es2019 --outdir=build/public ui/index.ts
	esbuild --bundle --minify --target=es2019 --outdir=build/public worker/worker.ts
	cp ui/index.html build/public/
	mkdir -p build/public/svg
	cp -r ui/svg/*.svg build/public/svg
	lessc ui/less/app.less build/public/app.css

# Send a single test message in normal mode
onemessage:
	curl -u notifier:notifier -d "title=Single test message, normal mode" -d "expiresAt=10 minutes" -d "url=http://example.com" -d "localId=onemessage" $(DEV_URL)/message

# Send a single test message in whisper mode.
onemessage-whisper:
	curl -u notifier:notifier -d "deliveryStyle=whisper" -d "title=Single test message, whisper mode" -d "expiresAt=10 minutes" -d "url=http://example.com" -d "localId=onemessage" $(DEV_URL)/message

# Retract a previously-sent test message.
onemessage-retract:
	curl -u notifier:notifier -d "localId=onemessage" $(DEV_URL)/message/clear

# Send a test message with a custom badge.
badgemessage:
	curl -u notifier:notifier -d "title=custom badge test message" -d "body=Custom message" -d "localId=badgemessage" -d "badge=test.svg"  $(DEV_URL)/message

# Send a batch of messages.
multimessage:
	curl -u notifier:notifier -d "title=email group test message"     -d "group=email"     -d "body=Message 1"  -d "localId=multi-email"     $(DEV_URL)/message
	curl -u notifier:notifier -d "title=web group test message"       -d "group=web"       -d "body=Message 2"  -d "localId=multi-web"       $(DEV_URL)/message
	curl -u notifier:notifier -d "title=reminder group test message"  -d "group=reminder"  -d "body=Message 3"  -d "localId=multi-reminder"  $(DEV_URL)/message
	curl -u notifier:notifier -d "title=calendar group test message"  -d "group=calendar"  -d "body=Message 4"  -d "localId=multi-calendar"  $(DEV_URL)/message
	curl -u notifier:notifier -d "title=sysdown group test message"   -d "group=sysdown"   -d "body=Message 5"  -d "localId=multi-sysdown"   $(DEV_URL)/message
	curl -u notifier:notifier -d "title=sysup group test message"     -d "group=sysup"     -d "body=Message 6"  -d "localId=multi-sysup"     $(DEV_URL)/message
	curl -u notifier:notifier -d "title=chore group test message"     -d "group=chore"     -d "body=Message 7"  -d "localId=multi-chore"     $(DEV_URL)/message
	curl -u notifier:notifier -d "title=computer group test message"  -d "group=computer"  -d "body=Message 8"  -d "localId=multi-computer"  $(DEV_URL)/message
	curl -u notifier:notifier -d "title=financial group test message" -d "group=financial" -d "body=Message 9"  -d "localId=multi-financial" $(DEV_URL)/message
	curl -u notifier:notifier -d "title=timer group test message"     -d "group=timer"     -d "body=Message 10" -d "localId=multi-timer"     $(DEV_URL)/message
	curl -u notifier:notifier -d "title=warning group test message"   -d "group=warning"   -d "body=Message 11" -d "localId=multi-warning"   $(DEV_URL)/message
	curl -u notifier:notifier -d "title=weather group test message"   -d "group=weather"   -d "body=Message 12" -d "localId=multi-weather"   $(DEV_URL)/message

# Automation for setting up a tmux session.
workspace:
## 0: Editor
	tmux new-session -d -s "$(TMUX_SESSION_NAME)" "$$SHELL"
	tmux send-keys -t "$(TMUX_SESSION_NAME)" "$(EDITOR) ." C-m

## 1: Shell
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" "$$SHELL"

## 2: UI
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "dev-ui" "make dev-ui"

## 3: Server
	tmux new-window -a -t "$(TMUX_SESSION_NAME)" -n "dev-server" "make dev-server"

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

# Push the repository to GitHub.
mirror:
	git push --force git@github.com:lovett/notifier.git master:master

# Local Variables:
# truncate-lines: t
# End:
