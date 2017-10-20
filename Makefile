.PHONY: dummy

build: app worker

app: dummy
	npm run build:app

hooks: dummy
	cp hooks/* .git/hooks/

worker: dummy
	npm run build:worker

migrate: dummy
	sqlite3 notifier.sqlite < migrations/01-message-drop-deliveredat.sql

onemessage: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t "onemessage" -e "5 hours" -p 0 -u "http://example.com" -l "onemessage"

smallbatch: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t "smallbatch" -b "message 1 of 2" -p 0 -u "http://example.com" -l "smallbatch-1"
	clients/send-notification -s $(NOTIFIER_DEV) -t "smallbatch" -b "message 2 of 2" -p 0 -u "http://example.com" -l "smallbatch-2"

retract: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -c -l test

resetdb: dummy
	rm notifier.sqlite
	touch server/server.ts

# "test:server": "mocha --bail --reporter min test",
# "test:client": "karma start app/test/karma.conf.js --single-run",
# "coverage:server": "istanbul cover --dir coverage/server _mocha -- -R min test",
# "coverage:client": "echo 'Nope. Client coverage is automatically written by test:client'",
