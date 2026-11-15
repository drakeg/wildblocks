Wildblocks 0.13.1 — Save reliability maintenance release

This patch builds on 0.13.0's named worlds and local backups. It contains no new terrain, creatures, crafting items or save-format changes.

- Desktop Save & Quit and window close require an explicit successful checkpoint before closing the game. If saving fails or times out, the game and any hosted server remain open so you can retry or export your world.
- Returning to local play or stopping an in-app hosted server now reports checkpoint failure instead of discarding unsaved progress.
- Added tests for failed save/quit, retry, late or untrusted checkpoint responses, and backup restoration failure, undo and isolation between separate world slots.
- Updated Electron to 45.3.2. GitHub Actions uses Node.js 26.13.1 for building; dedicated-server packages continue to bundle the existing Node 24 runtime.

Existing 0.13.0 worlds and backups remain in place. Back up important worlds using Export World before upgrading. No migration or world reset is required.

[Downloads and platform launch instructions](https://github.com/drakeg/wildblocks/blob/main/RELEASES.md)

Validation: current merged-main packaging CI passed on macOS ARM64/x64, Windows x64 and Linux ARM64/x64, with the portable server built separately. Isolated macOS native-source QA verified world selection, two-world persistence, save/reopen, backup restore/undo and player position/facing persistence. Inventory acquisition and crop growth have automated coverage but their complete native UI replay remains unverified. Individual packaged binaries have not all been manually launched.

Mac binaries are ad-hoc signed, not Apple-notarized. Windows binaries are not Authenticode signed. See RELEASES.md for installation details.
