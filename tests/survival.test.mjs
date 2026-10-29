import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../dist/world.js";
import { Gathering } from "../dist/gathering.js";
const hit = { x: 32, y: 12, z: 32, id: 1, distance: 1 };
test("new players have no blocks and cannot place for free", () => {
  const g = new Gathering(),
    w = new World();
  assert.deepEqual(g.counts, Array(27).fill(0));
  assert.equal(g.place(w, 32, 13, 32, 1, { x: 20, y: 20, z: 20 }), false);
  assert.equal(w.get(32, 13, 32), 0);
});
test("brief clicks do not break blocks; sustained mining removes a block without directly granting inventory", () => {
  const g = new Gathering(),
    w = new World();
  assert.equal(g.mine(w, hit, 0.04, true), null);
  assert.equal(w.get(32, 12, 32), 1);
  for (let i = 0; i < 30; i++) g.mine(w, hit, 0.1, true);
  assert.equal(w.get(32, 12, 32), 0);
  assert.equal(g.counts[1], 0);
});
test("releasing or switching targets resets mining progress", () => {
  const g = new Gathering(),
    w = new World();
  g.mine(w, hit, 0.1, true);
  assert(g.progress > 0);
  g.mine(w, hit, 0.1, false);
  assert.equal(g.progress, 0);
  g.mine(w, hit, 0.1, true);
  g.mine(w, { ...hit, x: 33 }, 0.01, true);
  assert(g.progress < 0.1);
});
test("placement spends exactly one item, rejects player overlap and occupied cells", () => {
  const g = new Gathering(),
    w = new World();
  g.counts[4] = 2;
  assert.equal(g.place(w, 32, 13, 32, 4, { x: 32.5, y: 13, z: 32.5 }), false);
  assert.equal(g.counts[4], 2);
  assert.equal(g.place(w, 32, 13, 32, 4, { x: 20, y: 20, z: 20 }), true);
  assert.equal(g.counts[4], 1);
  assert.equal(g.place(w, 32, 13, 32, 4, { x: 20, y: 20, z: 20 }), false);
  assert.equal(g.counts[4], 1);
});
test("inventory saves validate counts; legacy worlds grant nothing", () => {
  assert.deepEqual(new Gathering().counts, Array(27).fill(0));
  assert.throws(() => new Gathering([0, -1, 0, 0, 0, 0, 0]));
  const g = new Gathering([0, 2, 3, 0, 0, 0, 0]);
  const saved = g.snapshot();
  saved[1] = 900;
  assert.equal(g.counts[1], 2);
});

test("creative mines instantly and builds without spending survival inventory", () => {
  const world = new World(),
    bag = new Gathering();
  const hit = { x: 32, y: world.surface(32, 32) - 1, z: 32, distance: 1 };
  hit.id = world.get(hit.x, hit.y, hit.z);
  assert.ok(bag.mine(world, hit, 0.01, true, "creative"));
  assert.equal(bag.counts[hit.id], 0);
  assert.equal(
    bag.place(world, 32, 30, 32, 4, { x: 1, y: 30, z: 1 }, "creative"),
    true,
  );
  assert.equal(bag.counts[4], 0);
  assert.equal(bag.place(world, 33, 30, 32, 4, { x: 1, y: 30, z: 1 }), false);
});
