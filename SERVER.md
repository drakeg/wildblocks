# Wildblocks Dedicated Server

This server is independent of the Wildblocks desktop app. The same server code runs on Linux, Windows, and macOS, using original game code and assets. The portable package needs **Node.js 24 LTS** from [nodejs.org](https://nodejs.org/en/download). It has no npm dependencies. The Apple Silicon bundle includes its own Node runtime.

## Start a world

1. Extract the complete server folder to a stable location.
2. Edit `server.config.json`. The **administrator** chooses `mode`: `survival` or `creative`. Set `seed` before creating a new world. Existing saves keep their terrain; changing the seed does not replace it.
3. Start the appropriate launcher:
   - Linux/macOS: `./Start-Server.sh` (or `sh Start-Server.sh`).
   - Windows: double-click `Start-Server.cmd`.
   - Apple Silicon bundle: `Wildblocks-Server.command` offers an interactive setup; `Start-Server.sh` reads the shared configuration instead.
4. In the client, choose Multiplayer, enter the displayed address, and sign in or create a server account. The server supplies the mode to everyone.

You can also run `node server/entry.cjs --config server.config.json` on all three operating systems. Run from the extracted server folder. `--help` lists overrides. Precedence is command-line options, then `WILDBLOCKS_*` environment variables, then the file. The data directory is relative to the configuration file, so launching from a different directory does not create a different world.

```json
{
  "mode": "survival",
  "host": "127.0.0.1",
  "port": 4182,
  "seed": "friends-01",
  "dataDir": "server-data"
}
```

`mode` in this file overrides the saved mode when the server restarts. Players cannot set it through the API. To change server rules, edit this file and restart the server. To preserve a saved world's mode automatically, omit `mode`.

The default address accepts only this computer. To let friends connect on a trusted LAN or private VPN, set `host` to `0.0.0.0`; friends use the server computer's LAN/VPN IP, for example `http://192.168.1.20:4182`. Only open the selected port to the intended network. The launchers and service installers do not change firewall/router rules. Use a unique game-only account password. For internet hosting, configure valid `tlsCert`, `tlsKey`, and `publicHost` fields (certificate paths are relative to the config file); plain HTTP is for trusted private networks.

World/account saves are in `dataDir/server.json`. The server saves periodically and on Ctrl-C/SIGTERM. The console also accepts `stop` followed by Enter, including on Windows. Back up the data directory while stopped. Keep each world/server on its own port and data directory. Do not run two processes against one save. In-app hosting uses a separate data location and stops when the client app closes.

## Linux background service (systemd)

Copy the complete distribution to `/opt/wildblocks`, edit the config there, and install Node 24. Check `command -v node` and update `ExecStart` in `server/services/wildblocks.service` if needed. As an administrator:

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin wildblocks
sudo cp server/services/wildblocks.service /etc/systemd/system/wildblocks.service
sudo systemctl daemon-reload
sudo systemctl enable --now wildblocks
sudo systemctl status wildblocks
```

The installation must be readable/executable by the `wildblocks` user and owned by the administrator. systemd creates `/var/lib/wildblocks` for saves; this overrides the configured data directory. The process uses a restricted service account. Use `sudo systemctl stop wildblocks` to save/stop, `sudo systemctl restart wildblocks` after changing rules, and `journalctl -u wildblocks` for logs. Disable/remove the unit to uninstall; preserve the data directory.

## Windows background service (Service Control Manager)

Use Windows PowerShell **5.1** as Administrator. Extract the distribution to an administrator-controlled folder such as `C:\Program Files\Wildblocks Server` and install Node 24 for all users (not inside a private user profile). Edit `server.config.json` first. Then run:

```powershell
& '.\server\services\Install-WindowsService.ps1'
Start-Service Wildblocks
Get-Service Wildblocks
# Later:
Stop-Service Wildblocks
Restart-Service Wildblocks
```

The installer compiles the included `WindowsService.cs` using Windows' .NET Framework and registers a genuine Windows service under **LocalService**, not LocalSystem. No downloaded service wrapper is required. It installs but does not automatically start the service. An existing `Wildblocks` service is never overwritten. World/account saves and logs go to `C:\ProgramData\Wildblocks`, restricted to the service account, SYSTEM, and administrators. Stop requests are forwarded to the server so it can save before exiting. Run `Remove-WindowsService.ps1` to stop and unregister it; saves remain. If your organization's PowerShell policy blocks scripts, have the administrator approve/sign the script under that policy.

## macOS background service (launchd)

For a service that starts at boot even without a logged-in player, use the included `server/services/com.wildblocks.server.plist`. It is a **template**, not an installed service. An administrator must:

1. Put the distribution at `/usr/local/lib/wildblocks` (or edit all paths in the template).
2. Replace `/usr/local/bin/node` with the actual absolute Node binary path, or the bundled `runtime/bin/node` path.
3. Create a dedicated `_wildblocks` service user/group using your Mac administration tools. Create `/usr/local/var/wildblocks`, owned by that account, mode 700. Give that account read/execute access to the distribution.
4. Install the plist as `/Library/LaunchDaemons/com.wildblocks.server.plist`, owned by root:wheel, mode 644.
5. Load it with `sudo launchctl bootstrap system /Library/LaunchDaemons/com.wildblocks.server.plist`.

The template runs as `_wildblocks`, saves to `/usr/local/var/wildblocks`, and writes server/error logs there. `sudo launchctl bootout system/com.wildblocks.server` stops and unloads it with a graceful save. To start it again, use bootstrap. This requires no open game client or terminal. For a foreground server, use either supplied Mac launcher instead.

## Player location persistence (0.10.1)

The server persists each player's position and facing. The client's normal exit/sign-out sends a validated checkpoint, saved to disk before acknowledgement. Update both client and server for the complete behavior. Checkpoint movement uses the same speed/collision checks as normal input; clients cannot teleport by declaring an exit. If a stored spot has become obstructed, login/restart first looks for safe nearby space. Native hosting waits for the renderer checkpoint before shutting down.

## Towns and crafting progression (0.10)

New worlds generate towns, supplies, and ore veins. Existing server worlds keep generation 1 terrain; use a new data directory for generation 2 towns rather than replacing an existing save. Supply timers use real timestamps (three hours), survive restarts, and refill only in an empty, supported location not occupied by a connected player. No buildings or player blocks regenerate. Attached torches and pending physical drops are saved with the world. Skill/station/tool checks run on the server; clients cannot declare their own Crafting levels or nearby stations. Deploy the complete 0.10 distribution to keep client/shared model code aligned.

## Survival rules (0.9)

Survival servers own a shared twelve-minute day/night cycle, nighttime-only creatures, health, torches, weapons, armor, and attack cooldowns. Creative servers have no hostile creatures or damage. In this first version, inactive players are not targeted; defeat returns active players to camp without losing inventory. Time/health persist; creatures regenerate after restart. There is no player-controlled mode or time command. Update the complete server distribution so shared client/model files stay aligned.

## Verification scope

The shared server, configuration precedence/validation, graceful console stop, saved mode, and administrator-only game rules are tested on macOS. The portable package contains the same dependency-free JavaScript for all operating systems. Linux systemd and Windows service templates must be verified on those operating systems before relying on unattended hosting; those systems are not available in this workspace. No background service has been installed on your machine by this build.

Service definitions follow the official [systemd service documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html), [Windows ServiceBase API](https://learn.microsoft.com/en-us/dotnet/api/system.serviceprocess.servicebase), and [Apple launchd guide](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html).

## Furniture & shared storage (0.11.0)

Update both client and server. Existing world files are preserved; old town crates become lootable through R/right-click without regenerating terrain. New worlds generate furnished towns. Each storage chest has 27 shared stack slots. Transfers are validated and applied on the server, including reach and line of sight; two players cannot take the same items twice. Container changes save before acknowledgement. Nonempty chests cannot be mined. Empty town crates refill after three real hours, including elapsed offline time when the server starts again.
