#!/usr/bin/env bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSPECTOR_PORT=${INSPECTOR_PORT:-9229}

node --inspect=$INSPECTOR_PORT $SCRIPT_DIR/profile-test-code &
TEST_CODE_PID=$!

INSPECTOR_PORT=$INSPECTOR_PORT node $SCRIPT_DIR

kill $TEST_CODE_PID
