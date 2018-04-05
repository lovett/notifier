#!/bin/bash

set -e
set -u

PROJECT_ROOT=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_ROOT")

LOG=notifier.log

# Start the server if not already running
tmux start-server 2> /dev/null

# Connect to a session or create a new one
tmux attach-session -d -t "$PROJECT_NAME" || {
    echo "Creating a new session"

    ## 0: Editor
    tmux new-session -d -s "$PROJECT_NAME" bash
    tmux send-keys -t "$PROJECT_NAME" "$EDITOR $PROJECT_ROOT" C-m

    ## 1: Shell
    tmux new-window -a -t "$PROJECT_NAME" bash

    ## 2: Webpack, app
    tmux new-window -a -t "$PROJECT_NAME" -n "app" "NODE_ENV=dev make app"

    ## 3: Webpack, worker
    tmux new-window -a -t "$PROJECT_NAME" -n "worker" "NODE_ENV=dev make worker"

    ## 4: Typescript server
    tmux new-window -a -t "$PROJECT_NAME" -n "tsserver" "NODE_ENV=dev make tsserver"

    ## 5: Live reload
    tmux new-window -a -t "$PROJECT_NAME" -n "livereload" "node_modules/.bin/livereload build/public -p 35740 -d -u 1"

    ## 6: Dev server
    tmux new-window -a -t "$PROJECT_NAME" -n "devserver" "node_modules/.bin/nodemon --signal SIGHUP server"

    tmux select-window -t "$PROJECT_NAME":0

    tmux attach-session -t "$PROJECT_NAME"
}
