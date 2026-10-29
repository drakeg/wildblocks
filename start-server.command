#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
for LAUNCHER in "$HERE/wildblocks-server/Wildblocks-Server.command" "$HERE/../wildblocks-server/Wildblocks-Server.command" "$HERE/server/start.command"; do
 if [ -x "$LAUNCHER" ]; then exec "$LAUNCHER" "$@"; fi
done
printf 'Open Wildblocks-Server.command inside the complete wildblocks-server folder.\n'
exit 1
