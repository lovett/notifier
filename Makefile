.PHONY: dummy

export PATH := ./node_modules/.bin:$(PATH)

build: export NPM_CONFIG_PROGRESS = false
build: packages app worker server
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

app: dummy
	webpack --config webpack-app.ts
	./node_modules/.bin/uglifyjs -o build/public/app-minified.js build/public/app.js
	mv build/public/app-minified.js build/public/app.js

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

packages: export NPM_CONFIG_PROGRESS = false
packages:
	npm install -D --no-optional

worker: dummy
	webpack --config webpack-worker.ts

server: dummy
	rm -rf build/server
	tsc -p server

tsserver: dummy
	rm -rf build/server
	tsc -p server -w

livereload:
	livereload build/public -p 35740 -d -u 1

migrate: dummy
	sqlite3 notifier.sqlite < migrations/01-message-drop-deliveredat.sql

onemessage: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t "Single test message" -e "5 hours" -p 0 -u "http://example.com" -l "onemessage"

badgemessage: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t "Badged message test" -g sysup -i "test.svg" -e "5 hours" -p 0 -u "http://example.com" -l "badged"

multimessage: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t "email group test message"		-g email		-b "Message 1"	-p 0	-l "multi-email"
	clients/send-notification -s $(NOTIFIER_DEV) -t "phone group test message"		-g phone		-b "Message 2"	-p 0	-l "multi-phone"
	clients/send-notification -s $(NOTIFIER_DEV) -t "web group test message"		-g web			-b "Message 3"	-p 0	-l "multi-web"
	clients/send-notification -s $(NOTIFIER_DEV) -t "reminder group test message"	-g reminder		-b "Message 4"	-p 0	-l "multi-reminder"
	clients/send-notification -s $(NOTIFIER_DEV) -t "calendar group test message"	-g calendar		-b "Message 5"	-p 0	-l "multi-calendar"
	clients/send-notification -s $(NOTIFIER_DEV) -t "sysdown group test message"	-g sysdown		-b "Message 6"	-p 0	-l "multi-sysdown"
	clients/send-notification -s $(NOTIFIER_DEV) -t "sysdown group test message"	-g sysdown		-b "Message 7"	-p 0	-l "multi-sysdown"
	clients/send-notification -s $(NOTIFIER_DEV) -t "sysup group test message"		-g sysup		-b "Message 8"	-p 0	-l "multi-sysup"
	clients/send-notification -s $(NOTIFIER_DEV) -t "chore group test message"		-g chore		-b "Message 9"	-p 0	-l "multi-chore"
	clients/send-notification -s $(NOTIFIER_DEV) -t "education group test message"	-g education	-b "Message 10"	-p 0	-l "multi-education"
	clients/send-notification -s $(NOTIFIER_DEV) -t "computer group test message"	-g computer	    -b "Message 11"	-p 0	-l "multi-computer"
	clients/send-notification -s $(NOTIFIER_DEV) -t "financial group test message"	-g financial    -b "Message 12"	-p 0	-l "multi-financial"
	clients/send-notification -s $(NOTIFIER_DEV) -t "custom badge test message"                     -b "Message 13" -p 0    -l "mult-badge" -i "test.svg"

retract: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -c -l test

resetdb: dummy
	rm notifier.sqlite
	touch server/server.ts

# "test:server": "mocha --bail --reporter min test",
# "test:client": "karma start app/test/karma.conf.js --single-run",
# "coverage:server": "istanbul cover --dir coverage/server _mocha -- -R min test",
# "coverage:client": "echo 'Nope. Client coverage is automatically written by test:client'",
