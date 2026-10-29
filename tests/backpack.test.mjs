import test from "node:test";
import assert from "node:assert/strict";
import { Gathering } from "../dist/gathering.js";
import { craft } from "../dist/crafting.js";
import { Progression } from "../dist/progression.js";
test("new materials fill from the left in gathering order and matching items stack", () => {
  const bag = new Gathering();
  assert.equal(bag.capacity, 9);
  assert(bag.add(4, 2));
  assert(bag.add(2));
  assert(bag.add(4));
  assert.deepEqual(bag.layout().order, [4, 2]);
  assert.equal(bag.counts[4], 3);
});
test("used-up items free their slots and later pickups append without material reservations", () => {
  const bag = new Gathering();
  bag.add(4);
  bag.add(2);
  bag.add(3);
  bag.counts[2] = 0;
  bag.syncOrder();
  assert.deepEqual(bag.order, [4, 3]);
  bag.add(5);
  bag.add(2);
  assert.deepEqual(bag.order, [4, 3, 5, 2]);
});
test("full bags still accept matching materials and leave new materials uncollected", () => {
  const bag = new Gathering();
  for (const id of [4, 2, 3, 5, 1, 6, 7, 8, 9]) assert(bag.add(id));
  assert.equal(bag.add(10), false);
  assert.equal(bag.counts[10], 0);
  assert(bag.add(4));
  assert.equal(bag.counts[4], 2);
});
test("crafting expansions spends ingredients and adds usable slots, capped at eighteen", () => {
  const bag = new Gathering(),
    p = new Progression(),
    tools = new Set();
  bag.add(7, 12);
  bag.add(5, 12);
  assert(craft("backpack", bag, tools, p, "survival", true));
  assert.equal(bag.capacity, 12);
  assert(craft("backpack", bag, tools, p, "survival", true));
  assert.equal(bag.capacity, 15);
  assert(craft("backpack", bag, tools, p, "survival", true));
  assert.equal(bag.capacity, 18);
  assert.equal(craft("backpack", bag, tools, p, "survival", true), false);
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) assert(bag.add(id));
  assert.equal(bag.order.length, 8);
});
test("crafting accounts for consumed slots before checking the output capacity", () => {
  const bag = new Gathering(),
    p = new Progression(),
    tools = new Set();
  bag.capacity=4; // Exercise a full bag independent of the new default.
  for (const id of [4, 1, 2, 3]) bag.add(id);
  assert(craft("boards", bag, tools, p, "survival", true));
  assert.deepEqual(bag.order, [1, 2, 3, 7]);
  bag.add(4);
  assert.equal(bag.counts[4], 0);
});
test("backpack order and expansions roundtrip; old saves preserve all their items", () => {
  const bag = new Gathering();
  bag.add(4);
  bag.add(3);
  bag.capacity = 6;
  const restored = new Gathering(bag.snapshot(), bag.layout());
  assert.deepEqual(restored.order, [4, 3]);
  assert.equal(restored.capacity, 12);
  const old = new Gathering([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(old.capacity, 9);
  assert.equal(old.counts[8], 8);
  assert.throws(() => new Gathering(undefined, { capacity: 4, order: [4, 4] }));
  assert.equal(new Gathering(old.snapshot(), { capacity:4,order:[] }).capacity,9);
});
