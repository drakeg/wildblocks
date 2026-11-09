Named worlds and local backups arrive in Wildblocks 0.13.0.

- Singleplayer now lists separate named worlds with each world's mode and save date.
- Create worlds with a name, optional seed, and Survival or Creative mode; switch without replacing another save.
- Existing local saves migrate to “My first world.” Imports create another world slot.
- Playing an existing world makes a session-start backup. Restore Backup swaps it with the current save, allowing an immediate undo before starting another session.
- Saves, inventory, crops, skills, hunger and player locations stay with their world. Multiplayer mode remains controlled by the server administrator.
- Local slots and backups share the app/browser storage limit. Export important worlds to files for an independent backup.
- Includes Electron 45.2.3.

[Download and launch guide](https://github.com/drakeg/wildblocks/blob/main/RELEASES.md)

Standalone client and server packages include runtimes. Early-development macOS builds are ad-hoc signed and not notarized; Windows builds are unsigned.

Validation: 78 automated tests cover saves, backup swaps, restart reconstruction, inventories, vitals, crops and player locations. Native desktop verification confirmed the saved world list and restored inventory/hunger display. Full visual backup-restore and exact-position verification remain incomplete because desktop automation returned stale controls and unavailable windows.
