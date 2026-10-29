import { SIZE, HEIGHT, MATERIALS } from "./world.js";
export class Drops {
  constructor(saved = []) {
    if (
      !Array.isArray(saved) ||
      saved.length > 2048 ||
      saved.some(
        (d) =>
          !d ||
          !Number.isInteger(d.id) ||
          d.id < 1 ||
          d.id >= MATERIALS.length ||
          ![d.x, d.y, d.z, d.vy, d.age].every(Number.isFinite) ||
          d.x < 0 ||
          d.x >= SIZE ||
          d.z < 0 ||
          d.z >= SIZE ||
          d.y < 0 ||
          d.y > HEIGHT + 2 ||
          Math.abs(d.vy) > 30 ||
          d.age < 0 ||
          d.age > 1e9,
      )
    )
      throw Error("Invalid dropped resources.");
    this.approaches = new WeakMap();
    this.items = saved.map((d) => ({
      ...d,
      resting: false,
      approached: false,
    }));
  }
  add(hit) {
    if (this.items.length >= 2048) return false;
    this.items.push({
      id: hit.id,
      x: hit.x + 0.5,
      y: hit.y + 0.6,
      z: hit.z + 0.5,
      vy: 2,
      age: 0,
      resting: false,
      approached: false,
    });
    return true;
  }
  update(world, dt, player, walking, collect) {
    for (const d of this.items) {
      d.age = Math.min(1e9, d.age + dt);
      // Lift items out of a block placed around them, then resolve downward motion in small steps.
      while (
        d.y < HEIGHT + 1 &&
        world.get(Math.floor(d.x), Math.floor(d.y), Math.floor(d.z))
      )
        d.y = Math.floor(d.y) + 1.17;
      d.vy = Math.max(-20, d.vy - 18 * dt);
      const steps = Math.max(1, Math.ceil(Math.abs(d.vy * dt) / 0.08));
      d.resting = false;
      for (let i = 0; i < steps; i++) {
        const next = d.y + (d.vy * dt) / steps,
          floor = Math.floor(next - 0.16);
        if (
          d.vy <= 0 &&
          (next < 0.16 || world.get(Math.floor(d.x), floor, Math.floor(d.z)))
        ) {
          d.y = Math.max(0.16, floor + 1.16);
          d.vy = 0;
          d.resting = true;
          break;
        }
        d.y = next;
      }
    }
    return this.collect(player, walking, collect);
  }
  collect(player, walking, collect, owner = "local") {
    const picked = [];
    for (const d of this.items) {
      let approached = this.approaches.get(d);
      if (!approached) {
        approached = new Set();
        this.approaches.set(d, approached);
      }
      const nearby = Math.hypot(player.x - d.x, player.z - d.z) < 0.8;
      // Walking into the pickup area also claims items still falling. Wait for
      // them to land without requiring another movement frame at that instant.
      if (!nearby) approached.delete(owner);
      else if (walking) approached.add(owner);
      if (
        approached.has(owner) &&
        d.resting &&
        d.age >= 0.65 &&
        nearby &&
        Math.abs(player.y - (d.y - 0.16)) < 1.25 &&
        collect(d.id)
      )
        picked.push(d);
    }
    const removed = new Set(picked);
    this.items = this.items.filter((d) => !removed.has(d));
    return picked;
  }
  snapshot() {
    return this.items.map(({ id, x, y, z, vy, age }) => ({
      id,
      x,
      y,
      z,
      vy,
      age,
    }));
  }
}
