#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/Backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
NODE_LOCAL_BIN="/home/slyvr/.local/node-v22.14.0-linux-arm64/bin"

BACKEND_HOST="127.0.0.1"
BACKEND_PORT="8000"
FRONTEND_HOST="127.0.0.1"
FRONTEND_PORT="5173"

BACKEND_PID=""
FRONTEND_PID=""
CLEANED=0

die() {
  echo "error: $*" >&2
  exit 1
}

ensure_node() {
  if [[ -d "$NODE_LOCAL_BIN" ]]; then
    export PATH="$NODE_LOCAL_BIN:$PATH"
  fi
  command -v node >/dev/null 2>&1 || die "node not found (expected user-local Node at $NODE_LOCAL_BIN or on PATH)"
  command -v npm >/dev/null 2>&1 || die "npm not found"
}

check_prereqs() {
  [[ -d "$BACKEND_DIR" ]] || die "missing Backend directory at $BACKEND_DIR"
  [[ -d "$FRONTEND_DIR" ]] || die "missing frontend directory at $FRONTEND_DIR"
  [[ -x "$BACKEND_DIR/venv/bin/uvicorn" ]] || die "missing Backend/venv (create it and pip install -r Backend/requirements.txt)"
  [[ -d "$FRONTEND_DIR/node_modules" ]] || die "missing frontend/node_modules (run npm ci in frontend/)"
  ensure_node
}

port_listening() {
  local port="$1"
  if ss -ltn 2>/dev/null | grep -Fq ":${port} "; then
    return 0
  fi
  return 1
}

check_ports_free() {
  if port_listening "$BACKEND_PORT"; then
    die "port $BACKEND_PORT is already in use (stop the existing process first)"
  fi
  if port_listening "$FRONTEND_PORT"; then
    die "port $FRONTEND_PORT is already in use (stop the existing process first)"
  fi
}

kill_process_tree() {
  local pid="$1"
  [[ -z "$pid" ]] && return 0
  if ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  local child
  while IFS= read -r child; do
    [[ -n "$child" ]] && kill_process_tree "$child"
  done < <(pgrep -P "$pid" 2>/dev/null || true)
  kill -TERM "$pid" 2>/dev/null || true
  sleep 0.2
  kill -KILL "$pid" 2>/dev/null || true
}

cleanup() {
  [[ "$CLEANED" == 1 ]] && return 0
  CLEANED=1
  trap - INT TERM EXIT
  if [[ -n "$FRONTEND_PID" ]]; then
    kill -INT "$FRONTEND_PID" 2>/dev/null || true
    kill_process_tree "$FRONTEND_PID"
  fi
  if [[ -n "$BACKEND_PID" ]]; then
    kill -INT "$BACKEND_PID" 2>/dev/null || true
    kill_process_tree "$BACKEND_PID"
  fi
  wait 2>/dev/null || true
}

shutdown() {
  echo
  echo "Stopping Slyvr dev servers..."
  cleanup
  exit 0
}

trap shutdown INT TERM
trap cleanup EXIT

main() {
  check_prereqs
  check_ports_free

  echo "Slyvr local development (repo: $REPO_ROOT)"
  echo "  FastAPI: http://${BACKEND_HOST}:${BACKEND_PORT}"
  echo "  Vite:    http://${FRONTEND_HOST}:${FRONTEND_PORT}  (proxy /api -> backend)"
  echo "Press Ctrl+C to stop."
  echo

  (
    cd "$BACKEND_DIR"
    exec ./venv/bin/uvicorn main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload
  ) &
  BACKEND_PID=$!

  (
    cd "$FRONTEND_DIR"
    exec npm run dev
  ) &
  FRONTEND_PID=$!

  while kill -0 "$BACKEND_PID" 2>/dev/null || kill -0 "$FRONTEND_PID" 2>/dev/null; do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      die "backend exited unexpectedly"
    fi
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
      die "frontend exited unexpectedly"
    fi
    sleep 1
  done
}

main
