.PHONY: dummy

all: app worker

app: dummy
	NODE_ENV=$(BUILD) npx webpack --config webpack-app.ts

appdev: BUILD=dev
appdev: app

devserver: dummy
	NODE_ENV=dev npx nodemon server

onemessage: dummy
	clients/send-notification -s $(NOTIFIER_DEV) -p 0 -t test -e "5 hours" -u "http://example.com"

livereload: dummy
	npx livereload public -p 35740 -d -u 1

worker: dummy
	NODE_ENV=$(BUILD) npx webpack --config webpack-worker.ts

workerdev: BUILD=dev
workerdev: worker
