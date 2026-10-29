import {
  cp,
  mkdir,
  readFile,
  writeFile,
  chmod,
  access,
} from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPortable } from "./build-portable-server.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  runtime = process.argv[2];
if (!runtime)
  throw Error(
    "Pass the path to a verified official Node.js Darwin ARM64 runtime folder.",
  );
const target = resolve(
  process.argv[3] || resolve(root, "../wildblocks-server"),
);
await access(resolve(runtime, "bin/node"));
await buildPortable(target);
await mkdir(target, { recursive: true });
await cp(resolve(root, "server"), resolve(target, "server"), {
  recursive: true,
});
await cp(resolve(root, "dist"), resolve(target, "dist"), { recursive: true });
await mkdir(resolve(target, "runtime/bin"), { recursive: true });
await cp(resolve(runtime, "bin/node"), resolve(target, "runtime/bin/node"));
await cp(resolve(runtime, "LICENSE"), resolve(target, "runtime/LICENSE"));
await cp(
  resolve(root, "server/start.command"),
  resolve(target, "Wildblocks-Server.command"),
);
await chmod(resolve(target, "Wildblocks-Server.command"), 0o755);
await writeFile(
  resolve(target, "package.json"),
  JSON.stringify(
    {
      name: "wildblocks-server",
      version: JSON.parse(await readFile(resolve(root, "package.json"), "utf8")).version,
      private: true,
      type: "module",
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  resolve(target, "README.txt"),
  "Wildblocks Dedicated Server (Mac Apple Silicon)\n\nDouble-click Wildblocks-Server.command. Choose Survival/Creative, a port, and whether to allow your local network. Leave this terminal open. Ctrl-C saves and stops the server. No client app or separate Node install is required. Keep the whole folder together.\n\nConnect the Wildblocks client to the displayed address and create your own account. LAN hosting uses HTTP; use a trusted private network/VPN and a game-only password.\n\nDefault data: ~/Library/Application Support/Wildblocks Server/<mode>/\n\nFlags: --mode=creative --port=4182 --lan --seed=friends --data=/absolute/path\n\nThis bundle includes official Node.js v24.22.1; runtime/LICENSE contains its third-party notices.\n",
);
console.log("Standalone server package: " + target);
