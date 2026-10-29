import { cp, mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function buildPortable(destination) {
const target = resolve(destination || resolve(root, "../wildblocks-server-portable"));
await mkdir(target, { recursive: true });
for (const folder of ["server", "dist"]) await cp(resolve(root, folder), resolve(target, folder), { recursive: true });
// Never overwrite an administrator's configuration on an update.
try { await readFile(resolve(target, "server.config.json")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  await cp(resolve(root, "server/server.config.example.json"), resolve(target, "server.config.json"));
}
await cp(resolve(root, "server/start-server.sh"), resolve(target, "Start-Server.sh"));
// Root launchers need a different relative root than their source copies.
let shell = await readFile(resolve(target, "Start-Server.sh"), "utf8");
await writeFile(resolve(target, "Start-Server.sh"), shell.replace('"$(dirname -- "$0")/.."', '"$(dirname -- "$0")"'));
await chmod(resolve(target, "Start-Server.sh"), 0o755);
let cmd = await readFile(resolve(root, "server/start-server.cmd"), "utf8");
await writeFile(resolve(target, "Start-Server.cmd"), cmd.replace('%~dp0..', '%~dp0'), { encoding: "utf8" });
await cp(resolve(root, "SERVER.md"), resolve(target, "README.md"));
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
await writeFile(resolve(target, "package.json"), JSON.stringify({ name: "wildblocks-server", version: pkg.version, type: "module", private: true }, null, 2));
console.log("Portable server: " + target);

}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPortable(process.argv[2]);
