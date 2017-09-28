.PHONY: dummy

build: app worker

app: dummy
	npm run build:app

hooks: dummy
	cp hooks/* .git/hooks/

worker: dummy
	npm run build:worker

onemessage: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -t test -e "5 hours" -u "http://example.com" -l "onemessage-test"

retract: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -c -l test

resetdb: dummy
	rm notifier.sqlite
	touch server/server.ts

# "test:server": "mocha --bail --reporter min test",
# "test:client": "karma start app/test/karma.conf.js --single-run",
# "coverage:server": "istanbul cover --dir coverage/server _mocha -- -R min test",
# "coverage:client": "echo 'Nope. Client coverage is automatically written by test:client'",
