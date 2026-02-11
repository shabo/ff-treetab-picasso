#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <env.yaml> <command> [args...]" >&2
  exit 1
fi

env_file="$1"
shift

if [[ -f "$env_file" ]]; then
  while IFS= read -r raw || [[ -n "$raw" ]]; do
    line="$(printf '%s' "$raw" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"

    if [[ -z "$line" || "$line" == \#* ]]; then
      continue
    fi

    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*:[[:space:]]*(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      value="$(printf '%s' "$value" | sed -E 's/[[:space:]]+$//')"

      if [[ "$value" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      elif [[ "$value" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      export "${key}=${value}"
    fi
  done <"$env_file"
else
  echo "[with-env-yaml] ${env_file} not found; running without YAML env." >&2
fi

exec "$@"
