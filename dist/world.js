import { generateSettlements, generateOres, SUPPLY_REGEN_MS } from "./settlements.js";
export const SIZE = 64,
  HEIGHT = 40,
  CHUNK = 16;
export const MATERIALS = [
  null,
  { name: "Meadow", color: "#7eaa62" },
  { name: "Earth", color: "#997453" },
  { name: "Slate", color: "#839398" },
  { name: "Honeywood", color: "#bb874e" },
  { name: "Canopy", color: "#4f875b" },
  { name: "Terracotta", color: "#cf896f" },
  { name: "Timber boards", color: "#dfb980" },
  { name: "Slate bricks", color: "#657d8a" },
  { name: "Crafting table", color: "#956836" },
  { name: "Torch", color: "#ffc66b", placeable: false },
  { name: "Iron ore", color: "#b68e77" },
  { name: "Starstone ore", color: "#7d9fb7" },
  { name: "Iron ingot", color: "#bec9cc", placeable: false },
  { name: "Starsteel plate", color: "#b3cbdf", placeable: false },
  { name: "Furnace", color: "#656d71" },
  { name: "Anvil", color: "#59656e" },
  { name: "Stonecutter", color: "#b6b9b0" },
  { name: "Reinforced bricks", color: "#768c9b" },
  { name: "Town supply crate", color: "#ab8452", placeable: false },
  { name: "Timber door", color: "#b1844b" },
  { name: "Framed window", color: "#c1deda" },
  { name: "Timber table", color: "#bc925d" },
  { name: "Timber chair", color: "#a97d49" },
  { name: "Storage chest", color: "#b3884f" },
  { name: "Door upper half", color: "#b1844b", placeable: false, internal:true },
  { name: "Glass", color: "#c5e7e6", placeable: false },
];
export function hash(x, z, seed = 0) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function seedNumber(text) {
  let n = 2166136261;
  for (const c of String(text)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export class World {
  constructor(seed = "wander-01", generation = 3) {
    this.generation = generation;
    this.doors = new Map();
    this.facing = new Map();
    this.containers = new Map();
    this.torches = new Map();
    this.pendingDrops = [];
    this.towns = [];
    this.supplies = [];
    this.seed = String(seed).slice(0, 64);
    this.number = seedNumber(this.seed);
    this.data = new Uint8Array(SIZE * SIZE * HEIGHT);
    this.edits = new Map();
    this.revision = 0;
    this.generate();
    for(const site of this.supplies)this.ensureContainer(site.x,site.y,site.z);
    if(this.generation>=3)this.furnishTowns();
  }
  index(x, y, z) {
    return x + SIZE * (z + SIZE * y);
  }
  inside(x, y, z) {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      Number.isInteger(z) &&
      x >= 0 &&
      z >= 0 &&
      y >= 0 &&
      x < SIZE &&
      z < SIZE &&
      y < HEIGHT
    );
  }
  get(x, y, z) {
    return this.inside(x, y, z) ? this.data[this.index(x, y, z)] : 0;
  }
  raw(x, y, z, id) {
    if (this.inside(x, y, z)) this.data[this.index(x, y, z)] = id;
  }
  set(x, y, z, id) {
    if (
      !this.inside(x, y, z) ||
      y === 0 ||
      !Number.isInteger(id) ||
      id < 0 ||
      id >= MATERIALS.length
    )
      return false;
    const old=this.get(x,y,z),key=`${x},${y},${z}`;
    if(old===24 && id!==24 && !this.restoring && this.containers.get(key)?.counts.some(n=>n>0))return false;
    if((old===20||old===25)&&id!==old) {
      const by=old===25?y-1:y;
      for(const py of [by,by+1])if([20,25].includes(this.get(x,py,z))){this.raw(x,py,z,0);this.edits.set(`${x},${py},${z}`,0);this.dropSupportedTorches(x,py,z);}
      this.doors.delete(`${x},${by},${z}`);
    }
    if([19,24].includes(old)&&id!==old){if(old===19&&!this.restoring)this.harvestSupply(x,y,z);this.containers.delete(key);}
    if(old!==id)this.facing.delete(key);
    if (id === 10) {
      const face = [[0,1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].find(([nx,ny,nz]) => this.get(x-nx,y-ny,z-nz));
      if (face) return !!this.attachTorch(x-face[0],y-face[1],z-face[2],...face);
      this.pendingDrops.push({x,y,z,id:10});return true;
    }
    if (id === 0) for (const [key,t] of this.torches) if(t.sx===x&&t.sy===y&&t.sz===z) {
      const p=torchPosition(t);this.pendingDrops.push({x:p.x-.5,y:p.y-.6,z:p.z-.5,id:10});this.torches.delete(key);
    }
    if(id!==0)for(const [key,t] of this.torches){const p=torchPosition(t);if(Math.floor(p.x)===x&&Math.floor(p.y)===y&&Math.floor(p.z)===z){this.pendingDrops.push({x:p.x-.5,y:p.y-.6,z:p.z-.5,id:10});this.torches.delete(key);}}
    this.raw(x, y, z, id);
    this.edits.set(`${x},${y},${z}`, id);
    if([19,24].includes(id))this.ensureContainer(x,y,z);
    if(id===20&&!this.doors.has(key))this.doors.set(key,{x,y,z,facing:0,open:false});
    this.revision++;
    return true;
  }
  dropSupportedTorches(x,y,z) {
    for(const [key,t] of this.torches)if(t.sx===x&&t.sy===y&&t.sz===z){const p=torchPosition(t);this.pendingDrops.push({x:p.x-.5,y:p.y-.6,z:p.z-.5,id:10});this.torches.delete(key);}
  }
  placeDoor(x,y,z,facing=0) {
    if(!this.inside(x,y+1,z)||!this.get(x,y-1,z)||this.get(x,y,z)||this.get(x,y+1,z)||this.doors.size>=2048)return false;
    this.set(x,y,z,20);this.set(x,y+1,z,25);this.doors.set(`${x},${y},${z}`,{x,y,z,facing:((facing%4)+4)%4,open:false});return true;
  }
  toggleDoor(x,y,z,players=[]) {
    if(this.get(x,y,z)===25)y--;
    const door=this.doors.get(`${x},${y},${z}`);if(!door)return false;
    if(door.open&&players.some(p=>overlapsBlock(p.position??p,x,y,z)||overlapsBlock(p.position??p,x,y+1,z)))return false;
    door.open=!door.open;this.revision++;return true;
  }
  ensureContainer(x,y,z) {
    const id=this.get(x,y,z);if(![19,24].includes(id))return null;
    const key=`${x},${y},${z}`;let container=this.containers.get(key);
    if(!container){container={x,y,z,counts:Array(MATERIALS.length).fill(0),order:[]};
      if(id===19){const site=this.supplies.find(s=>s.x===x&&s.y===y&&s.z===z);if(site)for(const [item,count] of site.loot){container.counts[item]=count;container.order.push(item);}}
      this.containers.set(key,container);
    }return container;
  }
  furnishTowns() {
    for(const town of this.towns)for(const [dx,dz] of [[-5,-5],[5,-5],[0,5]]) {
      const x=town.x+dx,y=town.y,z=town.z+dz;
      this.raw(x,y,z+3,20);this.raw(x,y+1,z+3,25);this.doors.set(`${x},${y},${z+3}`,{x,y,z:z+3,facing:0,open:false});
      for(const [wx,wz,facing] of [[x-3,z,1],[x+3,z,1],[x,z-3,0]]){this.raw(wx,y+1,wz,21);this.facing.set(`${wx},${y+1},${wz}`,facing);}
      this.raw(x-1,y,z+1,22);this.raw(x-2,y,z+1,23);this.raw(x+2,y,z+1,24);this.ensureContainer(x+2,y,z+1);
    }
  }
  attachTorch(sx,sy,sz,nx,ny,nz) {
    if(![sx,sy,sz,nx,ny,nz].every(Number.isInteger)||Math.abs(nx)+Math.abs(ny)+Math.abs(nz)!==1||ny<0||!this.get(sx,sy,sz)||!this.inside(sx+nx,sy+ny,sz+nz)||this.get(sx+nx,sy+ny,sz+nz)||this.torches.size>=2048)return null;
    const key=[sx,sy,sz,nx,ny,nz].join(',');
    if(this.torches.has(key))return null;
    this.torches.set(key,{sx,sy,sz,nx,ny,nz});this.revision++;return key;
  }
  removeTorch(key) {
    const t=this.torches.get(key);if(!t)return null;
    this.torches.delete(key);this.revision++;return torchPosition(t);
  }
  harvestSupply(x,y,z,now=Date.now(),loot=true) {
    const site=this.supplies.find(s=>s.x===x&&s.y===y&&s.z===z);
    if(!site||this.get(x,y,z)!==19)return;
    const container=this.ensureContainer(x,y,z);site.nextAt ||= now+SUPPLY_REGEN_MS;
    if(loot)for(let id=1;id<container.counts.length;id++)for(let n=0;n<container.counts[id];n++)this.pendingDrops.push({x,y,z,id});
    container.counts.fill(0);container.order=[];
  }
  updateSupplies(now=Date.now(), players=[]) {
    let changed=false;
    for(const site of this.supplies)if(site.nextAt>0&&now>=site.nextAt&&[0,19].includes(this.get(site.x,site.y,site.z))&&this.get(site.x,site.y-1,site.z)&&!players.some(p=>overlapsBlock(p.position??p,site.x,site.y,site.z))) {
      if(!this.get(site.x,site.y,site.z)){this.set(site.x,site.y,site.z,19);site.nextAt=0;changed=true;continue;}
      const container=this.ensureContainer(site.x,site.y,site.z);
      if(container.counts.some(n=>n>0))continue;
      for(const [id,count] of site.loot)container.counts[id]=count;container.order=site.loot.map(([id])=>id);
      site.nextAt=0;this.revision++;changed=true;
    }
    return changed;
  }
  flushDrops(drops) {
    while(this.pendingDrops.length&&drops.add(this.pendingDrops[0]))this.pendingDrops.shift();
  }
  surface(x, z) {
    for (let y = HEIGHT - 1; y >= 0; y--) if (this.get(x, y, z)) return y + 1;
    return 1;
  }
  generate() {
    const phase = (this.number % 1000) / 100;
    for (let x = 0; x < SIZE; x++)
      for (let z = 0; z < SIZE; z++) {
        const h =
          Math.abs(x - 32) < 5 && Math.abs(z - 32) < 5
            ? 13
            : Math.floor(
                12 +
                  Math.sin(x * 0.12 + phase) * 2.4 +
                  Math.cos(z * 0.14 - phase) * 2 +
                  Math.sin((x + z) * 0.23) * 1.2,
              );
        for (let y = 0; y < h; y++)
          this.raw(x, y, z, y === h - 1 ? 1 : y > h - 4 ? 2 : 3);
      }
    if(this.generation>=2) {
      const noise=(x,z)=>hash(x,z,this.number);
      generateOres(this,noise);generateSettlements(this,noise);
    }
    for (let x = 3; x < SIZE - 3; x++)
      for (let z = 3; z < SIZE - 3; z++)
        if (hash(x, z, this.number) > 0.977 && Math.hypot(x - 32, z - 32) > 8 && !this.towns.some(t=>Math.abs(t.x-x)<=11&&Math.abs(t.z-z)<=11)) {
          const y = this.surface(x, z);
          for (let k = 0; k < 4; k++) this.raw(x, y + k, z, 4);
          for (let dx = -2; dx <= 2; dx++)
            for (let dz = -2; dz <= 2; dz++)
              for (let dy = 2; dy <= 5; dy++)
                if (
                  Math.abs(dx) + Math.abs(dz) + Math.abs(dy - 3) < 5 &&
                  !this.get(x + dx, y + dy, z + dz)
                )
                  this.raw(x + dx, y + dy, z + dz, 5);
        }
  }
  snapshot() {
    return {
      format: "wildblocks",
      version: 1,
      generation: this.generation,
      doors: [...this.doors.values()].map(d=>({...d})),
      facing: [...this.facing].map(([key,facing])=>({key,facing})),
      containers: [...this.containers.values()].map(c=>({...c,counts:[...c.counts],order:[...c.order]})),
      torches: [...this.torches.values()],
      supplies: this.supplies.map(({x,y,z,nextAt})=>({x,y,z,nextAt})),
      pendingDrops: this.pendingDrops.map(d=>({...d})),
      seed: this.seed,
      edits: [...this.edits].map(([key, id]) => [
        ...key.split(",").map(Number),
        id,
      ]),
    };
  }
  static restore(save) {
    if (
      !save ||
      save.format !== "wildblocks" ||
      save.version !== 1 ||
      typeof save.seed !== "string" ||
      save.seed.length > 64 ||
      !Array.isArray(save.edits) ||
      save.edits.length > SIZE * SIZE * HEIGHT
    )
      throw Error("This is not a valid Wildblocks world.");
    if(save.generation!==undefined&&![1,2,3].includes(save.generation))throw Error("Unknown terrain generation.");
    const w = new World(save.seed,save.generation??1);
    w.restoring=true;
    const legacyTorches=[];
    for (const row of save.edits) {
      if (
        !Array.isArray(row) ||
        row.length !== 4 ||
        !row.every(Number.isInteger) ||
        !(row[3]===10 ? (legacyTorches.push(row),true) : w.set(...row))
      )
        throw Error("The world contains an invalid block edit.");
    }
    w.restoring=false;
    if(save.doors!==undefined){if(!Array.isArray(save.doors)||save.doors.length>2048)throw Error("Invalid doors.");for(const d of save.doors){if(!d||w.get(d.x,d.y,d.z)!==20||w.get(d.x,d.y+1,d.z)!==25||!Number.isInteger(d.facing)||d.facing<0||d.facing>3||typeof d.open!=="boolean")throw Error("Invalid door state.");w.doors.set(`${d.x},${d.y},${d.z}`,{...d});}}
    if(save.facing!==undefined){if(!Array.isArray(save.facing)||save.facing.length>SIZE*SIZE*HEIGHT)throw Error("Invalid furniture orientation.");for(const r of save.facing){if(!r||typeof r.key!=="string"||!/^\d+,\d+,\d+$/.test(r.key)||!Number.isInteger(r.facing)||r.facing<0||r.facing>3)throw Error("Invalid furniture orientation.");w.facing.set(r.key,r.facing);}}
    if(save.containers!==undefined){if(!Array.isArray(save.containers)||save.containers.length>2048)throw Error("Invalid storage.");for(const c of save.containers){const actual=c&&w.ensureContainer(c.x,c.y,c.z);if(!actual||!Array.isArray(c.counts)||c.counts.length!==MATERIALS.length||c.counts[0]!==0||c.counts.some((n,id)=>!Number.isInteger(n)||n<0||n>9999||(id===19||id===25)&&n>0)||!Array.isArray(c.order)||c.order.some(id=>!Number.isInteger(id)||id<1||id>=MATERIALS.length)||new Set(c.order).size!==c.order.length)throw Error("Invalid chest contents.");actual.counts=[...c.counts];actual.order=[...c.order].filter(id=>actual.counts[id]>0);for(let id=1;id<actual.counts.length;id++)if(actual.counts[id]>0&&!actual.order.includes(id))actual.order.push(id);}}
    for(const row of legacyTorches)w.set(...row);
    if(save.torches!==undefined) {
      if(!Array.isArray(save.torches)||save.torches.length>2048)throw Error("Invalid attached torches.");
      for(const t of save.torches)if(!t||!w.attachTorch(t.sx,t.sy,t.sz,t.nx,t.ny,t.nz))throw Error("Invalid torch support.");
    }
    if(save.supplies!==undefined) {
      if(!Array.isArray(save.supplies)||save.supplies.length>w.supplies.length)throw Error("Invalid town supplies.");
      for(const record of save.supplies){const site=w.supplies.find(s=>s.x===record.x&&s.y===record.y&&s.z===record.z);if(!site||!Number.isFinite(record.nextAt)||record.nextAt<0)throw Error("Invalid refill timer.");site.nextAt=record.nextAt;}
    }
    if(save.pendingDrops!==undefined){if(!Array.isArray(save.pendingDrops)||save.pendingDrops.length>8192||save.pendingDrops.some(d=>!d||![d.x,d.y,d.z].every(Number.isFinite)||d.x<0||d.z<0||d.x>=SIZE||d.z>=SIZE||d.y<0||d.y>HEIGHT||!Number.isInteger(d.id)||d.id<1||d.id>=MATERIALS.length))throw Error("Invalid pending resource drops.");w.pendingDrops.push(...save.pendingDrops);}
    return w;
  }
}
export function overlapsBlock(pos, x, y, z) {
  return (
    pos.x + 0.3 > x &&
    pos.x - 0.3 < x + 1 &&
    pos.y + 1.8 > y &&
    pos.y < y + 1 &&
    pos.z + 0.3 > z &&
    pos.z - 0.3 < z + 1
  );
}
export function collides(w, p) {
  if (
    p.x - 0.3 < 0 ||
    p.z - 0.3 < 0 ||
    p.x + 0.3 > SIZE ||
    p.z + 0.3 > SIZE ||
    p.y < 0
  )
    return true;
  for(const door of w.doors.values())if(Math.abs(door.x+.5-p.x)<2&&Math.abs(door.z+.5-p.z)<2&&overlapsBounds(p,doorBounds(door)))return true;
  for (let x = Math.floor(p.x - 0.3); x <= Math.floor(p.x + 0.3); x++)
    for (let y = Math.floor(p.y); y <= Math.floor(p.y + 1.8 - 0.00001); y++)
      for (let z = Math.floor(p.z - 0.3); z <= Math.floor(p.z + 0.3); z++)
        if (w.get(x,y,z)) {
          const id=w.get(x,y,z);
          if(id===20||id===25)continue;
          else if(id===21){if(overlapsBounds(p,windowBounds(w,x,y,z)))return true;}
          else if(overlapsBlock(p,x,y,z))return true;
        }
  return false;
}
export function movePlayer(w, p, v, dt) {
  let grounded = false;
  for (const axis of ["x", "z", "y"]) {
    const distance = v[axis] * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(distance) / 0.15));
    for (let i = 0; i < steps; i++) {
      const next = { ...p, [axis]: p[axis] + distance / steps };
      if (collides(w, next)) {
        if (axis === "y" && v.y < 0) grounded = true;
        v[axis] = 0;
        break;
      }
      p[axis] = next[axis];
    }
  }
  return grounded;
}
function blockRaycast(w, origin, dir, reach = 7) {
  let x = Math.floor(origin.x),
    y = Math.floor(origin.y),
    z = Math.floor(origin.z);
  const step = {},
    delta = {},
    t = {};
  for (const a of ["x", "y", "z"]) {
    step[a] = dir[a] >= 0 ? 1 : -1;
    delta[a] = dir[a] === 0 ? Infinity : Math.abs(1 / dir[a]);
    t[a] =
      dir[a] === 0
        ? Infinity
        : ((step[a] > 0 ? Math.floor(origin[a]) + 1 : Math.floor(origin[a])) -
            origin[a]) /
          dir[a];
  }
  let distance = 0,
    normal = { x: 0, y: 0, z: 0 };
  while (distance <= reach) {
    const id=w.get(x,y,z);
    if(id && id!==20 && id!==25) {
      if(id!==21)return {x,y,z,normal,id,distance};
      const pane=rayBounds(origin,dir,windowBounds(w,x,y,z),reach);if(pane)return {x,y,z,id,normal:pane.normal,distance:pane.distance};
    }
    const a = t.x < t.y ? (t.x < t.z ? "x" : "z") : t.y < t.z ? "y" : "z";
    distance = t[a];
    t[a] += delta[a];
    if (a === "x") x += step[a];
    if (a === "y") y += step[a];
    if (a === "z") z += step[a];
    normal = { x: 0, y: 0, z: 0, [a]: -step[a] };
  }
  return null;
}

export function torchPosition(t) { return {x:t.sx+.5+t.nx*.62,y:t.sy+(t.ny===1?1.35:.6),z:t.sz+.5+t.nz*.62}; }
export function raycast(w,origin,dir,reach=7,attachments=true) {
  let best=blockRaycast(w,origin,dir,reach);
  for(const [doorKey,d] of w.doors??[]){const hit=rayBounds(origin,dir,doorBounds(d),best?.distance??reach);if(hit)best={x:d.x,y:d.y,z:d.z,id:20,doorKey,...hit};}
  if(!attachments)return best;
  for(const [torchKey,t] of w.torches??[]) {
    const p=torchPosition(t);let near=0,far=best?.distance??reach;
    for(const axis of ['x','y','z']) {
      const lo=p[axis]-(axis==='y'?.3:.16),hi=p[axis]+(axis==='y'?.45:.16);
      if(Math.abs(dir[axis])<1e-9){if(origin[axis]<lo||origin[axis]>hi){near=Infinity;break;}continue;}
      const a=(lo-origin[axis])/dir[axis],b=(hi-origin[axis])/dir[axis];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    }
    if(near<=far&&near<=reach)best={...p,x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z),id:10,torchKey,distance:near,normal:{x:t.nx,y:t.ny,z:t.nz}};
  }
  return best;
}

function overlapsBounds(p,b){return p.x+.3>b.min.x&&p.x-.3<b.max.x&&p.y+1.8>b.min.y&&p.y<b.max.y&&p.z+.3>b.min.z&&p.z-.3<b.max.z;}
function rotatedBounds(x,y,z,b,turns){const points=[];const a=turns*Math.PI/2;for(const px of [b[0],b[3]])for(const pz of [b[2],b[5]])points.push({x:x+.5+(px-.5)*Math.cos(a)-(pz-.5)*Math.sin(a),z:z+.5+(px-.5)*Math.sin(a)+(pz-.5)*Math.cos(a)});return {min:{x:Math.min(...points.map(p=>p.x)),y:y+b[1],z:Math.min(...points.map(p=>p.z))},max:{x:Math.max(...points.map(p=>p.x)),y:y+b[4],z:Math.max(...points.map(p=>p.z))}};}
export function doorBounds(d){return rotatedBounds(d.x,d.y,d.z,d.open?[-.06,0,.5,.06,2,1.5]:[0,0,.44,1,2,.56],d.facing);}
function windowBounds(w,x,y,z){return rotatedBounds(x,y,z,[0,0,.43,1,1,.57],w.facing.get(`${x},${y},${z}`)??0);}
function rayBounds(origin,dir,b,reach){let near=0,far=reach,normal={x:0,y:0,z:0};for(const axis of ['x','y','z']){if(Math.abs(dir[axis])<1e-9){if(origin[axis]<b.min[axis]||origin[axis]>b.max[axis])return null;continue;}const a=(b.min[axis]-origin[axis])/dir[axis],c=(b.max[axis]-origin[axis])/dir[axis],entry=Math.min(a,c);if(entry>near){near=entry;normal={x:0,y:0,z:0,[axis]:dir[axis]>0?-1:1};}far=Math.min(far,Math.max(a,c));if(near>far)return null;}return near<=reach?{distance:near,normal}:null;}
