#!/usr/bin/env sh

# Automation for setting up a tmux session.

set -eu

cd "$(dirname "$0")/../"

TMUX_SESSION_NAME=notifier

# 0: Editor
tmux new-session -d -s "$TMUX_SESSION_NAME" "$SHELL"
tmux send-keys -t "$TMUX_SESSION_NAME" "$EDITOR ." C-m

# 1: Shell
tmux new-window -a -t "$TMUX_SESSION_NAME" "$SHELL"

# 2: UI
tmux new-window -a -t "$TMUX_SESSION_NAME" -n "ui" "scripts/watch-ui.sh"

# 3: Server
tmux new-window -a -t "$TMUX_SESSION_NAME" -n "server" "scripts/watch-server.sh"

# Activate
tmux select-window -t "$TMUX_SESSION_NAME":0
tmux attach-session -t "$TMUX_SESSION_NAME"
