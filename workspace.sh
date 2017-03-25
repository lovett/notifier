#!/bin/bash

set -e
set -u

PROJECT_ROOT=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_ROOT")

STARTPAGE="."

LOG=notifier.log

# Start the server if not already running
tmux start-server 2> /dev/null

# Connect to a session or create a new one
tmux attach-session -d -t "$PROJECT_NAME" || {
    echo "Creating a new session"

    ## 0: Editor
    tmux new-session -d -s "$PROJECT_NAME" bash
    tmux send-keys -t "$PROJECT_NAME" "$EDITOR $STARTPAGE" C-m

    ## 1: Shell
    tmux new-window -a -t "$PROJECT_NAME" bash

    ## 2: Grunt
    tmux new-window -a -t "$PROJECT_NAME" -n "grunt" "NODE_ENV=development ./node_modules/.bin/grunt"

    ## 3: Log
    rm -f "$LOG"
    touch "$LOG"
    tmux new-window -a -n "log" -t "$PROJECT" "npm run-script logtail:dev"

    ## 4: Dev server
    tmux new-window -a -t "$PROJECT_NAME" -n "devserver" "npm run-script devserver"

    tmux select-window -t "$PROJECT_NAME":0

    tmux attach-session -t "$PROJECT_NAME"
}
