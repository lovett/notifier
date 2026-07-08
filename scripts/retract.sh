#!/usr/bin/env sh

set -eu

curl -q -u notifier:notifier \
     -d "localId=onemessage" \
     "http://localhost:8080/message/clear"
