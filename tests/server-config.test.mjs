import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { serverOptions } from "../server/config.mjs";

test("administrator config resolves paths independently of working directory and honors overrides", async () => {
  const folder = await mkdtemp(join(tmpdir(), "wildblocks-config-"));
  try {
    const path = join(folder, "server.config.json");
    await writeFile(path, JSON.stringify({ mode: "creative", dataDir: "my-world", port: 4199 }));
    const options = serverOptions(["--config", path], {}, "/");
    assert.equal(options.mode, "creative");
    assert.equal(options.dataDir, join(folder, "my-world"));
    assert.equal(options.port, 4199);
    assert.equal(serverOptions(["--config", path], { WILDBLOCKS_MODE: "survival" }).mode, "survival");
    assert.equal(serverOptions(["--config=" + path, "--mode=creative"], { WILDBLOCKS_MODE: "survival" }).mode, "creative");
    for (const args of [["--mode=administrator"], ["--port=NaN"], ["--port=65536"], ["--unknown"], ["--config"], ["--host=bad host"]])
      assert.throws(() => serverOptions(args, {}));
    assert.throws(() => serverOptions([], { WILDBLOCKS_TLS_CERT: "cert.pem" }), /both TLS/);
    assert.equal(serverOptions([], {}).mode, undefined); // Preserve an existing world's mode.
    assert.equal(serverOptions([folder, "127.0.0.1", "4182", "friends", "creative"], {}).mode, "creative");
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test("dedicated CLI reads administrator mode and saves on console stop", { timeout: 15000 }, async () => {
  const folder = await mkdtemp(join(tmpdir(), "wildblocks-cli-"));
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise(r => reservation.close(r));
  const config = join(folder, "server.config.json");
  await writeFile(config, JSON.stringify({ mode: "creative", port, dataDir: "world" }));
  const child = spawn(process.execPath, [resolve("server/entry.cjs"), "--config", config], { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] });
  let output = "", errors = "";
  child.stderr.on("data", data => errors += data);
  const exited = once(child, "exit");
  try {
    await new Promise((resolveReady, reject) => {
      const timer = setTimeout(() => reject(Error("Server did not become ready: " + errors)), 7000);
      child.stdout.on("data", data => {
        output += data;
        if (output.includes("Wildblocks server:")) { clearTimeout(timer); resolveReady(); }
      });
      child.once("exit", code => { clearTimeout(timer); reject(Error("Server exited " + code + ": " + errors)); });
    });
    const status = await (await fetch(`http://127.0.0.1:${port}/api/status`)).json();
    assert.equal(status.mode, "creative");
    child.stdin.write("stop\n");
    const [code] = await exited;
    assert.equal(code, 0, errors);
    assert.equal(JSON.parse(await readFile(join(folder, "world/server.json"), "utf8")).mode, "creative");
  } finally {
    if (child.exitCode === null) { child.kill("SIGTERM"); await exited; }
    await rm(folder, { recursive: true, force: true });
  }
});
