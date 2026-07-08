#!/usr/bin/env sh

set -eu

curl -q -u notifier:notifier \
     -d "deliveryStyle=whisper" \
     -d "localId=onemessage" \
     -d "title=Test message" \
     -d "url=http://example.com" \
     -d "expiresAt=10 minutes" \
     "http://localhost:8080/message"
