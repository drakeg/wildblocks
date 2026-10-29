import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../server/server.mjs";
import { World } from "../dist/world.js";
import { Gathering } from "../dist/gathering.js";
import { Progression } from "../dist/progression.js";
import { craft, nearCraftingTable } from "../dist/crafting.js";
test("crafting tables are placeable, recoverable, and required for advanced recipes", () => {
  const w = new World(),
    bag = new Gathering(),
    skills = new Progression(),
    tools = new Set();
  bag.add(7, 8);
  bag.add(3, 4);
  assert.equal(craft("pick", bag, tools, skills), false);
  assert(craft("table", bag, tools, skills));
  assert.equal(bag.counts[9], 1);
  assert(bag.place(w, 32, 13, 30, 9, { x: 32.5, y: 13, z: 32.5 }));
  assert(nearCraftingTable(w, { x: 32.5, y: 13, z: 32.5 }));
  assert.equal(nearCraftingTable(w, { x: 20, y: 13, z: 20 }), false);
  assert(craft("pick", bag, tools, skills, "survival", true));
});
test("server accounts, isolation, shared world, validation, logout and persisted inventories", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "wildblocks-server-"));
  let service = await startServer({ dataDir, port: 0 });
  try {
    const request = async (path, body, cookie) => {
      const response = await fetch(service.url + path, {
        method: body ? "POST" : "GET",
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return {
        status: response.status,
        body: await response.json(),
        cookie: response.headers.get("set-cookie")?.split(";")[0],
      };
    };
    assert.equal((await request("/api/state")).status, 401);
    assert.equal((await request("/api/attack", {})).status, 401);
    const a = await request("/api/register", {
      username: "PlayerOne",
      password: "original-game-test-123",
    });
    assert.equal(a.status, 200);
    assert(a.cookie.includes("wildblocks_session="));
    assert.equal(
      a.body.player.inventory.reduce((x, y) => x + y),
      0,
    );
    assert.equal(a.body.player.name, "PlayerOne");
    const b = await request("/api/register", {
      username: "PlayerTwo",
      password: "another-player-test-123",
    });
    assert.equal(b.status, 200);
    assert.equal(b.body.player.name, "PlayerTwo");
    assert(b.body.players.some((p) => p.name === "PlayerOne"));
    assert.equal(
      (
        await request("/api/login", {
          username: "PlayerOne",
          password: "incorrect-password",
        })
      ).status,
      401,
    );
    assert.equal(
      (await request("/api/craft", { key: "table" }, a.cookie)).status,
      409,
    );
    const invalid = await request(
      "/api/input",
      { position: { x: 1e9, y: 13, z: 32 }, direction: { x: 0, y: 0, z: -1 } },
      a.cookie,
    );
    assert.equal(invalid.status, 400);
    // Authoritative mining: held input, not a client-supplied inventory or removed block.
    assert.equal(JSON.stringify(a.body).includes('"hash"'), false);
    const forged = await request(
      "/api/input",
      {
        position: { x: 32.5, y: 13.05, z: 32.5 },
        direction: { x: 0, y: -1, z: 0 },
        active: true,
        holding: false,
        inventory: Array(10).fill(9999),
        tools: ["slate-pick"],
        mode: "creative",
        vitals: { health: 9999 },
        damage: 9999,
      },
      a.cookie,
    );
    assert.equal(forged.status, 200);
    const own = await request("/api/state?revision=-1", undefined, a.cookie);
    assert.equal(
      own.body.player.inventory.reduce((x, y) => x + y),
      0,
    );
    assert.deepEqual(own.body.player.tools, []);
    assert.equal(own.body.mode, "survival");
    assert.equal(own.body.player.vitals.health, 20);
    assert(Number.isFinite(own.body.survival.elapsed));
    const down = { x: 0, y: -1, z: 0 };
    const initial = a.body.world.edits.length;
    for (let i = 0; i < 16; i++) {
      const r = await request(
        "/api/input",
        {
          position: { x: 32.5, y: 13.05, z: 32.5 },
          direction: down,
          holding: true,
          active: true,
        },
        a.cookie,
      );
      assert.equal(r.status, 200);
      await new Promise((r) => setTimeout(r, 100));
    }
    const shared = await request("/api/state?revision=-1", undefined, b.cookie);
    assert(shared.body.world.edits.length > initial);
    assert.equal(shared.body.player.inventory[1], 0);
    assert.equal(shared.body.drops.length, 1);
    await request(
      "/api/input",
      {
        position: { x: 32.6, y: 13.05, z: 32.5 },
        direction: down,
        holding: false,
        active: true,
      },
      a.cookie,
    );
    // Pickup waits for the physical drop to land and reach its minimum age.
    // Poll the outcome instead of assuming it happens within a 150 ms window.
    let mine;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 100));
      mine = await request("/api/state?revision=-1", undefined, a.cookie);
      if (mine.body.player.inventory[1] === 1) break;
      await request("/api/input", {
        position: {x:32.6,y:13.05,z:32.5}, direction:down, holding:false, active:true,
      }, a.cookie);
    }
    assert.equal(mine.body.player.inventory[1], 1);
    assert.equal(mine.body.drops.length, 0);
    assert.equal((await request("/api/logout", {}, a.cookie)).status, 200);
    assert.equal(
      (await request("/api/state", undefined, a.cookie)).status,
      401,
    );
    await service.close();
    const saved = await readFile(join(dataDir, "server.json"), "utf8");
    assert(!saved.includes("original-game-test-123"));
    service = await startServer({ dataDir, port: 0 });
    const login = await request("/api/login", {
      username: "PlayerOne",
      password: "original-game-test-123",
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.player.inventory[1], 1);
    const forbidden = await fetch(service.url + "/api/register", {
      method: "POST",
      headers: {
        Origin: "https://unrelated.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(forbidden.status, 403);
  } finally {
    await service.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
test("Creative servers expose the host game type and permit free advanced crafting", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "wildblocks-creative-"));
  let service = await startServer({ dataDir, port: 0, mode: "creative" });
  try {
    const response = await fetch(service.url + "/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "CreativePlayer",
        password: "creative-test-account-123",
      }),
    });
    const state = await response.json(),
      cookie = response.headers.get("set-cookie").split(";")[0];
    assert.equal(state.mode, "creative");
    const crafted = await fetch(service.url + "/api/craft", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ key: "pick" }),
    });
    assert.equal(crafted.status, 200);
    const result = await crafted.json();
    assert(result.player.tools.includes("slate-pick"));
    assert.equal(
      result.player.skills.reduce((a, b) => a + b),
      0,
    );
    await service.close();
    service = await startServer({ dataDir, port: 0 });
    const status = await (await fetch(service.url + "/api/status")).json();
    assert.equal(status.mode, "creative");
    await service.close();
    service = await startServer({ dataDir, port: 0, mode: "survival" });
    assert.equal((await (await fetch(service.url + "/api/status")).json()).mode, "survival");
    await service.close();
    service = await startServer({ dataDir, port: 0 });
    assert.equal((await (await fetch(service.url + "/api/status")).json()).mode, "survival");
  } finally {
    await service.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
