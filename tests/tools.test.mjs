import test from "node:test";
import assert from "node:assert/strict";
import { World, raycast } from "../dist/world.js";
import { Gathering } from "../dist/gathering.js";
import { miningRule, HAND_REACH, TOOL_REACH } from "../dist/tools.js";
import { craft, restoreTools } from "../dist/crafting.js";
import { Progression } from "../dist/progression.js";
function attempt(id, distance, tools = new Set(), seconds = 6) {
  const w = new World(),
    g = new Gathering();
  w.set(32, 14, 30, id);
  const hit = { x: 32, y: 14, z: 30, id, distance };
  let mined;
  for (let i = 0; i < seconds * 100; i++)
    mined = g.mine(w, hit, 0.01, true, "survival", tools) || mined;
  return { w, g, mined };
}
test("hands cannot mine stone; a starter timber pick can", () => {
  assert.equal(attempt(3, 1).mined, undefined);
  assert.ok(attempt(3, 1, new Set(["wood-pick"])).mined);
});
test("hand and tool reach boundaries are enforced by mining itself", () => {
  assert.ok(attempt(4, HAND_REACH).mined);
  assert.equal(attempt(4, HAND_REACH + 0.01).mined, undefined);
  assert.ok(attempt(4, TOOL_REACH, new Set(["wood-axe"])).mined);
  assert.equal(
    attempt(4, TOOL_REACH + 0.01, new Set(["wood-axe"])).mined,
    undefined,
  );
  assert.equal(attempt(4, NaN).mined, undefined);
});
test("an unsuitable tool does not grant its reach or speed", () => {
  assert.equal(
    miningRule({ id: 4 }, new Set(["slate-pick"])).reach,
    HAND_REACH,
  );
  assert.equal(miningRule({ id: 3 }, new Set(["wood-axe"])).allowed, false);
});
test("axes chop faster, shovels dig faster, and the best matching owned tool wins", () => {
  assert.equal(attempt(4, 1, new Set(), 1.3).mined, undefined);
  assert.ok(attempt(4, 1, new Set(["wood-axe"]), 1.3).mined);
  assert.ok(attempt(2, 1, new Set(["wood-shovel"]), 0.65).mined);
  assert.equal(
    miningRule({ id: 4 }, new Set(["wood-axe", "slate-axe"])).name,
    "Slate axe",
  );
});
test("moving outside reach resets partial mining rather than banking progress", () => {
  const w = new World(),
    g = new Gathering(),
    hit = { x: 32, y: 12, z: 32, id: 1, distance: 1 };
  g.mine(w, hit, 0.1, true);
  assert(g.progress > 0);
  g.mine(w, { ...hit, distance: HAND_REACH + 1 }, 0.1, true);
  assert.equal(g.progress, 0);
});
test("stone progression can start with only hand-gathered wood, and all tools restore", () => {
  const bag = new Gathering(),
    p = new Progression(),
    tools = new Set();
  bag.counts[4] = 3;
  for (let i = 0; i < 3; i++) assert(craft("boards", bag, tools, p));
  for (const key of ["wood-pick", "wood-axe", "wood-shovel"])
    assert(craft(key, bag, tools, p));
  assert.equal(bag.counts[3], 0);
  assert.equal(restoreTools([...tools]).size, 3);
  assert.throws(() => restoreTools(["wood-pick", "wood-pick"]));
});
test("ray traversal hits the nearest surface and honors a short tool reach", () => {
  const w = new World();
  w.set(32, 14, 30, 3);
  const origin = { x: 32.5, y: 14.5, z: 33.5 },
    direction = { x: 0, y: 0, z: -1 };
  assert.equal(raycast(w, origin, direction, 2), null);
  assert.equal(raycast(w, origin, direction, TOOL_REACH).distance, 2.5);
});
