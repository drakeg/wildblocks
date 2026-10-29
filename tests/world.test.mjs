import test from "node:test";
import assert from "node:assert/strict";
import {
  World,
  collides,
  movePlayer,
  raycast,
  overlapsBlock,
} from "../dist/world.js";
test("seeded terrain is deterministic and spawn clearing is safe", () => {
  const a = new World("a"),
    b = new World("a");
  assert.deepEqual(a.data, b.data);
  assert.notDeepEqual(a.data, new World("b").data);
  assert.equal(a.surface(32, 32), 13);
  assert.equal(collides(a, { x: 32.5, y: 13, z: 32.5 }), false);
});
test("falling player lands without tunneling through ground", () => {
  const w = new World();
  const p = { x: 32.5, y: 25, z: 32.5 },
    v = { x: 0, y: 0, z: 0 };
  let grounded = false;
  for (let i = 0; i < 240; i++) {
    v.y -= 24 / 120;
    grounded = movePlayer(w, p, v, 1 / 120) || grounded;
  }
  assert.equal(grounded, true);
  assert(p.y >= 13 && p.y < 13.16);
  assert.equal(collides(w, p), false);
});
test("ray selects nearest block and outward placement normal", () => {
  const w = new World();
  w.set(32, 15, 30, 6);
  const hit = raycast(w, { x: 32.5, y: 15.5, z: 33.5 }, { x: 0, y: 0, z: -1 });
  assert.equal(hit.z, 30);
  assert.equal(hit.normal.z, 1);
  assert.equal(hit.distance, 2.5);
  assert.equal(
    raycast(w, { x: 32.5, y: 30, z: 32.5 }, { x: 0, y: 1, z: 0 }),
    null,
  );
});
test("saves preserve edits and reject malformed input", () => {
  const w = new World("demo");
  w.set(32, 12, 32, 0);
  w.set(33, 13, 32, 6);
  const b = World.restore(JSON.parse(JSON.stringify(w.snapshot())));
  assert.deepEqual(w.data, b.data);
  assert.throws(() =>
    World.restore({
      format: "wildblocks",
      version: 1,
      seed: "a",
      edits: [[1, 0, 1, 0]],
    }),
  );
  assert.throws(() =>
    World.restore({
      format: "wildblocks",
      version: 1,
      seed: "a",
      edits: [[1, 2, 3, 99]],
    }),
  );
  assert.equal(overlapsBlock({ x: 4.5, y: 13, z: 4.5 }, 4, 13, 4), true);
});
test("fast horizontal motion cannot tunnel through a two-block wall", () => {
  const w = new World();
  w.set(34, 13, 32, 3);
  w.set(34, 14, 32, 3);
  const p = { x: 32.5, y: 13, z: 32.5 },
    v = { x: 100, y: 0, z: 0 };
  movePlayer(w, p, v, 0.1);
  assert(p.x < 33.701);
  assert.equal(v.x, 0);
  assert.equal(collides(w, p), false);
});
