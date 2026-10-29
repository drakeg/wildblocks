## 0.11.0 — 2026-10-29

- Added craftable two-block doors, transparent framed windows, timber tables/chairs, glass, and 27-slot shared storage chests.
- R/right-click opens containers and operates doors; Shift-right-click builds against them. Closing doors checks player clearance.
- Added container/backpack transfer screen with whole-stack or single-item moves. Chests must be empty before removal.
- Town crates open for loot, retain partial contents, and refill three hours after becoming empty. Mining drops remaining loot exactly once.
- Added server-authoritative container sessions, reach/line-of-sight checks, atomic transfers and persistent contents. Furnished towns generate only in new worlds; existing saves retain their layouts.
- Validation: 64 automated tests including competing multiplayer transfers, restart persistence, blocked/remote access, conservation, doors and legacy saves. Visual browser testing was blocked by the browser origin approval gate.

## 0.10.1 — 2026-10-28

- Single-player saves/exports now store and restore player coordinates and facing instead of always returning to camp.
- Multiplayer sign-out/normal exits flush a server-validated position checkpoint to disk; saved facing is restored too.
- Normal native quit/window close waits for the final renderer checkpoint before stopping a hosted server.
- Blocked saved positions recover nearby when possible. Older saves without coordinates continue from camp until the first new save.

## 0.10.0 — 2026-10-28

- Torches attach to block faces without occupying a voxel. Mining the support drops attached torches for normal walking pickup; older torches migrate on load.
- New seeded worlds contain two towns with three material-built houses each, usable stations, named locations, and harvestable supply crates.
- Supply crates refill after three real hours, preserve timers across saves/restarts, and wait for players/construction to leave the site.
- Added Iron/Starstone veins, ingots/Starsteel, furnaces, anvils, stonecutters, reinforced bricks, and stronger tools/weapons/armor.
- Advanced recipes require Crafting levels 3–8 and the appropriate nearby station. Tougher ores require higher-tier picks.
- Fixed hotbar selection highlighting after opening the inventory.
- Existing terrain is preserved; towns/ores require a newly generated world.

## 0.9.0 — 2026-10-28

- Added day/night, health, original nighttime creatures, close-range combat, armor protection, and camp rescue on defeat in Survival. Dedicated servers own these rules too.
- Added craftable torches, Timber/Slate swords, Woven/Slate armor, and a Slate helmet; appropriate equipment equips automatically.
- Increased the starting backpack to nine slots, with upgrades to eighteen and migration of older saves. Increased hand/tool/placement reach to 4/5/5 blocks.
- Replaced the long crafting list with an inventory grid, categorized recipe book, ingredient/result preview, and one craft action.
- Closing crafting immediately resumes play. Added explicit Save & Quit/Leave actions to the main/pause menus.
- Added tests for nighttime-only spawning, daylight cleanup, Creative safety, torch protection, attack walls/reach/cooldown, armor, rescue, costs, legacy bag migration, and forged health/damage rejection.

## 0.8.0 — 2026-10-27

- Replaced the scrolling startup form with an original, compact game title menu and separate Singleplayer, Multiplayer, Host, and server sign-in screens.
- Start & Join connects automatically; sign-in/account creation enters the world directly. Server mode is shown as an administrator-owned rule.
- Added local hosted-server address/copy/stop controls and clearer connection errors.
- Added a portable dedicated-server package for Linux, Windows, and macOS with administrator configuration and launchers.
- Added systemd/launchd templates and a Windows Service Control Manager wrapper/installer. These are supplied for administrator installation, not automatically installed.
- Persisted initial world/server rules before any player joins; added config and graceful shutdown coverage.

# Changelog

## 0.7.0 — 2026-10-27

- Open to a standardized Play & sign-in screen with original landscape wallpaper.
- Hide saved world, inventory and character information until explicit game entry.
- Choose Survival/Creative before local play or hosting; servers persist their game type.
- Add a self-contained Mac server folder with a double-clickable launcher and bundled runtime.
- Preserve existing single-player and Survival-host saves.

## 0.6.0 — 2026-10-27

- Add placeable/recoverable crafting tables for advanced recipes.
- Add server-owned accounts, shared Survival worlds, per-player saves and visible player avatars.
- Add Start server and Connect to server in the client menu.
- Add independent Node server entry point and configurable private-network/HTTPS hosting.
- Preserve single-player saves and legacy inventories.

## 0.5.0 — 2026-10-27

- Pack gathered resources left to right in collection order, with matching materials stacked.
- Start with four slots and craft backpack expansions to six, then eight.
- Preserve backpack order/capacity and migrate older saves without item loss.
- Make item icons larger and add original detailed icons for every material.
- Number keys and wheel now select backpack slots.

## 0.4.2 — 2026-10-27

- Render empty Survival inventory slots as blank spaces, without placeholder icons, zero counts or slot numbers.
- Give gathered wood a log icon with bark/end-grain detail and crafted boards a plank icon.
- Preserve already gathered resources.

## 0.4.1 — 2026-10-27

- Fix a second dropped block being left behind when it lands after you stop walking.
- Combine nearby pickup notifications into an accurate running material count.
- Verify conservation of overlapping drops, saved drops and items left when inventory is full.

## 0.4.0 — 2026-10-26

- Limit Survival gathering to hands/tool reach; moving away resets mining.
- Require a pick for stone and add a wood-only starter pick recipe.
- Add craftable Timber/Slate axes and a Timber shovel with material-specific speed bonuses.
- Automatically select the best suitable owned tool; preserve existing tool saves.

## 0.3.0 — 2026-10-26

- Craft boards, bricks, terracotta and a slate pick from gathered ingredients.
- Mined resources fall to the ground and require walking pickup.
- Character and Gathering, Mining, Woodcutting and Crafting skills gain XP and levels.
- Save and restore drops, equipment and progression, preserving older inventories.
- Update the standalone Apple Silicon Mac app.
