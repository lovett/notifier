#!/usr/bin/env sh

set -eu

do_curl() {
    for group in "$@"; do
        curl -q -u notifier:notifier \
             -d "deliveryStyle=whisper" \
             -d "group=$group" \
             -d "localId=multi-$group" \
             -d "title=$group group test message" \
             -d "body=Body for $group group" \
             "http://localhost:8080/message"
    done
}

do_curl email web reminder calendar sysdown sysup chore computer financial timer warning weather
