import { miningRule } from "./tools.js";
import { MATERIALS, overlapsBlock } from "./world.js";
export const MINING_SECONDS = [
  Infinity,
  1.1,
  1.25,
  3.8,
  2.4,
  0.8,
  2.2,
  1.8,
  3.2,
  2.2,
  0.35,
  7,
  16,
  Infinity,
  Infinity,
  5,
  7,
  5,
  9,
  1.6,
  2.2,
  1.2,
  2,
  1.4,
  2.8,
  2.2,
  Infinity,
];
export class Gathering {
  constructor(saved, layout) {
    if (
      saved !== undefined &&
      (!Array.isArray(saved) ||
        ![7, 9, 10, 11, 20, MATERIALS.length].includes(saved.length) ||
        saved.some((n) => !Number.isInteger(n) || n < 0 || n > 9999) ||
        saved[0] !== 0)
    )
      throw Error("Invalid inventory in world file.");
    this.counts = Array.from(
      { length: MATERIALS.length },
      (_, i) => saved?.[i] ?? 0,
    );
    if (
      layout !== undefined &&
      (!layout ||
        ![4, 6, 8, 9, 12, 15, 18].includes(layout.capacity) ||
        !Array.isArray(layout.order) ||
        layout.order.some(
          (id) => !Number.isInteger(id) || id < 1 || id >= MATERIALS.length,
        ) ||
        new Set(layout.order).size !== layout.order.length)
    )
      throw Error("Invalid backpack layout.");
    const occupied = this.counts.filter((n) => n > 0).length;
    this.capacity =
      layout ? ({4:9,6:12,8:15}[layout.capacity] ?? layout.capacity) : 9;
    if (occupied > this.capacity)
      throw Error("Backpack capacity is smaller than its contents.");
    this.order = layout ? [...layout.order] : [];
    this.syncOrder();
    this.reset();
  }
  syncOrder() {
    this.order = this.order.filter((id) => this.counts[id] > 0);
    for (let id = 1; id < this.counts.length; id++)
      if (this.counts[id] > 0 && !this.order.includes(id)) this.order.push(id);
  }
  layout() {
    this.syncOrder();
    return { capacity: this.capacity, order: [...this.order] };
  }
  canFit(counts) {
    return (
      counts.every((n) => Number.isInteger(n) && n >= 0 && n <= 9999) &&
      counts.filter((n) => n > 0).length <= this.capacity
    );
  }
  add(id, amount = 1) {
    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id >= MATERIALS.length ||
      !Number.isInteger(amount) ||
      amount < 1
    )
      return false;
    const next = [...this.counts];
    next[id] += amount;
    if (!this.canFit(next)) return false;
    this.counts = next;
    this.syncOrder();
    return true;
  }
  reset() {
    this.target = null;
    this.elapsed = 0;
    this.progress = 0;
  }
  snapshot() {
    return [...this.counts];
  }
  mine(world, hit, dt, holding, mode = "survival", tools = new Set()) {
    const rule = miningRule(hit, tools, mode);
    if (
      !holding ||
      !rule.allowed ||
      !Number.isFinite(hit?.distance) ||
      hit.distance < 0 ||
      hit.distance > rule.reach ||
      !hit ||
      (hit.y === 0 && !hit.torchKey) ||
      (hit.torchKey ? !world.torches.has(hit.torchKey) : world.get(hit.x, hit.y, hit.z) !== hit.id)
    ) {
      this.reset();
      return null;
    }
    if(hit.id===24&&world.ensureContainer(hit.x,hit.y,hit.z)?.counts.some(n=>n>0)){this.reset();return null;}
    const key = `${hit.x},${hit.y},${hit.z},${hit.id}`;
    if (this.target !== key) {
      this.reset();
      this.target = key;
    }
    this.elapsed += Math.max(0, Math.min(dt, 0.1));
    this.progress = Math.min(
      1,
      mode === "creative"
        ? 1
        : (this.elapsed * rule.speed) / MINING_SECONDS[hit.id],
    );
    if (this.progress < 1) return null;
    const { x, y, z, id } = hit;
    if (hit.torchKey) {
      const point=world.removeTorch(hit.torchKey);this.reset();
      return point?{x:point.x-.5,y:point.y-.6,z:point.z-.5,id:10}:null;
    }
    if(id===19)world.harvestSupply(x,y,z,Date.now(),mode!=="creative");
    if (!world.set(x, y, z, 0)) {
      this.reset();
      return null;
    }
    this.reset();
    return { x, y, z, id };
  }
  placeTorch(world, hit, mode="survival") {
    if(!hit||hit.torchKey||(mode!=="creative"&&this.counts[10]<1))return false;
    const {x,y,z,normal}=hit;
    if(!world.attachTorch(x,y,z,normal.x,normal.y,normal.z))return false;
    if(mode!=="creative"){this.counts[10]--;this.syncOrder();}return true;
  }
  place(world, x, y, z, id, player, mode = "survival", facing=0) {
    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id >= MATERIALS.length ||
      MATERIALS[id]?.placeable === false ||
      (mode !== "creative" && this.counts[id] < 1) ||
      world.get(x, y, z) !== 0 ||
      overlapsBlock(player, x, y, z)
    )
      return false;
    if(id===24&&world.containers.size>=2048)return false;
    if(id===20) {
      if(overlapsBlock(player,x,y+1,z)||world.doors.size>=2048||!world.placeDoor(x,y,z,facing))return false;
    } else {
      if (!world.set(x, y, z, id)) return false;
      if([21,22,23,24].includes(id))world.facing.set(`${x},${y},${z}`,facing);
    }
    if (mode !== "creative") {
      this.counts[id]--;
      this.syncOrder();
    }
    return true;
  }
}
