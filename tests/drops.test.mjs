import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../dist/world.js";
import { Drops } from "../dist/drops.js";
import { Progression, levelFor } from "../dist/progression.js";
const settle = (drops, w, p, walk = false, collect = () => true) => {
  for (let i = 0; i < 100; i++) drops.update(w, 0.02, p, walk, collect);
};
test("resources fall onto ground and remain until the player walks over them", () => {
  const w = new World(),
    d = new Drops();
  d.add({ id: 4, x: 32, y: 16, z: 32 });
  const player = { x: 32.5, y: 13, z: 32.5 };
  settle(d, w, player);
  assert.equal(d.items.length, 1);
  assert(Math.abs(d.items[0].y - 13.16) < 0.001);
  let count = 0;
  d.update(w, 0.02, { ...player, x: 36 }, true, () => {
    count++;
    return true;
  });
  assert.equal(count, 0);
  d.update(w, 0.02, player, true, () => {
    count++;
    return true;
  });
  assert.equal(count, 1);
  assert.equal(d.items.length, 0);
});
test("drops survive save/restore and full inventory does not destroy items", () => {
  const w = new World(),
    d = new Drops();
  d.add({ id: 3, x: 32, y: 16, z: 32 });
  settle(d, w, { x: 0, y: 13, z: 0 });
  const restored = new Drops(JSON.parse(JSON.stringify(d.snapshot())));
  restored.update(w, 0.02, { x: 32.5, y: 13, z: 32.5 }, true, () => false);
  assert.equal(restored.items.length, 1);
  assert.throws(() => new Drops([{ id: 99 }]));
  assert.throws(() => new Drops([{ ...d.snapshot()[0], y: NaN }]));
});
test("collecting requires the item to have landed and does not reach through floors", () => {
  const w = new World(),
    d = new Drops();
  d.add({ id: 3, x: 32, y: 17, z: 32 });
  d.update(w, 0.02, { x: 32.5, y: 13, z: 32.5 }, true, () => true);
  assert.equal(d.items.length, 1);
  settle(d, w, { x: 32.5, y: 17, z: 32.5 }, true);
  assert.equal(d.items.length, 1);
});
test("character and skill levels have independent thresholds and preserve XP", () => {
  const p = new Progression();
  assert.equal(p.character.level, 1);
  p.earn("Mining", 30);
  assert.equal(p.skill("Mining").level, 2);
  assert.equal(p.skill("Crafting").level, 1);
  assert.equal(p.character.level, 1);
  p.earn("Crafting", 80);
  assert.equal(p.character.level, 2);
  assert.equal(new Progression(p.snapshot()).character.xp, 110);
  assert.equal(levelFor(100).level, 3);
  assert.throws(() => new Progression([0, -1, 0, 0]));
});
test("walking over two drops collects both even if the second lands after stopping", () => {
  const w = new World(),
    d = new Drops(),
    player = { x: 32.5, y: 13, z: 32.5 };
  let inventory = 0;
  const collect = () => {
    inventory++;
    return true;
  };
  d.add({ id: 4, x: 32, y: 14, z: 32 });
  settle(d, w, { x: 0, y: 13, z: 0 });
  d.add({ id: 4, x: 32, y: 16, z: 32 });
  d.update(w, 0.02, player, true, collect);
  assert.equal(inventory, 1);
  settle(d, w, player, false, collect);
  assert.equal(inventory, 2);
  assert.equal(d.items.length, 0);
});
test("overlapping drops conserve every item across reload, multiple frames and inventory limits", () => {
  const w = new World(),
    d = new Drops(),
    player = { x: 32.5, y: 13, z: 32.5 };
  for (let i = 0; i < 7; i++) d.add({ id: 4, x: 32, y: 14 + (i % 3), z: 32 });
  settle(d, w, { x: 0, y: 13, z: 0 });
  const restored = new Drops(JSON.parse(JSON.stringify(d.snapshot())));
  let count = 9997;
  const collect = () => {
    if (count === 9999) return false;
    count++;
    return true;
  };
  settle(restored, w, player, true, collect);
  assert.equal(count, 9999);
  assert.equal(restored.items.length, 5);
  count = 0;
  settle(restored, w, player, false, collect);
  assert.equal(count, 5);
  assert.equal(restored.items.length, 0);
  settle(restored, w, player, true, collect);
  assert.equal(count, 5);
});
test("walking away clears pending pickups; drops do not teleport after landing", () => {
  const w = new World(),
    d = new Drops();
  d.add({ id: 4, x: 32, y: 16, z: 32 });
  const player = { x: 32.5, y: 13, z: 32.5 };
  d.update(w, 0.02, player, true, () => true);
  settle(d, w, { ...player, x: 36 }, true);
  let count = 0;
  settle(d, w, player, false, () => {
    count++;
    return true;
  });
  assert.equal(count, 0);
  assert.equal(d.items.length, 1);
  d.update(w, 0.02, player, true, () => {
    count++;
    return true;
  });
  assert.equal(count, 1);
});
test("one player does not clear another player’s pending pickup", () => {
  const w = new World(),
    d = new Drops(),
    a = { x: 32.5, y: 13, z: 32.5 },
    b = { x: 40, y: 13, z: 40 };
  let count = 0;
  d.add({ id: 4, x: 32, y: 16, z: 32 });
  d.collect(a, true, () => false, "PlayerA");
  d.collect(b, false, () => false, "PlayerB");
  for (let i = 0; i < 100; i++) {
    d.update(w, 0.02, b, false, () => false);
    d.collect(b, false, () => false, "PlayerB");
    d.collect(
      a,
      false,
      () => {
        count++;
        return true;
      },
      "PlayerA",
    );
  }
  assert.equal(count, 1);
  assert.equal(d.items.length, 0);
});
