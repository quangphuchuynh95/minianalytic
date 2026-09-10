#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STORAGE_DIR="${STORAGE_DIR:-$SCRIPT_DIR/storage/v0}"
TABLE_NAME="${TABLE_NAME:-analytics_events_v0}"
CLICKHOUSE_CLIENT_BIN="${CLICKHOUSE_CLIENT_BIN:-clickhouse-client}"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env.local}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ ! -d "$STORAGE_DIR" ]]; then
  echo "Storage directory not found: $STORAGE_DIR" >&2
  exit 1
fi

run_clickhouse_insert() {
  local file="$1"
  local query="INSERT INTO ${TABLE_NAME} (time, session, user, ip, user_agent, type, page, payload) FORMAT TSV"
  local args=()

  if [[ -n "${CLICKHOUSE_HOST:-}" ]]; then
    args+=(--host "$CLICKHOUSE_HOST")
  fi

  if [[ -n "${CLICKHOUSE_PORT:-}" ]]; then
    args+=(--port "$CLICKHOUSE_PORT")
  fi

  if [[ -n "${CLICKHOUSE_USER:-}" ]]; then
    args+=(--user "$CLICKHOUSE_USER")
  fi

  if [[ -n "${CLICKHOUSE_PASSWORD:-}" ]]; then
    args+=(--password "$CLICKHOUSE_PASSWORD")
  fi

  "$CLICKHOUSE_CLIENT_BIN" "${args[@]}" --query "$query" < "$file"
}

ingest_one_file() {
  local file="$1"
  local claimed_file="$file"
  local done_file

  if [[ "$file" == *.tsv ]]; then
    claimed_file="${file}.tmp"

    if [[ -e "$claimed_file" ]]; then
      echo "Skip file, another process already claimed it: $claimed_file" >&2
      return 0
    fi

    mv "$file" "$claimed_file"
    echo "Claimed: $file -> $claimed_file"
  fi

  done_file="${claimed_file}.done"

  echo "Ingesting: $claimed_file"
  if run_clickhouse_insert "$claimed_file"; then
    mv "$claimed_file" "$done_file"
    echo "Ingested: $claimed_file -> $done_file"
  else
    mv "$claimed_file" "$file"
    echo "Insert failed, reverted file name" >&2
  fi
}

if [ "$#" -eq 0 ]; then
  find "$STORAGE_DIR" -type f -name '*.tsv' -a -cmin +60 -print0 | while IFS= read -r -d '' file; do
    ingest_one_file "$file"
  done
else
  for arg in "$@"
  do
    ingest_one_file "$arg"
  done
fi

