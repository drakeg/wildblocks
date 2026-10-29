#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
printf 'Wildblocks: open http://127.0.0.1:4173 in a browser. Ctrl-C stops the local server.\n'
exec python3 -m http.server 4173 --bind 127.0.0.1 --directory "$HERE/dist"
