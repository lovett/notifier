.PHONY: dummy

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
	npm run build:app
	./node_modules/.bin/uglifyjs -o build/public/app-minified.js build/public/app.js
	mv build/public/app-minified.js build/public/app.js

hooks: dummy
	cp hooks/* .git/hooks/

packages: export NPM_CONFIG_PROGRESS = false
packages:
	npm install -D --no-optional

worker: dummy
	npm run build:worker

server: dummy
	rm -rf build/server
	npm run build:server

migrate: dummy
	sqlite3 notifier.sqlite < migrations/01-message-drop-deliveredat.sql

onemessage: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t "onemessage" -e "5 hours" -p 0 -u "http://example.com" -l "onemessage"

pushbullet: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t "pushbullet test" -e "2 minutes" -u "http://example.com" -l "pushbullet-test"

smallbatch: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t "smallbatch" -b "message 1 of 4" -p 0 -u "http://example.com" -l "smallbatch-1"
	clients/send-notification -s $(NOTIFIER_DEV) -t "smallbatch" -b "message 2 of 4" -g "todo" -p 0 -u "http://example.com" -l "smallbatch-2"
	clients/send-notification -s $(NOTIFIER_DEV) -t "smallbatch" -b "message 3 of 4" -g "calendar" -p 0 -u "http://example.com" -l "smallbatch-3"
	clients/send-notification -s $(NOTIFIER_DEV) -t "smallbatch" -b "message 4 of 4" -g "email" -p 0 -u "http://example.com" -l "smallbatch-4"

retract: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -c -l test

resetdb: dummy
	rm notifier.sqlite
	touch server/server.ts

# "test:server": "mocha --bail --reporter min test",
# "test:client": "karma start app/test/karma.conf.js --single-run",
# "coverage:server": "istanbul cover --dir coverage/server _mocha -- -R min test",
# "coverage:client": "echo 'Nope. Client coverage is automatically written by test:client'",
