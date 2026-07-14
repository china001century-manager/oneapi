#!/bin/sh
set -eu

export SQL_DSN="${SQL_DSN:-${DATABASE_URL:-}}"
export REDIS_CONN_STRING="${REDIS_CONN_STRING:-${REDIS_URL:-${KV_URL:-}}}"

if [ -z "$SQL_DSN" ]; then
  echo "DATABASE_URL or SQL_DSN is required" >&2
  exit 1
fi

if [ -z "$REDIS_CONN_STRING" ]; then
  echo "REDIS_URL, KV_URL, or REDIS_CONN_STRING is required" >&2
  exit 1
fi

exec /new-api
