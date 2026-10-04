#!/bin/sh
set -eu

# Use an existing Node 24+ installation without changing the user's shell.
for candidate in "$(command -v node || true)" \
    /opt/homebrew/opt/node@24/bin/node /usr/local/opt/node@24/bin/node; do
    if [ -x "$candidate" ] && "$candidate" -e \
        'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
        exec env PATH="$(dirname "$candidate"):$PATH" "$@"
    fi
done

printf '%s\n' 'Node.js 24 or newer is required. Activate your Node installation, then try again.' >&2
exit 1
