import { collides, movePlayer, raycast, SIZE, torchPosition } from './world.js';
export const CYCLE_SECONDS = 720;
export const MAX_HEALTH = 20;
export function dayState(seconds) {
  const phase = ((seconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS / CYCLE_SECONDS;
  const daylight = Math.max(0, Math.sin(phase * Math.PI * 2));
  return { phase, daylight, night: phase >= 0.5, label: phase < 0.05 ? 'Dawn' : phase < 0.45 ? 'Day' : phase < 0.5 ? 'Dusk' : phase < 0.95 ? 'Night' : 'Before dawn' };
}
export function protection(tools) {
  return Math.min(0.6, (tools.has('starsteel-armor') ? 0.6 : tools.has('iron-armor') ? 0.5 : tools.has('slate-armor') ? 0.4 : tools.has('woven-armor') ? 0.2 : 0) + (tools.has('slate-helmet') ? 0.2 : 0));
}
export function weapon(tools) {
  return tools.has('iron-sword') ? {name:'Iron sword',damage:10} : tools.has('slate-sword') ? { name: 'Slate sword', damage: 7 } : tools.has('wood-sword') ? { name: 'Timber sword', damage: 4 } : { name: 'Empty hands', damage: 1 };
}
export function playerVitals(saved) {
  return { health: Number.isFinite(saved?.health) ? Math.max(1, Math.min(MAX_HEALTH, saved.health)) : MAX_HEALTH, hurt: 0, attackCooldown: 0, respawns: Number.isSafeInteger(saved?.respawns) && saved.respawns>=0 ? saved.respawns : 0, regen: 0 };
}
export function torchesIn(world) { return [...world.torches.values()].map(t=>{const p=torchPosition(t);return {...p,y:p.y+.3};}); }
export function torchSafe(point, torches) {
  return torches.some(t => Math.hypot(t.x-point.x, t.y-point.y, t.z-point.z) < 7);
}
export class Survival {
  constructor(saved) {
    this.elapsed = Number.isFinite(saved?.elapsed) && saved.elapsed >= 0 ? saved.elapsed : 60;
    this.monsters = [];
    this.spawnIn = 4;
    this.nextId = 1;
    this.torches = [];
    this.torchRevision = -1;
  }
  snapshot() { return { elapsed: this.elapsed }; }
  state() { return { elapsed: this.elapsed, monsters: this.monsters.map(m => ({ id:m.id, x:m.position.x, y:m.position.y, z:m.position.z, health:m.health })) }; }
  update(world, dt, players, mode = 'survival', random = Math.random) {
    dt = Math.max(0, Math.min(dt, 0.1));
    this.elapsed += dt;
    // Recompute only when the terrain changes, including torch placement/removal.
    if (this.torchRevision !== world.revision || this.torchWorld !== world) {
      this.torches = torchesIn(world); this.torchRevision = world.revision; this.torchWorld = world;
    }
    const night = dayState(this.elapsed).night;
    for (const p of players) {
      p.vitals.hurt = Math.max(0, p.vitals.hurt-dt);
      p.vitals.attackCooldown = Math.max(0,p.vitals.attackCooldown-dt);
      if (!night || mode === 'creative') {
        p.vitals.regen += dt;
        if (p.vitals.regen >= 5) { p.vitals.health = Math.min(MAX_HEALTH,p.vitals.health+1); p.vitals.regen=0; }
      }
    }
    if (!night || mode === 'creative') { this.monsters=[]; this.spawnIn=4; return; }
    const targets = players.filter(p => p.active);
    this.spawnIn -= dt;
    if (targets.length && this.spawnIn <= 0 && this.monsters.length < 6) {
      this.spawnIn=8;
      const target=targets[Math.floor(random()*targets.length)];
      for(let attempt=0;attempt<12;attempt++) {
        const angle=random()*Math.PI*2, radius=10+random()*8;
        const x=target.position.x+Math.cos(angle)*radius,z=target.position.z+Math.sin(angle)*radius;
        const position={x,y:world.surface(Math.floor(x),Math.floor(z))+0.05,z};
        if(x<1||z<1||x>SIZE-1||z>SIZE-1||collides(world,position)||torchSafe(position,this.torches)) continue;
        this.monsters.push({id:this.nextId++,position,velocity:{x:0,y:0,z:0},health:12,attack:0}); break;
      }
    }
    for(const m of this.monsters) {
      m.attack=Math.max(0,m.attack-dt);
      const p=targets.slice().sort((a,b)=>distance(m.position,a.position)-distance(m.position,b.position))[0];
      if(!p) continue;
      const dx=p.position.x-m.position.x,dz=p.position.z-m.position.z,length=Math.hypot(dx,dz)||1;
      const step={x:m.position.x+dx/length*0.8,y:m.position.y,z:m.position.z+dz/length*0.8};
      const safe=torchSafe(step,this.torches);
      m.velocity.x=safe?0:dx/length*1.45; m.velocity.z=safe?0:dz/length*1.45;
      m.velocity.y=Math.max(-24,m.velocity.y-24*dt);
      if(collides(world,step)&&Math.abs(m.velocity.y)<2) m.velocity.y=6;
      movePlayer(world,m.position,m.velocity,dt);
      if(distance(m.position,p.position)<1.35 && !safe && m.attack<=0 && p.vitals.hurt<=0 && this.canSee(world,m.position,p.position)) {
        p.vitals.health=Math.max(0,p.vitals.health-Math.max(1,5*(1-protection(p.tools))));
        p.vitals.hurt=1; m.attack=1.2; p.vitals.regen=0;
        if(p.vitals.health<=0) {
          Object.assign(p.position,{x:32.5,y:world.surface(32,32)+0.05,z:32.5});
          p.vitals.health=MAX_HEALTH; p.vitals.hurt=5; p.vitals.respawns++;
        }
      }
    }
  }
  canSee(world,a,b) {
    const start={x:a.x,y:a.y+1,z:a.z},end={x:b.x,y:b.y+1,z:b.z},length=distance(start,end);
    if(length<0.01)return true;
    return !raycast(world,start,{x:(end.x-start.x)/length,y:(end.y-start.y)/length,z:(end.z-start.z)/length},Math.max(0,length-0.15),false);
  }
  attack(world, player, direction, mode='survival') {
    if(mode==='creative'||!player.active||player.vitals.attackCooldown>0)return false;
    player.vitals.attackCooldown=0.45;
    const origin={x:player.position.x,y:player.position.y+1.3,z:player.position.z};
    const hit=this.monsters.filter(m=>{
      const v={x:m.position.x-origin.x,y:m.position.y+0.9-origin.y,z:m.position.z-origin.z},n=Math.hypot(v.x,v.y,v.z);
      return n<=3.5&&n>0.01&&(v.x*direction.x+v.y*direction.y+v.z*direction.z)/n>0.82&&this.canSee(world,player.position,m.position);
    }).sort((a,b)=>distance(a.position,player.position)-distance(b.position,player.position))[0];
    if(!hit)return false;
    hit.health-=weapon(player.tools).damage;
    if(hit.health<=0)this.monsters=this.monsters.filter(m=>m!==hit);
    return true;
  }
}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
