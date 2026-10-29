# Download and run Wildblocks

Get the game and dedicated server from **[GitHub Releases](https://github.com/drakeg/wildblocks/releases/latest)**. Download a package under **Assets**, rather than GitHub's automatically generated source-code archive.

| Your computer | Client package | Standalone server package |
| --- | --- | --- |
| Mac with Apple Silicon (M1 or newer) | `Client-…-macos-arm64.zip` | `Server-…-macos-arm64.zip` |
| Intel Mac | `Client-…-macos-x64.zip` | `Server-…-macos-x64.zip` |
| Windows 64-bit (Intel/AMD) | `Client-…-windows-x64.zip` | `Server-…-windows-x64.zip` |
| Linux Intel/AMD 64-bit | `Client-…-linux-x64.tar.gz` | `Server-…-linux-x64.tar.gz` |
| Linux ARM64 | `Client-…-linux-arm64.tar.gz` | `Server-…-linux-arm64.tar.gz` |

All standalone packages include their runtime; players and server administrators do not need to install Node.js. The smaller `Server-…-portable.zip` instead requires Node.js 24.22.1 or later in the Node 24 line. Keep each extracted folder intact.

## Client

- **macOS:** extract the ZIP and move `Wildblocks.app` to Applications. These early builds are ad-hoc signed, not Apple notarized. If macOS blocks opening it, review the download and use System Settings → Privacy & Security → Open Anyway.
- **Windows:** extract the ZIP and run `Wildblocks.exe`. The app is not Authenticode signed, so Windows may show an unknown-publisher prompt.
- **Linux:** extract with `tar -xzf Wildblocks-Client-…tar.gz`, then run `./Wildblocks`. Use a desktop session with working graphics drivers. The standard Electron/Chromium system library and sandbox requirements apply.

Choose Singleplayer, Multiplayer, or Host a Server. Players joining a server use the administrator's mode. Accounts belong to each server; singleplayer needs no login. The game uses original code and independently licensed assets.

## Dedicated server

1. Extract the matching **Server** package to a writable folder.
2. Edit `server.config.json`: set `mode` to `survival` or `creative`, choose your port and seed, and set `host` to `0.0.0.0` if friends will connect over your network. The default `127.0.0.1` permits only this computer.
3. Start `Start-Server.command` on macOS, `Start-Server.cmd` on Windows, or `./Start-Server.sh` on Linux.
4. Join from the client using the server's address, for example `192.168.1.20:4182`. Each friend creates an account on that server.
5. Type `stop` in the console to save and shut down. Back up the `server-data` directory before upgrading; retain your configuration and world data when replacing program files.

For system services, TLS, configuration and network setup, see [SERVER.md](SERVER.md). The standalone service runs independently of the game client. Existing worlds retain their administrator-selected mode and terrain generation.

## Verify downloads

Each release includes `SHA256SUMS.txt`. On macOS run `shasum -a 256 <file>`; on Linux run `sha256sum <file>`; on Windows run PowerShell `Get-FileHash <file> -Algorithm SHA256`. Compare with the matching entry.

## Build and publish

Node.js 24.22.2 and `npm ci` install the pinned build environment. Run `npm run check`, `npm test`, then `npm run package:release` on a supported target OS/architecture. Output goes to `build/artifacts/`. Packaging downloads official Electron and Node runtimes and verifies the Node checksum.

GitHub Actions tests and builds on five native runner configurations, then publishes a release only after **all** packages succeed. Pushing a new `package.json` version to `main` publishes `v<version>` with client/server downloads, the portable server, and checksums. An existing version's downloads are preserved. A matching version tag or manual Actions run can also trigger the workflow. Failed builds remain visible in Actions and never publish a partial release. To fix an already published package, bump the version rather than replacing its downloads.

Packages are portable distributions, not auto-updating installers. Native build and server tests do not replace playing the client on every supported OS; graphics and desktop integration may vary.
