.PHONY: dummy

DEV_URL := http://localhost:8080/notifier

export PATH := ./node_modules/.bin:$(PATH)

build: export NPM_CONFIG_PROGRESS = false
build: export NODE_ENV = production
build: setup app worker server
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
	--include='build/***' \
	--include='migrations/***' \
	--exclude='*' \
	--delete \
	--delete-excluded \
	. notifier
	cd notifier; npm prune --production
	rm -f "notifier.tar.gz"
	tar --create --gzip --file="notifier.tar.gz" notifier

#
# Build the browser UI via webpack.
#
# When this target is invoked directly, webpack will run in
# development mode resulting in a long-running process that triggers a
# rebuild whenever a file in the app directory is modified.
#
# When invoked as a dependency of the build target, webpack will run
# in production mode based on the NODE_ENV environment.
#
# Extra care is taken to clean up previous webpack instances via
# pkill. Instances created within a Tmux workspace may not die depending
# on how the workspace is terminated.
#
# The same approach is used in the worker target.
#
app: dummy
	pkill -f "[w]ebpack --config webpack-app.ts" || true
	webpack --config webpack-app.ts

hooks: dummy
	cp hooks/* .git/hooks/

#
# Check for outdated NPM packages
#
# Uses "or true" after the npm command to prevent a non-zero exit code
# from producing a warning. Non-zero exit here is not an indicator of
# badness.
#
outdated: dummy
	npm outdated || true

setup: export NPM_CONFIG_PROGRESS = false
setup: export NODE_ENV=dev
setup:
	npm install --no-optional

#
# Build the web worker portion of the UI via webpack.
#
# When this target is invoked directly, webpack will run in
# development mode resulting in a long-running process that triggers a
# rebuild whenever a file in the worker directory is modified.
#
# When invoked as a dependency of the build target, webpack will run
# in production mode based on the NODE_ENV environment.
#
# Extra care is taken to clean up previous webpack instances via
# pkill. Instances created within a Tmux workspace may not die depending
# on how the workspace is terminated.
#
# The same approach is used in the app target.
#
worker: dummy
	pkill -f "[w]ebpack --config webpack-worker.ts" || true
	webpack --config webpack-worker.ts

server: dummy
	rm -rf build/server
	tsc -p server

tsserver: dummy
	rm -rf build/server
	tsc -p server -w

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

#
# Create a package upgrade commit.
#
# "puc" stands for Package Upgrade Commit
#
puc: dummy
	git checkout master
	git add package.json package-lock.json
	git commit -m "Upgrade npm packages"

# Automation for merging changes from the master branch into the
# production branch.
#
master-to-production: dummy
	git checkout master
	git push
	git checkout production
	git merge master
	git push
	git checkout master


# Leftovers from an earlier setup.
# "test:server": "mocha --bail --reporter min test",
# "coverage:server": "istanbul cover --dir coverage/server _mocha -- -R min test",
