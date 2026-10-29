# Wildblocks

An original multiplayer voxel sandbox with survival and creative modes, crafting, building, persistent worlds, and self-hosted servers.

**[Download client & server](https://github.com/drakeg/wildblocks/releases/latest)** · [Choose your OS & launch instructions](RELEASES.md) · [Server administration](SERVER.md)

Clients and standalone servers are packaged for Apple Silicon/Intel macOS, Windows x64, and Linux x64/ARM64. Native packages include their runtimes. A smaller portable server is available for systems with Node.js 24.22.1+. The game uses original code and independently licensed assets.

## Develop

```sh
npm ci
npm run check
npm test
npm run desktop
```

Use Node.js 24.22.2 for development and release builds. The editable client source lives in `dist/` (it is deliberately tracked, not generated), the Electron wrapper in `desktop/`, and the authoritative server in `server/`. Build native downloads using `npm run package:release`; see [RELEASES.md](RELEASES.md) for automated publication.

## Current game: 0.11.0

The opening menu has Singleplayer, Multiplayer, and Host a Server. Each action opens its own screen. Joining players see the administrator's world mode and cannot choose another mode. Start & Join Server starts hosting and connects in one action; signing in or creating an account then enters the world directly. An existing signed-in session has an Enter World button.

The browser supports playing and joining; hosting is handled by the desktop app or the separate, cross-platform dedicated server. A native hosted-server panel shows friend addresses and provides Copy/Stop controls. In-app hosting stops when the client exits. For hosting independent of the client on Linux, Windows, or macOS, see [SERVER.md](SERVER.md), the shared `server.config.json` in the dedicated distribution, and the service definitions in `server/services/`.

Build the dependency-free portable distribution with `npm run build:server`. It needs Node 24 LTS on the destination computer. The separate Apple Silicon server bundle also includes its runtime.



## Furniture & storage (0.11.0)

Open **Craft & skills → Furniture & storage** to craft timber doors, framed glass windows, tables, chairs, and chests. Glass requires Crafting level 3 and a furnace. Doors and chests require a nearby crafting table. Tables and chairs are decorative furniture.

- **R or right-click** operates a door or opens a chest/town crate within five blocks. **Shift-right-click** places a block against one instead.
- Doors need a solid floor and two empty blocks of height. Closing waits until the doorway is clear.
- Chests have **27 stack slots**, shared with friends on a server. Click a container stack to take it; click a backpack stack to store it. Choose Whole stack or One item. Empty chests before mining them, so stored items cannot be lost accidentally.
- Town crates are loot only. Taking the final item starts the three-hour real-time refill. Mining a partly looted crate drops only its remaining resources.
- New worlds include furnished town buildings. Existing worlds keep their terrain and buildings; their existing crates now open, and you can craft/place all the new furniture.
- Storage, door state, and furniture orientation persist with the world. Update the dedicated server as well as the client for multiplayer support.

## Return to your saved location (0.10.1)

Single-player saves and exports now include exact player coordinates and facing direction. Loading/importing restores that position rather than resetting to camp. Existing older saves without player coordinates start at camp once; the previously unsaved location cannot be reconstructed. A safe stored position, including an underground location, is kept exactly. If terrain has changed to block the spot, recovery first tries nearby space rather than sending the player across the map.

Multiplayer accounts retain their saved direction as well as position. Sign-out and normal client exits send a validated checkpoint that the server writes before acknowledging. Native Save & Quit, Cmd-Q, and the window close button wait for the renderer's save/checkpoint before shutting down a hosted server. The browser leave action also waits for its checkpoint; browser pagehide sends a best-effort keepalive checkpoint. Forced process termination or an unreachable server cannot guarantee a final unsent movement update.

Verification: exact local snapshot/import restoration, a real browser move/pause/reload at identical coordinates, server checkpoint/sign-out/re-login/restart persistence, rejection of invalid movement checkpoints, and desktop lifecycle ordering tests.

## Wall attachments, towns, and advanced crafting (0.10)

Torches now attach to a wall face or the top of a solid block. They are separate from terrain voxels: players can walk through the adjacent space, the wall stays intact, and the torch can be mined independently. Destroying a support drops each attached torch exactly once as a physical pickup. Covering a torch with a solid block drops it too. Existing voxel torches migrate on load; unsupported legacy torches become recoverable drops.

New worlds contain two seed-dependent towns with three houses each. Foundations, roofs, timber walls, log frames, paths, tables, a smithy's furnace, and supply crates use real materials and can be gathered. Town names/locations/layouts are deterministic for a seed. Buildings do not rebuild themselves. Supply crates spill their contents onto the ground when harvested. A crate refills after **three real hours**, including time spent offline; its timer persists in saves. Refill waits while the site is occupied by a player or construction, or its supporting floor is missing. No player block is overwritten. Supplies do not grant direct inventory credit.

**Existing worlds retain their original terrain generation.** Start a new world/new server data directory to get towns and ore veins; export/back up your current world first if keeping it. Upgrading does not inject houses into existing builds.

Advanced recipes appear under **Advanced crafting**. Costs, missing stations, and required Crafting skill are shown before crafting. Stations work within three blocks. Skill and tool requirements are enforced by the server.

| Crafting skill | Unlocks |
| --- | --- |
| 3 | Furnace; smelt Iron ore into ingots with timber fuel at a furnace |
| 4 | Stonecutter |
| 5 | Anvil; Iron pick and Iron sword at an anvil |
| 6 | Iron armor at an anvil |
| 7 | Starsteel plates at a furnace; reinforced bricks at a stonecutter |
| 8 | Starsteel armor at an anvil |

Iron veins need a Slate or Iron pick. Rarer Starstone appears below height 6 and needs an Iron pick. Base mining times are 7 seconds for Iron ore and 16 seconds for Starstone, reduced by the appropriate tool. Ingots/plates are ingredients rather than placeable blocks. Iron swords deal 10 damage; Iron armor provides 50% protection and Starsteel armor 60%, with total protection capped at 60% when using a helmet. Original SVG icons and station/ore geometry distinguish the new items. Existing saves, tools, and gathered items remain supported.

Verification: 53 automated tests, including real server requests, plus browser checks of wall placement, support destruction, physical torch recovery, town buildings, anvil placement, and Iron-pick forging. Native Windows/Linux service installation remains outside the available test platforms.

## Survival, light, and equipment (0.9)

- A twelve-minute cycle has six minutes of daylight and six of night. New worlds begin in the morning with about five minutes to prepare. Local time pauses with gameplay; dedicated-server time continues while the service runs.
- Up to six original night creatures appear after sunset, approach active players, attack at close range, and disappear at dawn. Creative has no hostile creatures or creature damage. The first version uses simple terrain movement, not sophisticated navigation.
- Health starts at 20. Health regenerates slowly by day. Defeat returns you to camp with full health and five seconds of protection; inventory/equipment are retained. Inactive/paused players are not targeted in this friends-server version. Hunger and fall damage are not implemented.
- Craft four torches from one Timber board and one Canopy. Select a torch for handheld light; place it for a persistent warm light and a seven-block protected radius. Placed torches can be recovered. A maximum of eight nearby placed lights render at once; all placed torches still protect their area.
- Craft Timber/Slate swords, Woven/Slate armor, and a Slate helmet. The best owned sword and armor equip automatically. Aim and click, or press F, to attack. Swords deal 4/7 damage; attacks have a cooldown, a 3.5-block reach, and cannot pass through solid blocks. Woven armor protects 20%; Slate armor 40%; a helmet adds 20%, capped at 60%. Advanced gear needs a crafting table.
- New backpacks have nine empty resource slots and expand by three to eighteen. Existing 4/6/8-slot saves migrate to 9/12/15 slots and retain all resources. Stacks still fill left to right. Hand gathering reaches four blocks; appropriate tools and placement reach five. Stone still needs a pick.
- C opens the inventory, ingredient preview, and recipe book. Choose a category/recipe, check its costs, and craft. Done, C, or Escape closes crafting directly into gameplay. The pause background stays at your current view. Native menus offer Save & Quit Game; browser menus offer Save & Leave Game and explain that the tab may be closed.

The shared survival model also runs on the dedicated server. It owns time, creatures, damage, health, gear effects, and attack cooldowns; clients cannot submit their own health or damage. Saves retain time and health; transient creatures respawn naturally after a server restart. Update both the client and dedicated server to 0.9 for this feature set.

## About

An original voxel sandbox with single-player and small-server multiplayer. No other game client, account, resources, or server is required. Three.js (MIT) renders the world; the standalone Mac build uses Electron and includes its third-party notices.

## Play on this Mac

Open `../wildblocks-desktop/Wildblocks-darwin-arm64/Wildblocks.app`. This Apple Silicon app runs in its own window without a browser or local web server. It uses Electron's web rendering engine. It is locally ad-hoc signed, not notarized for public distribution.

Alternatively run `./start.command` and open http://127.0.0.1:4173 (Python 3 and WebGL 2 required).

For your own single-player world, choose **Survival** or **Creative** on the Singleplayer screen. Only the administrator chooses a multiplayer server’s mode. Local-world owners can change their own mode; the choice saves with the world. Survival inventory is retained when switching, and Creative building does not grant inventory when returning to Survival.

- Survival: start with zero items. Hold left click or E to mine; harder blocks take longer. Cracks and a progress bar show mining progress. Releasing or changing targets resets progress. Mined blocks fall as visible resources. Walk within 0.8 blocks after they land to collect them; walk into their pickup area first; if another item lands at your feet after you stop, it is collected too. Pickups grant +10 XP in the relevant skill. Right click places one collected block.
- Creative: unlimited materials and instant breaking.
- WASD move, Space jump, Shift run. Mouse looks with pointer capture; embedded preview fallback uses arrow keys.
- 1–9 or wheel selects a backpack slot; Escape pauses and saves.
- C or the Craft & skills button opens the crafting and progression panel, pausing the world. Close it to return to the pause menu.
- World & settings provides seeds, new worlds, sensitivity, JSON export/import.

Worlds are finite (64×64×40). The lowest foundation cannot be mined. Terracotta, Timber boards and Slate bricks can be crafted. Survival includes gathering, health, nighttime creatures, lighting, and equipment. Hunger and fall damage are not implemented. Multiplayer supports up to eight signed-in players on a shared Survival or Creative world. Creative uses the same walking/jumping movement; flight is not implemented.

World edits, inventory, dropped resources, equipment, skill XP and mode autosave locally. Browser and standalone app have separate storage. Export/import transfers a world between them. Legacy saves without inventory start with zero items. New worlds reset inventory, drops, tools and progression. Older worlds keep their existing collected inventory and begin with level 1 skills. Export before clearing app/browser data.

## Develop and verify

`npm ci`, `npm test`, `npm run desktop`. Package with `npx electron-packager . Wildblocks --platform=darwin --arch=arm64 --out=../wildblocks-desktop --overwrite` (exclude .git and development artifacts when distributing).

46 tests cover terrain, collision, ray selection, save validation, empty inventory, timed mining, mining reset, placement costs, Creative rules, falling/pickup behavior, crafting costs, overflow, equipment, skill/character levels saved progress, tool requirements, reach boundaries, axe/shovel speed and starter progression. Browser verification on a separate test origin checked mining without direct inventory credit, walking pickup, all four recipes, equipped tool, character/Crafting level advancement and reload persistence, with no captured warnings/errors. The updated packaged Mac app was launched and its crafting/skill panel checked. Long play sessions and file-picker import/export remain unverified.

Sources: `dist/world.js` world/collision; `dist/gathering.js` inventory/mining; `dist/drops.js` resource physics/pickup; `dist/crafting.js` recipes/equipment; `dist/progression.js` XP/levels; `dist/game.js` rendering/input; `desktop/main.cjs` app entry. Generic third-party rendering libraries are in `dist/vendor/` with licenses.

## Crafting and progression

| Recipe | Ingredients | Result |
| --- | --- | --- |
| Crafting table | 4 boards | 1 placeable table |
| Backpack expansion | 4 boards + 4 Canopy | +2 slots, up to 8 |
| Timber boards | 1 Honeywood | 4 boards |
| Slate bricks | 2 Slate | 2 bricks |
| Terracotta | 2 Earth + 1 Slate | 2 Terracotta |
| Timber pick | 3 boards | Starter stone-mining tool |
| Timber axe | 3 boards | 2× woodcutting |
| Slate axe | 3 boards + 2 Slate | 3× woodcutting |
| Timber shovel | 2 boards | 2.2× digging |
| Slate pick | 3 boards + 2 Slate | 1.8× mineral mining |

Survival stone/mineral blocks (Slate, Slate bricks and Terracotta) require a pick. Begin by hand-gathering Honeywood, crafting boards, then a Timber pick; no stone is needed for that starter tool. Hands reach 4 blocks and matching tools reach 5 blocks, measured from the camera to the nearest visible block surface. Mining itself enforces reach every frame and resets progress if you move out of range. Unsuitable tools grant no reach or speed bonus. The fastest owned matching tool auto-equips; the target label names it. Tools are permanent equipment without durability for now. Creative retains its 7-block editing reach and bypasses tool requirements. All block outputs can be placed and gathered again. Crafting consumes ingredients atomically and grants +20 Crafting XP. Creative crafting is free and grants no XP. Boards, tables and starter timber tools can be hand-crafted. Advanced recipes require a placed crafting table within three blocks.

Skills: Gathering (Meadow/Earth/Canopy), Mining (Slate/Terracotta/bricks), Woodcutting (Honeywood/boards), Crafting. Each starts at level 1. Skill level is `1 + floor(sqrt(skillXP / 25))`. Character XP is the sum of skill XP, with level `1 + floor(sqrt(totalXP / 100))`. Levels currently record progress only; no level bonuses or unlocks are applied. The panel shows XP toward the next level. There is no anti-cheat separation when freely switching Creative/Survival.

Dropped blocks do not expire. Up to 2,048 can exist; Survival mining pauses at that limit until items are collected. Full inventory leaves drops on the ground. Each material holds up to 9,999 items.

Empty Survival slots show no placeholder icon, number or zero count. Gathered Honeywood displays an original bark-and-end-grain log icon; crafted boards use a separate plank icon. Existing collected items are preserved. Creative continues to show its unlimited material palette. Browser checks confirmed all eight fresh slots are empty with zero visible children, and only gathered wood displays an icon/count.

## Backpack layout

Survival starts with nine empty resource slots. Materials take slots in collection order, left to right; a matching material stacks in its existing slot (up to 9,999). Consuming the last item removes its stack and packs the remaining items left. Number keys and wheel select slot positions, not material IDs. Tools remain separate permanent equipment in the tool belt.

Craft Backpack expansion for 4 Timber boards + 4 Canopy to add three slots: 9 → 12 → 15 → 18. A full bag still accepts matching stacks but leaves new material drops in the world. Crafting checks space after subtracting ingredients, so a recipe can reuse a slot it frees. Layout and capacity persist in autosave/export; old saves preserve all resources and receive sufficient migrated capacity. Old saves did not record collection order, so only their first migration uses material order; future pickups retain collection order.

All materials have original detailed SVG icons, displayed larger. Browser checks confirmed non-material slot order, expansion ingredients/capacity, slot-one wood placement, saved layout after reload and no console warnings/errors. 46 tests pass.

## Multiplayer and hosting (0.6)

In the Mac app, choose **Host a Server** from the main menu:

1. Choose **Host a Server**, select Survival/Creative, optionally enable **Allow friends on my local network**, and click **Start & Join Server**. The port (default **4182**) is under Advanced settings. A hosted world is separate from your single-player world, starts from the seed field, and resumes its saved world on later runs.
2. The app connects automatically. Sign in or create a server account with a 3–24 character player name and a password of at least ten characters; this enters the world directly.
3. Friends run their own copy of Wildblocks and enter the host's displayed local-network address and port, or simply open that address in a desktop browser. They create/sign in to their own server account. Everyone must be on the same trusted network or a VPN; no router/firewall rules are changed automatically.

The server owns world edits, mining time/reach, dropped items, pickups, crafting, bag contents, equipment and XP. Players see simple original avatars/name labels. Each account starts empty, and its inventory/progression are separate. Closing a client leaves its state on the server. Reopening the same server address restores its signed-in session until logout/expiry or a server restart. Single-player continues without an account.

The menu-hosted server runs **while the hosting app is open**. The native **Game** menu offers **Return to single-player** and **Stop hosted server**. Quitting saves/stops hosting. To keep a server running independently of the client, install Node.js 24 LTS and run `npm run server` from the source folder. It listens on this computer at port 4182 by default. Configure `WILDBLOCKS_HOST=0.0.0.0` for local-network hosting, `WILDBLOCKS_PORT` for another port, and `WILDBLOCKS_DATA` for the save directory. CLI data defaults to `./server-data`; desktop data is under `~/Library/Application Support/wildblocks/hosted-server`. Back up the complete server data directory when stopped.

Accounts belong to each individual server. Passwords are salted with a random salt and hashed using scrypt. Sessions use random HttpOnly/SameSite cookies, and sign-ins are rate/concurrency limited. The default private-network mode uses HTTP: use a game-only password and a trusted private network/VPN. For Internet hosting, configure a valid HTTPS certificate via `WILDBLOCKS_TLS_CERT` and `WILDBLOCKS_TLS_KEY`, plus the certificate's hostname in `WILDBLOCKS_PUBLIC_HOST`. Public Internet deployment and certificate provisioning were not performed here. There is no password-recovery/admin account-management UI yet.

Networking uses a small original JSON protocol over same-origin HTTP(S), polling at 200 ms. This is a small cooperative prototype, with basic movement bounds/collision validation, not a competitive anti-cheat system. Host disconnects stop play; there is no offline inventory merge or host migration. New-world/import and Creative switching are disabled while connected.

## Crafting tables

Hand-craft a table from four Timber boards, select its resource slot and right-click to place it. Stand within three blocks and press **C**. Slate picks/axes, bricks, terracotta and backpack expansions now require that nearby table. Tables are visible workbenches, can be mined/recovered, and work in single-player and shared worlds. Existing tools and saves remain valid.

## Server verification

46 tests cover the previous gathering/backpack rules plus station proximity, two-account authentication/isolation, authoritative mining and pickup, cross-player world updates, invalid input, cross-origin rejection, logout and restart persistence. A browser client signed in, crafted a Slate pick at a shared table, crafted/placed another table, and rendered a second player. Native testing verified **Start server → Connect → account screen**, including a recoverable occupied-port error. The test used loopback; access from another physical computer/VPN and public HTTPS deployment remain unverified.

`npm run build:mac` packages the client and built-in server, excluding server-data and development screenshots. The distributed Mac app is locally ad-hoc signed, not notarized. `npm audit --offline` checks the locally cached package advisory data; no new runtime dependencies are required for the server.

## Dedicated Mac server

Creative menu-hosted worlds have their own subfolder below hosted-server/creative; the existing Survival host folder is preserved. Connected players use the host's game type, displayed as a read-only rule on the sign-in screen. Creative server crafting/placement is free, mining is instant, and those actions grant no Survival XP.

A separate, self-contained Apple Silicon Mac server package is in `../wildblocks-server/`. Double-click **Wildblocks-Server.command** inside that folder. It prompts for game type, port and LAN access, then runs in Terminal without opening the client app. The complete folder includes official Node.js v24.22.1 and its license; no separate Node installation or client app is required. Keep the folder together. Its default saves are `~/Library/Application Support/Wildblocks Server/survival` and `.../creative`. Ctrl-C saves and stops the server. This data is separate from menu-hosted worlds unless you explicitly supply `--data`.

For scripted launching: `./Wildblocks-Server.command --mode=creative --port=4182 --lan --data=/absolute/path`. Omit `--lan` to listen only on this computer. The top-level `../Wildblocks-Server.command` is a convenience shortcut to the complete server folder. The server executable is its bundled `runtime/bin/node`, launched with `server/entry.cjs`; the command script supplies the correct paths/options.

The runtime archive was fetched from the official Node.js v24 distribution at https://nodejs.org/dist/latest-v24.x/ and verified against its published SHA-256 checksums. `scripts/build-server.mjs` rebuilds this server package from a verified extracted runtime folder. Keep account/save data outside the distribution folder.

Verification for 0.9: 46 tests pass, including administrator configuration/precedence, graceful console stop, server-owned modes, Creative state/free crafting and saved rules. Browser checks verified solo entry, multiplayer sign-in entering directly, no server mode selector, keyboard navigation, and 320/768/1024/1440px menu widths. Native checks verified Start & Join, a Creative server's read-only mode, local-only hosting status, and Stop Server returning to the main menu. The independent server and bundled runtime are verified on macOS; Linux/Windows service registration requires testing on those systems. See SERVER.md for details.
