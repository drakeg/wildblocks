#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -f "$HERE/server/entry.cjs" ]; then ROOT="$HERE"; else ROOT=$(CDPATH= cd -- "$HERE/.." && pwd); fi
NODE="$ROOT/runtime/bin/node"
if [ ! -x "$NODE" ]; then NODE=$(command -v node || true); fi
if [ -z "$NODE" ]; then printf 'Use the complete Wildblocks Server package, which includes its runtime.\n'; exit 1; fi
GAME_TYPE=survival
SERVER_PORT=4182
SERVER_HOST=127.0.0.1
SERVER_SEED=friends-01
SERVER_DATA=""
if [ "$#" -eq 0 ]; then
 printf 'Wildblocks Dedicated Server\nGame type [survival/creative, default survival]: '
 IFS= read -r GAME_TYPE
 case "$GAME_TYPE" in creative|c|C) GAME_TYPE=creative ;; survival|s|S|'') GAME_TYPE=survival ;; *) printf 'Unknown game type.\n'; exit 1 ;; esac
 printf 'Port [4182]: '; IFS= read -r SERVER_PORT; SERVER_PORT=${SERVER_PORT:-4182}
 printf 'Allow friends on your local network? [y/N]: '; IFS= read -r SERVER_LAN
 case "$SERVER_LAN" in y|Y|yes) SERVER_HOST=0.0.0.0 ;; esac
else
 for option in "$@"; do
  case "$option" in
   --mode=*) GAME_TYPE=${option#--mode=} ;;
   --port=*) SERVER_PORT=${option#--port=} ;;
   --seed=*) SERVER_SEED=${option#--seed=} ;;
   --data=*) SERVER_DATA=${option#--data=} ;;
   --lan) SERVER_HOST=0.0.0.0 ;;
   --help) printf 'Wildblocks-Server.command [--mode=survival|creative] [--port=4182] [--lan] [--seed=NAME] [--data=PATH]\n'; exit 0 ;;
   *) printf 'Unknown option: %s\n' "$option"; exit 1 ;;
  esac
 done
fi
case "$GAME_TYPE" in survival|creative) ;; *) printf 'Unknown game type.\n'; exit 1 ;; esac
SERVER_DATA=${SERVER_DATA:-"$HOME/Library/Application Support/Wildblocks Server/$GAME_TYPE"}
printf 'Starting %s server. Ctrl-C stops and saves it.\n' "$GAME_TYPE"
exec "$NODE" "$ROOT/server/entry.cjs" "$SERVER_DATA" "$SERVER_HOST" "$SERVER_PORT" "$SERVER_SEED" "$GAME_TYPE"
