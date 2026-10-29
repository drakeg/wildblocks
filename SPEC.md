# Wildblocks: first playable slice

An independent voxel creative sandbox for desktop browsers. Original implementation, generated terrain and flat-shaded procedural art. No other game code, protocols, assets, accounts, launchers, or servers are dependencies. Three.js (MIT) supplies generic rendering only.

First slice: seeded64×64 terrain with trees; first-person mouse look, WASD, jump, gravity and block collisions; ray-based block removal/placement; six original block materials; hotbar; local world persistence and JSON export/import; pause/help. Browser-local single player is the initial target. Multiplayer, crafting, survival, mobs, infinite chunks, mobile touch controls and desktop packaging are later work.

Acceptance: world renders; player spawns safely and lands on solid terrain; cannot walk through solid blocks; breaking/placing targets visible blocks within reach and prevents placing inside the player; saves survive reload; files run locally without remote assets or authentication. Test deterministic generation, collision, ray selection and edit validation with Node. Verify rendering and basic UI in a real browser if available; report any computer-use limitation.

Structure: dist/ contains distributable HTML/CSS/ES modules and vendored renderer. tests/ exercises pure world/physics logic. Start: python3 -m http.server 4173 --bind 127.0.0.1 --directory dist. Tests: node --test tests/*.test.mjs. No build step.

## 0.2 gathering and standalone update

Default Survival starts with empty inventory. Sustained mining collects blocks and placement consumes them. Creative can be selected at entry/pause, uses unlimited building and instant mining, and does not add Survival items. Save files persist inventory and mode. Standalone Apple Silicon macOS packaging uses Electron with an isolated, sandboxed renderer and local assets served through a private app protocol. See README for tested scope and remaining features. See ORIGINAL-GAMES.md for the independent fantasy RPG direction.

## 0.3 crafting, ground resources and progression

Survival mining creates one small physical dropped block, never immediate inventory. Drops fall under gravity, settle on terrain, persist in saves, and collect only while the player walks within 0.8 horizontal blocks, within 1.25 vertical blocks, after landing and a 0.65-second delay. Full inventory retains drops. Creative breaking generates no drops.

Four starter recipes produce boards, bricks, terracotta and an equipped mineral-mining pick. The pauseable crafting panel shows costs and disables unavailable/already-owned recipes. Pickup awards 10 relevant skill XP; Survival crafting awards 20 Crafting XP. Character and four skill levels have independent increasing thresholds. Levels have no mechanical effects yet. World export/import and autosave include inventory, drops, skills, mode and equipment. New worlds reset them. Legacy seven-slot inventories are extended with two empty crafted-material slots.

## 0.4 reach and craftable tool belt

Survival gathering requires a visible block surface within 2 blocks for hands or 2.75 for an owned tool suited to that material. Mining enforces this in its model, independently of target outlines. Stone, terracotta and stone bricks require a pick. Wood-only Timber pick/axe/shovel recipes avoid progression deadlock; Slate upgrades improve mining and chopping. The fastest matching owned tool is selected automatically. Tools persist with saves; legacy Slate picks remain valid. Creative keeps unrestricted material/tool use within its existing 7-block editing reach.

## 0.4.1 pickup timing correction

Walking within pickup radius marks every nearby drop for collection once it lands, even if the player stops walking first. Leaving the radius clears that eligibility. Existing ground, delay, vertical reach and inventory-cap checks remain. Notifications accumulate material quantities across pickups within 1.2 seconds. Each successful pickup removes exactly one drop and grants exactly one inventory item; rejected pickups stay in the world.

## 0.5 backpack acquisition order and capacity

Resource bag starts with four slots; item types never reserve slots. First acquisition takes the next free position, matching resources stack, consuming a stack compacts the remaining order. Slot selection maps to its current material. Recipe Backpack expansion consumes four boards and four Canopy to add two slots, to a maximum of eight. Tools stay in the separate belt. Full bags leave pickups in the world and crafting validates output space after ingredient consumption. Saves include optional bag {capacity,order}; legacy inventories migrate with enough capacity to retain every item. Larger original SVG icons cover all resource types.

## 0.6 crafting stations and small multiplayer server

Crafting table is material 9, made from four boards, placeable and recoverable. Advanced recipes require a table within three blocks; starter timber tools remain hand-crafted. The renderer draws table tops/legs and keeps the ground below visible.

Server protocol version 1 uses same-origin JSON endpoints: POST /api/register, /api/login, /api/logout, /api/input, /api/place, /api/craft; GET /api/status, /api/state?revision=N. Successful auth/state returns revision, changed world snapshot, drops, own player inventory/layout/tools/skills/position and public positions/names of other players. Errors return a bounded {error} message and an HTTP status. Session credentials remain in HttpOnly/SameSite cookies. Input contains finite bounded position, normalized direction, active/holding booleans. The server ticks mining/drop physics and validates resource/recipe/reach rules. State polls every 200 ms; requests are serialized.

The desktop's isolated preload exposes only validated hosting/connect/local-return IPC. Hosting defaults to loopback port 4182; LAN binding is opt-in. Native hosting persists separately and stops/saves on app quit; independent CLI hosting is supported. Account hashes, salts, world and player state are atomically saved with restricted file permissions. Server data is excluded from commits and packaging. Player cap eight; account cap 64. HTTPS can be configured with certificate/key/hostname environment variables for a separately managed deployment. Tests and native/browser checks are described in README.

## 0.7 standardized welcome and independent server distribution

A welcome state is active from the initial HTML body class until explicit Play/Enter server. The canvas, world tag, inventory, level and HUD are hidden, using a fixed original SVG wallpaper independent of any account or save. Login is performed on the chosen server origin; remembered sessions never bypass explicit entry. Returning to the account/server menu restores the same wallpaper and hides the game UI. Single-player remains an explicit offline option.

Hosting accepts Survival/Creative and includes the mode in server status/state/save data. Creative bypasses resource/station/tool costs and mining delay, without awarding Survival XP or generating mining drops. A self-contained Mac Apple Silicon server folder bundles official checksum-verified Node.js, server modules, client assets, license notices and an executable command launcher. The launcher selects mode, port, LAN access and data path; no GUI client or separately installed runtime is required. The existing native in-menu hosting path remains supported.

## Startup and dedicated hosting (0.8)

Use the existing original landscape with centered Wildblocks branding and a short stacked game menu. Show only one task screen at a time. Singleplayer owners may choose their local mode; multiplayer clients see read-only server mode. Only host setup or dedicated-server configuration sets server rules. No server credentials on the main menu. Connect errors appear alongside the join action. Native hosting starts then connects automatically; authenticated users enter after sign-in. Browser hosting controls are omitted. Dedicated hosting runs without a client, configured by administrators, with Linux/Windows/macOS launchers and background service definitions. Preserve existing saves and server accounts.

## Survival loop and inventory (0.9)

Original night creatures and a 720-second cycle introduce a bounded survival loop. Day and night each take 360 seconds. Hostile creatures exist only at night in Survival, capped at six. Health, terrain collision/line of sight, sword cooldown/reach, armor, camp rescue, and torch safety are enforced in the shared model and on dedicated servers. Defeat preserves inventory. Nine empty starting slots, upgradeable to eighteen; migrate old purchased capacity without losing contents. Reach is four by hand, five with appropriate tools, five for placement. Crafting presents a backpack, categorized recipe book, ingredients and result, with direct resume on Done/C/Escape. Native Quit uses the app lifecycle and saves hosted worlds; browser Leave saves and returns to the title screen.

## Attachments, settlements, and progression (0.10)

Torches are face attachments, not voxels; independent thin hit boxes support removal while terrain collision ignores them. Support destruction/obstruction queues one physical drop per attachment and preserves queued items when the drop pool is full. Shared world snapshots persist attachments and supply cooldowns. Generation 2 adds two seeded three-building towns and clustered deep ores. Legacy worlds use generation 1 to preserve existing builds. Only supply crates regenerate, at a three-hour wall-clock interval, into empty/unoccupied supported cells. Advanced crafting levels 3–8 gate processing stations, Iron/Starsteel equipment and reinforced blocks. All station/level/tool gates and pickups are authoritative on dedicated servers.

## Player persistence (0.10.1)

Save a cloned player position plus yaw/pitch with local world snapshots and restore them on load/import. Spawn only for missing/invalid positions; preserve safe underground coordinates and recover locally when terrain obstructs a saved spot. Server accounts save their facing direction. A private, validated checkpoint endpoint writes the last movement before acknowledging sign-out/exit. Native normal quit and close use an IPC save handshake before server shutdown, retaining the same trusted main-frame checks. Browser unload is best effort; explicit exit actions await completion.
