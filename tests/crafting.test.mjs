import test from "node:test";
import assert from "node:assert/strict";
import { Gathering } from "../dist/gathering.js";
import { Progression } from "../dist/progression.js";
import { craft, restoreTools } from "../dist/crafting.js";
test("recipes require ingredients, consume exactly their costs and grant output/XP once", () => {
  const bag = new Gathering(),
    p = new Progression(),
    tools = new Set();
  assert.equal(craft("boards", bag, tools, p, "survival", true), false);
  assert.equal(p.character.xp, 0);
  bag.counts[4] = 1;
  assert.equal(craft("boards", bag, tools, p, "survival", true), true);
  assert.equal(bag.counts[4], 0);
  assert.equal(bag.counts[7], 4);
  assert.equal(p.skill("Crafting").xp, 20);
  assert.equal(craft("pick", bag, tools, p, "survival", true), false);
  assert.equal(bag.counts[7], 4);
  bag.counts[3] = 2;
  assert.equal(craft("pick", bag, tools, p, "survival", true), true);
  assert.equal(bag.counts[7], 1);
  assert.equal(bag.counts[3], 0);
  assert(tools.has("slate-pick"));
  assert.equal(craft("pick", bag, tools, p, "survival", true), false);
  assert.equal(p.character.xp, 40);
});
test("overflow and unknown recipes leave ingredients and XP unchanged; Creative grants no XP", () => {
  const bag = new Gathering(),
    p = new Progression(),
    tools = new Set();
  bag.counts[4] = 5;
  bag.counts[7] = 9998;
  assert.equal(craft("boards", bag, tools, p, "survival", true), false);
  assert.equal(bag.counts[4], 5);
  assert.equal(craft("bogus", bag, tools, p, "survival", true), false);
  assert.equal(craft("bricks", bag, tools, p, "creative"), true);
  assert.equal(bag.counts[8], 2);
  assert.equal(p.character.xp, 0);
  assert.throws(() => restoreTools(["unrecognized"]));
  assert.deepEqual([...restoreTools(["slate-pick"])], ["slate-pick"]);
});
test("new materials and legacy inventory roundtrip without granting resources", () => {
  const old = new Gathering([0, 1, 0, 0, 0, 0, 0]);
  assert.equal(old.counts[7], 0);
  old.counts[8] = 3;
  assert.deepEqual(new Gathering(old.snapshot()).counts, old.counts);
});
test("the crafted pick accelerates mineral mining while outputs remain placeable and saveable", async () => {
  const { World } = await import("../dist/world.js");
  const w = new World(),
    bag = new Gathering();
  w.set(32, 14, 30, 3);
  const hit = { x: 32, y: 14, z: 30, id: 3, distance: 1 };
  for (let i = 0; i < 22; i++)
    bag.mine(w, hit, 0.1, true, "survival", new Set(["slate-pick"]));
  assert.equal(w.get(32, 14, 30), 0);
  assert.equal(bag.counts[3], 0);
  bag.counts[8] = 2;
  assert.equal(bag.place(w, 32, 14, 30, 8, { x: 20, y: 20, z: 20 }), true);
  assert.equal(World.restore(w.snapshot()).get(32, 14, 30), 8);
  assert.equal(bag.counts[8], 1);
});
