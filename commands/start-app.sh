#!/usr/bin/env bash
# Starts the React app's Vite dev server.
# Run from anywhere: ./commands/start-app.sh

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(dirname "$script_dir")"
app_dir="$repo_root/app"

if [ ! -f "$app_dir/package.json" ]; then
  echo "Could not find app/package.json under $app_dir" >&2
  exit 1
fi

cd "$app_dir"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

npm run dev
