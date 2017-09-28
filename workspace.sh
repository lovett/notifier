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
    tmux new-window -a -t "$PROJECT_NAME" -n "app" "NODE_ENV=dev npm run build:app"

    ## 3: Webpack, worker
    tmux new-window -a -t "$PROJECT_NAME" -n "worker" "NODE_ENV=dev npm run build:worker"

    ## 4: Livereload
    tmux new-window -a -t "$PROJECT_NAME" -n "watch" "NODE_ENV=dev npm run watch"

    ## 5: Dev server
    tmux new-window -a -t "$PROJECT_NAME" -n "devserver" "npm run devserver"

    ## 6: Log
    rm -f "$LOG"
    touch "$LOG" 2> /dev/null
    tmux new-window -a -t "$PROJECT_NAME" -n "log" "tail -f $LOG"

    tmux select-window -t "$PROJECT_NAME":0

    tmux attach-session -t "$PROJECT_NAME"
}
