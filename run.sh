#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"

if command -v uv >/dev/null 2>&1; then
  exec uv run --python 3 server.py
fi

if command -v python3 >/dev/null 2>&1; then
  exec python3 server.py
fi

printf '%s\n' 'Khacha Company needs uv or python3 to run.' >&2
exit 1
