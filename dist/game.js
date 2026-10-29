import { canReachContainer, containerView, transferContainer } from "./interactions.js";
import { resumePlayer, playerSnapshot, viewDirection, directionView } from "./player-state.js";
import { Survival, playerVitals, dayState, weapon, protection, MAX_HEALTH, torchesIn } from "./survival.js";
import { ServerConnection } from "./network.js";
import { TOOLS, TOOL_REACH, PLACE_REACH, miningRule } from "./tools.js";
import { Drops } from "./drops.js";
import { Progression, SKILLS, skillFor } from "./progression.js";
import {
  RECIPES,
  craft,
  craftProblem,
  restoreTools,
  nearCraftingTable,
  nearStation,
} from "./crafting.js";
import { Gathering } from "./gathering.js";
import * as THREE from "./vendor/three.module.js";
import {
  World,
  SIZE,
  HEIGHT,
  CHUNK,
  MATERIALS,
  hash,
  movePlayer,
  raycast,
  overlapsBlock,
  torchPosition,
} from "./world.js";
const $ = (id) => document.getElementById(id),
  storageKey = "wildblocks.gathering.v2";
let sessionStarted = false;
let initialPlayerState;
let survival = new Survival(), vitals = playerVitals(), remoteSurvival = null, selectedRecipe = "boards";
let mode = "survival",
  drops,
  progression,
  tools;
let world,
  gathering,
  miningHeld = false,
  selected = 0,
  yaw = 0,
  pitch = -0.15,
  active = false,
  fallback = false,
  grounded = false,
  last = 0,
  saveTimer,
  toastTimer;
const position = { x: 32.5, y: 15, z: 32.5 },
  velocity = { x: 0, y: 0, z: 0 },
  keys = new Set();
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 2600);
}
try {
  const stored =
    localStorage.getItem(storageKey) ||
    localStorage.getItem("wildblocks.world.v1");
  const saved = stored ? JSON.parse(stored) : null;
  world = saved ? World.restore(saved) : new World();
  gathering = new Gathering(saved?.inventory, saved?.bag);
  drops = new Drops(saved?.drops);
  progression = new Progression(saved?.skills);
  tools = restoreTools(saved?.tools);
  survival = new Survival(saved?.survival);
  vitals = playerVitals(saved?.vitals);
  mode = saved?.mode === "creative" ? "creative" : "survival";
  initialPlayerState = resumePlayer(world,saved?.player);
} catch {
  world = new World();
  gathering = new Gathering();
  drops = new Drops();
  progression = new Progression();
  tools = new Set();
  initialPlayerState = resumePlayer(world);
  toast("Could not restore the last world. A fresh world is ready.");
}
$("seed").value = world.seed;
$("world-name").textContent = world.seed;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: $("view"),
    antialias: true,
    powerPreference: "high-performance",
  });
} catch {
  document.querySelector("#menu p").textContent =
    "WebGL is unavailable. Please open this game in a current browser with hardware acceleration enabled.";
  $("play").disabled = true;
  throw Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0xb7d2cf);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb7d2cf, 35, 90);
const camera = new THREE.PerspectiveCamera(
  72,
  innerWidth / innerHeight,
  0.06,
  140,
);
camera.rotation.order = "YXZ";
const ambient = new THREE.HemisphereLight(0xf2f6e4, 0x576b53, 2.3);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffe5bc, 2.1);
sun.position.set(-20, 50, 15);
scene.add(sun);
const material = new THREE.MeshLambertMaterial({ vertexColors: true });
const meshes = new Map();
// Winding follows each outward normal; shared faces are omitted.
const faces = [
  {
    n: [1, 0, 0],
    v: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    light: 0.83,
  },
  {
    n: [-1, 0, 0],
    v: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    light: 0.72,
  },
  {
    n: [0, 1, 0],
    v: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    light: 1,
  },
  {
    n: [0, -1, 0],
    v: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    light: 0.6,
  },
  {
    n: [0, 0, 1],
    v: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    light: 0.88,
  },
  {
    n: [0, 0, -1],
    v: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
    light: 0.77,
  },
];
const palette = MATERIALS.map((m) => (m ? new THREE.Color(m.color) : null));
function buildChunk(cx, cz) {
  const key = `${cx},${cz}`,
    old = meshes.get(key);
  if (old) {
    scene.remove(old);
    old.geometry.dispose();
  }
  const positions = [],
    normals = [],
    colors = [];
  for (let x = cx * CHUNK; x < Math.min(SIZE, (cx + 1) * CHUNK); x++)
    for (let z = cz * CHUNK; z < Math.min(SIZE, (cz + 1) * CHUNK); z++)
      for (let y = 0; y < HEIGHT; y++) {
        const id = world.get(x, y, z);
        if (!id || [20,25].includes(id)) continue;
        if ([9,15,16,17,19,21,22,23,24].includes(id)) {
          const legs=[[.07,0,.07,.12,.7,.12,.8],[.81,0,.07,.12,.7,.12,.8],[.07,0,.81,.12,.7,.12,.8],[.81,0,.81,.12,.7,.12,.8]];
          const pieces = id===21 ? [[0,0,.43,.1,1,.14,.8],[.9,0,.43,.1,1,.14,.8],[.1,0,.43,.8,.1,.14,.8],[.1,.9,.43,.8,.1,.14,.8],[.48,.1,.43,.04,.8,.14,.8]] : id===22 ? [...legs,[0,.7,0,1,.14,1,1.15]] : id===23 ? [...legs,[0,.45,0,1,.13,1,1.1],[0,.58,.85,1,.42,.12,.9]] : id===24 ? [[.04,0,.06,.92,.72,.88,.85],[.02,.72,.04,.96,.17,.92,1.15],[.43,.5,.025,.14,.24,.05,.45]] : id===15 ? [[0,0,0,1,1,1,.9],[.15,.2,-.015,.7,.5,.02,.2],[.1,.12,-.025,.8,.08,.03,1.3]] : id===16 ? [[.2,0,.2,.6,.18,.6,.8],[.35,.18,.35,.3,.45,.3,.75],[.04,.6,.1,.92,.3,.8,1.2],[.85,.6,.3,.2,.2,.35,1]] : id===17 ? [[.05,0,.05,.9,.35,.9,.8],[.12,.35,.42,.76,.42,.12,1.3]] : id===19 ? [[0,0,0,1,1,1,.9],[0,.18,-.01,1,.08,.02,.45],[0,.72,-.01,1,.08,.02,.45],[.15,0,-.02,.1,1,.02,.6],[.75,0,-.02,.1,1,.02,.6]] : [
            [0, 0.76, 0, 1, 0.24, 1, 1.2],
            [0.06, 0, 0.06, 0.16, 0.76, 0.16, 0.8],
            [0.78, 0, 0.06, 0.16, 0.76, 0.16, 0.8],
            [0.06, 0, 0.78, 0.16, 0.76, 0.16, 0.8],
            [0.78, 0, 0.78, 0.16, 0.76, 0.16, 0.8],
            [0, 1, 0.3, 1, 0.015, 0.025, 0.6],
            [0, 1, 0.65, 1, 0.015, 0.025, 0.6],
          ];
          for (const [bx, by, bz, bw, bh, bd, tint] of pieces)
            for (const f of faces)
              for (const i of [0, 1, 2, 0, 2, 3]) {
                const v = f.v[i],
                  c = palette[id===21?7:id];
                positions.push(
                  ...furnitureVertex(x,y,z,bx+v[0]*bw,by+v[1]*bh,bz+v[2]*bd,id),
                );
                normals.push(...f.n);
                colors.push(
                  c.r * f.light * tint,
                  c.g * f.light * tint,
                  c.b * f.light * tint,
                );
              }
          continue;
        }
        for (const f of faces) {
          const neighbor = world.get(x + f.n[0], y + f.n[1], z + f.n[2]);
          if (neighbor && ![9,16,17,20,21,22,23,24,25].includes(neighbor)) continue;
          const shade =
            f.light * (0.93 + hash(x + y * 13, z, world.number) * 0.14);
          const color = [11,12].includes(id) ? palette[3] : palette[id];
          for (const i of [0, 1, 2, 0, 2, 3]) {
            const v = f.v[i];
            positions.push(x + v[0], y + v[1], z + v[2]);
            normals.push(...f.n);
            colors.push(color.r * shade, color.g * shade, color.b * shade);
          }
          if([11,12].includes(id))for(const [u,v] of [[.2,.25],[.62,.6]]) {
            const base=f.v[0],a=f.v[1].map((n,k)=>n-base[k]),b=f.v[3].map((n,k)=>n-base[k]);
            const patch=[[u,v],[u+.18,v],[u+.18,v+.2],[u,v+.2]],c=palette[id];
            for(const i of [0,1,2,0,2,3]){const [pu,pv]=patch[i];positions.push(x+base[0]+a[0]*pu+b[0]*pv+f.n[0]*.002,y+base[1]+a[1]*pu+b[1]*pv+f.n[1]*.002,z+base[2]+a[2]*pu+b[2]*pv+f.n[2]*.002);normals.push(...f.n);colors.push(c.r*f.light,c.g*f.light,c.b*f.light);}
          }
        }
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  meshes.set(key, mesh);
}
function rebuild() {
  for (let x = 0; x < SIZE / CHUNK; x++)
    for (let z = 0; z < SIZE / CHUNK; z++) buildChunk(x, z);
}
function refreshNear(x, z) {
  const chunks = new Set([`${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`]);
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    if (x + dx >= 0 && x + dx < SIZE && z + dz >= 0 && z + dz < SIZE)
      chunks.add(
        `${Math.floor((x + dx) / CHUNK)},${Math.floor((z + dz) / CHUNK)}`,
      );
  for (const key of chunks) buildChunk(...key.split(",").map(Number));
}
const outline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)),
  new THREE.LineBasicMaterial({ color: 0xf8ffe6 }),
);
outline.visible = false;
scene.add(outline);
const crackCanvas = document.createElement("canvas");
crackCanvas.width = crackCanvas.height = 64;
const crackContext = crackCanvas.getContext("2d"),
  crackTexture = new THREE.CanvasTexture(crackCanvas);
const cracks = new THREE.Mesh(
  new THREE.BoxGeometry(1.009, 1.009, 1.009),
  new THREE.MeshBasicMaterial({
    map: crackTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.8,
  }),
);
cracks.visible = false;
scene.add(cracks);
let crackStage = -1;
function updateCracks(target, progress) {
  cracks.visible = !!target && progress > 0;
  if (!cracks.visible) return;
  cracks.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
  const stage = Math.floor(progress * 9);
  if (stage === crackStage) return;
  crackStage = stage;
  crackContext.clearRect(0, 0, 64, 64);
  crackContext.strokeStyle = "#213027";
  crackContext.lineWidth = 1.5;
  for (let i = 0; i <= stage; i++) {
    const angle = i * 2.399;
    crackContext.beginPath();
    crackContext.moveTo(32, 32);
    crackContext.lineTo(32 + Math.cos(angle) * 15, 32 + Math.sin(angle) * 15);
    crackContext.lineTo(
      32 + Math.cos(angle + 0.25) * 32,
      32 + Math.sin(angle + 0.25) * 32,
    );
    crackContext.stroke();
  }
  crackTexture.needsUpdate = true;
}

function spawn() {
  position.x = 32.5;
  position.z = 32.5;
  position.y = world.surface(32, 32) + 0.05;
  velocity.x = velocity.y = velocity.z = 0;
  yaw=0;pitch=-.15;
}
function snapshot() {
  return {
    ...world.snapshot(),
    player: playerSnapshot(position,yaw,pitch),
    mode,
    survival: survival.snapshot(),
    vitals: { health: vitals.health, respawns: vitals.respawns },
    inventory: gathering.snapshot(),
    bag: gathering.layout(),
    drops: drops.snapshot(),
    skills: progression.snapshot(),
    tools: [...tools],
  };
}
function visibleItems() {
  gathering.syncOrder();
  return mode === "creative"
    ? MATERIALS.map((m,i)=>m && (m.placeable!==false||i===10)?i:0).filter(Boolean)
    : gathering.order;
}
function selectedMaterial() {
  return visibleItems()[selected] ?? null;
}
function inventoryUI() {
  const items = visibleItems(),
    capacity = mode === "creative" ? visibleItems().length : gathering.capacity;
  selected = Math.min(selected, capacity - 1);
  $("hotbar").replaceChildren();
  for (let i = 0; i < capacity; i++) {
    const id = items[i],
      m = id ? MATERIALS[id] : null,
      b = document.createElement("button");
    b.className =
      "slot" + (id ? "" : " empty") + (selected === i ? " active" : "");
    b.dataset.material = String(id ?? 0);
    b.setAttribute("aria-pressed", String(selected === i));
    b.setAttribute(
      "aria-label",
      id
        ? `${m.name}: ${mode === "creative" ? "unlimited" : gathering.counts[id] + " collected"}`
        : `Empty slot ${i + 1}`,
    );
    b.title = m?.name ?? "";
    if (id)
      b.innerHTML = `<small>${i + 1}</small><span class="swatch" aria-hidden="true" style="--material-color:${m.color}"></span><b class="count">${mode === "creative" ? "∞" : gathering.counts[id]}</b>`;
    b.onclick = () => select(i);
    $("hotbar").append(b);
  }
  $("backpack").textContent =
    mode === "creative"
      ? "Creative · unlimited blocks"
      : `Backpack · ${items.length}/${capacity} slots · ${gathering.counts.reduce((a, b) => a + b, 0)} blocks`;
  workshopUI();
}
function nearbyStations(){return [15,16,17].filter(id=>nearStation(world,position,id));}
function workshopUI() {
  $("station-status").textContent = nearCraftingTable(world, position)
    ? "Crafting table in range"
    : "Hand crafting · place a crafting table nearby";
  $("station-status").textContent += nearbyStations().map(id=>" · "+MATERIALS[id].name).join("");
  const c = progression.character;
  $("character-level").textContent =
    `Level ${c.level} · ${c.current} / ${c.needed} XP`;
  $("level-summary").textContent = `Character level ${c.level}`;
  $("character-progress").value = c.current;
  $("character-progress").max = c.needed;
  $("skill-list").innerHTML = SKILLS.map((name) => {
    const skill = progression.skill(name);
    return `<div class="skill-row"><span>${name}</span><b>Lv ${skill.level}</b><progress aria-label="${name} experience" max="${skill.needed}" value="${skill.current}"></progress><small>${skill.current} / ${skill.needed} XP</small></div>`;
  }).join("");
  $("equipment").textContent = tools.size
    ? `Equipment: ${TOOLS.filter((t) => tools.has(t.id))
        .map((t) => t.name)
        .join(", ")}. Best tool, sword and armor auto-equipped.`
    : "Empty hands · craft a Timber pick to break stone.";
  const bag = $("workshop-bag");
  bag.innerHTML = Array.from({length:gathering.capacity},(_,i) => {
    const id=gathering.order[i];
    return `<button class="slot ${id?'':'empty'}" data-bag-slot="${i}" data-material="${id||0}" aria-label="${id?MATERIALS[id].name+': '+gathering.counts[id]:'Empty slot '+(i+1)}">${id?`<span class="swatch" aria-hidden="true"></span><b class="count">${gathering.counts[id]}</b>`:''}</button>`;
  }).join('');
  const category = $("recipe-filter").value;
  const visible = RECIPES.filter(r => category === 'all' || (category==='advanced' ? r.category==='advanced' : category==='survival' ? ['torch','wood-sword','slate-sword','woven-armor','slate-armor','slate-helmet','backpack'].includes(r.key) : category==='tools' ? !!r.tool && !r.tool.includes('sword') && !r.tool.includes('armor') && !r.tool.includes('helmet') : !!r.output && r.key!=='torch'));
  if(!visible.some(r=>r.key===selectedRecipe)) selectedRecipe=visible[0]?.key;
  $("recipes").innerHTML = visible.map(r => {
    const problem = craftProblem(r,gathering,tools,mode,nearCraftingTable(world,position),progression,nearbyStations());
    return `<button class="recipe-tile ${problem?'unavailable':''}" data-recipe="${r.key}" aria-pressed="${r.key===selectedRecipe}"><img src="icons/${recipeIcon(r)}.svg" alt="" /><span>${r.name}</span><small>${problem?'Not ready':'Ready'}</small></button>`;
  }).join('');
  const recipe=RECIPES.find(r=>r.key===selectedRecipe);
  if(!recipe)return;
  $("ingredient-grid").innerHTML=Array.from({length:9},(_,i)=>{
    const ingredient=recipe.cost[i];
    return `<div class="ingredient">${ingredient?`<img src="icons/${materialIcon(ingredient[0])}.svg" alt="${MATERIALS[ingredient[0]].name}" /><b>${ingredient[1]}</b><small>${gathering.counts[ingredient[0]]} owned</small>`:''}</div>`;
  }).join('');
  $("craft-output").innerHTML=`<img src="icons/${recipeIcon(recipe)}.svg" alt="" /><strong>${recipe.name}${recipe.output?' ×'+recipe.output.count:''}</strong>`;
  $("recipe-description").textContent=recipe.description;
  const problem=craftProblem(recipe,gathering,tools,mode,nearCraftingTable(world,position),progression,nearbyStations());
  $("craft-problem").textContent=mode==='creative' && !problem?'Creative · no ingredients required':problem;
  $("craft-selected").disabled=!!problem;
  $("craft-selected").textContent='Craft '+recipe.name;
}
function materialIcon(id) { return ['','meadow','earth','slate','honeywood','canopy','terracotta','timber-boards','slate-bricks','crafting-table','torch','iron-ore','starstone','iron-ingot','starsteel','furnace','anvil','stonecutter','reinforced-bricks','supply-crate','door','window','table','chair','chest','door','glass'][id]; }
function recipeIcon(r) { return r.output?materialIcon(r.output.id):r.tool?.includes('sword')?'sword':r.tool?.includes('armor')||r.tool?.includes('helmet')?'armor':r.expand?'backpack':'tools'; }
$("recipe-filter").onchange=workshopUI;
$("workshop-bag").onclick=e=>{const slot=e.target.closest('[data-bag-slot]');if(slot)select(Number(slot.dataset.bagSlot));};
$("recipes").onclick=e=>{const b=e.target.closest('[data-recipe]');if(b){selectedRecipe=b.dataset.recipe;workshopUI();}};
function openWorkshop() {
  if (!sessionStarted) return;
  if (serverPage && !connected) {
    toast("Sign in to the server first.");
    return;
  }
  if (active) pause();
  workshopUI();
  $("workshop").hidden = false;
  $("menu").hidden = true;
  $("close-workshop").focus();
}
$("open-workshop").onclick = openWorkshop;
$("close-workshop").onclick = () => {
  $("workshop").hidden = true;
  $("menu").hidden = true;
  $("play").onclick();
};
$("craft-selected").onclick = async () => {
  const button = { dataset: {recipe:selectedRecipe} };
  if (connected) {
    try {
      sendInputNow();
      applyServerState(
        await network.request("craft", { key: button.dataset.recipe }),
      );
      toast("Crafted on server.");
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  if (
    craft(
      button.dataset.recipe,
      gathering,
      tools,
      progression,
      mode,
      nearCraftingTable(world, position),
      nearbyStations(),
    )
  ) {
    changed();
    toast(mode === "creative" ? "Crafted." : "Crafted · +20 Crafting XP");
  }
};
function changed() {
  inventoryUI();
  $("saved").textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}
function persist() {
  if (serverPage) {
    $("saved").textContent = connected
      ? `Server · ${serverName}`
      : "Sign in to server";
    return;
  }
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(storageKey, JSON.stringify(snapshot()));
    $("saved").textContent = "World saved on this device";
  } catch {
    $("saved").textContent = "Storage unavailable · export to keep your world";
  }
}
function select(id) {
  selected = id;
  document.querySelectorAll("#hotbar .slot").forEach((e, i) => {
    e.classList.toggle("active", i === id);
    e.setAttribute("aria-pressed", String(i === id));
  });
}
select(0);
$("mode").value = mode;
$("mode").onchange = () => {
  if (serverPage) return;
  mode = $("mode").value;
  miningHeld = false;
  gathering.reset();
  changed();
  toast(
    mode === "creative"
      ? "Creative: unlimited blocks and instant mining."
      : "Survival: gather blocks before building.",
  );
};
inventoryUI();
function syncUI() {
  miningHeld = false;
  gathering.reset();
  $("menu").hidden = !sessionStarted || active || !$("workshop").hidden || !$("container-panel").hidden;
  if (active) $("workshop").hidden = true;
  $("crosshair").hidden = !active;
  $("target").hidden = !active;
  keys.clear();
  sendInputNow();
  if (!active) {
    $("title").innerHTML = "A little pause.<br>A world of possibility.";
    $("play").innerHTML = "Back to the world <span>↗</span>";
    persist();
  }
}
function enterFallback() {
  if (active) return;
  fallback = true;
  active = true;
  syncUI();
  $("hint").textContent =
    "WASD · move   Arrows · look   Space · jump   Hold click / E · mine   Right click · build   C · inventory/craft   F · attack";
  toast("Arrow keys look around when mouse capture is unavailable.");
}
function pause() {
  fallback = false;
  active = false;
  if (document.pointerLockElement) document.exitPointerLock();
  syncUI();
}
function syncLock() {
  if (document.pointerLockElement === $("view")) {
    fallback = false;
    active = true;
    syncUI();
  } else if (!fallback) {
    active = false;
    syncUI();
  }
}
$("play").onclick = () => {
  if (serverPage && !connected) return;
  sessionStarted = true;
  document.body.classList.remove("welcome");
  $("welcome").hidden = true;
  try {
    const p = $("view").requestPointerLock();
    p?.catch(enterFallback);
  } catch {
    enterFallback();
  }
};
document.addEventListener("pointerlockchange", syncLock);
document.addEventListener("pointerlockerror", enterFallback);
document.addEventListener("mousemove", (e) => {
  if (active && !fallback) {
    const speed = 0.002 * Number($("sensitivity").value);
    yaw -= e.movementX * speed;
    pitch = Math.max(-1.5, Math.min(1.5, pitch - e.movementY * speed));
  }
});
addEventListener("keydown", (e) => {
  if (!active) {
    if ((e.code==="Escape"||e.code==="KeyR")&&!$("container-panel").hidden) {e.preventDefault();closeContainer();return;}
    if (e.code === "KeyC" && !$("workshop").hidden) { e.preventDefault(); if(!e.repeat) $("close-workshop").click(); return; }
    if (e.code === "Escape" && !$("workshop").hidden) {
      e.preventDefault();
      $("close-workshop").click();
    }
    if (
      e.code === "KeyC" &&
      !e.repeat &&
      !e.target.matches("input,select,button")
    ) {
      e.preventDefault();
      openWorkshop();
    }
    return;
  }
  if (e.code === "KeyR") {e.preventDefault();if(!e.repeat)useTarget();return;}
  if (e.code === "KeyF") { e.preventDefault(); attackCreature(); return; }
  if (e.code === "KeyC") {
    e.preventDefault();
    openWorkshop();
    return;
  }
  if (e.code === "Escape") {
    e.preventDefault();
    pause();
    return;
  }
  if (
    [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ShiftLeft",
    ].includes(e.code)
  )
    e.preventDefault();
  keys.add(e.code);
  if (fallback && !e.repeat) {
    if (e.code === "ArrowLeft") yaw += 0.08;
    if (e.code === "ArrowRight") yaw -= 0.08;
    if (e.code === "ArrowUp") pitch = Math.min(1.5, pitch + 0.08);
    if (e.code === "ArrowDown") pitch = Math.max(-1.5, pitch - 0.08);
  }
  if (/^Digit[1-9]$/.test(e.code))
    select(
      Math.min(
        Number(e.code.slice(-1)) - 1,
        (mode === "creative" ? visibleItems().length : gathering.capacity) - 1,
      ),
    );
  if (e.code === "Space" && grounded) {
    velocity.y = 8.3;
    grounded = false;
  }
});
addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "KeyE") sendInputNow();
});
addEventListener("blur", () => {
  keys.clear();
  if (active) pause();
});
const direction = new THREE.Vector3();
let hit = null;
let diagnosticTime = 0,
  lastDropSave = 0,
  lastPickupTime = -Infinity,
  pickupMode = mode,
  pickupXP = 0;
const pickupTotals = new Map();
function interact(button) {
  if (!active || !hit) return;
  if (hit.distance > (button===2 ? (mode==="creative"?7:PLACE_REACH) : miningRule(hit, tools, mode).reach)) {
    toast("Move closer to reach that block.");
    return;
  }
  if (button === 0) {
    miningHeld = true;
    return;
  }
  if (button !== 2) return;
  if (!keys.has("ShiftLeft")&&!keys.has("ShiftRight")&&useTarget()) return;
  const x = hit.x + hit.normal.x,
    y = hit.y + hit.normal.y,
    z = hit.z + hit.normal.z;
  const materialId = selectedMaterial();
  if (!materialId) {
    toast("That slot is empty. Gather a resource first.");
    return;
  }
  if(materialId!==10 && MATERIALS[materialId].placeable===false){toast(MATERIALS[materialId].name+" is a crafting ingredient.");return;}
  if (mode !== "creative" && gathering.counts[materialId] === 0) {
    toast(
      `No ${MATERIALS[materialId].name.toLowerCase()} collected yet. Hold left click to gather blocks.`,
    );
    return;
  }
  if (connected) {
    sendInputNow();
    network
      .request("place", { id: materialId })
      .then(applyServerState)
      .catch((error) => toast(error.message));
    return;
  }
  if (materialId===10 ? gathering.placeTorch(world,hit,mode) : gathering.place(world, x, y, z, materialId, position, mode, facingDirection())) {
    refreshNear(x, z);
    changed();
  } else if (overlapsBlock(position, x, y, z))
    toast("Give yourself a little room to build.");
}
$("view").addEventListener("mousedown", (e) => {
  if (e.button === 0 && active) {
    if (attackCreature(true)) return;
    miningHeld = true;
    sendInputNow();
  } else interact(e.button);
});
addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    miningHeld = false;
    gathering.reset();
    sendInputNow();
  }
});
$("view").addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener(
  "wheel",
  (e) => {
    if (active) {
      e.preventDefault();
      const capacity =
        mode === "creative" ? visibleItems().length : gathering.capacity;
      select((selected + (e.deltaY > 0 ? 1 : capacity - 1)) % capacity);
    }
  },
  { passive: false },
);
$("new").onclick = () => {
  if (
    !confirm(
      "Start a new world? Export the current world first if you want to keep it.",
    )
  )
    return;
  world = new World($("seed").value || "wander-01");
  gathering = new Gathering();
  drops = new Drops();
  progression = new Progression();
  tools = new Set();
  survival = new Survival(); vitals = playerVitals();
  inventoryUI();
  $("world-name").textContent = world.seed;
  rebuild();
  spawn();
  persist();
  toast("A new little wilderness is ready.");
};
$("export").onclick = () => {
  const blob = new Blob([JSON.stringify(snapshot())], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "wildblocks-world.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("import").onclick = () => $("file").click();
$("file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 8000000) throw Error("That world file is too large.");
    const saved = JSON.parse(await file.text());
    const next = World.restore(saved);
    const nextGathering = new Gathering(saved.inventory, saved.bag);
    const nextDrops = new Drops(saved.drops),
      nextProgression = new Progression(saved.skills),
      nextTools = restoreTools(saved.tools);
    if (!confirm("Replace the current world with this imported world?")) return;
    world = next;
    gathering = nextGathering;
    drops = nextDrops;
    progression = nextProgression;
    tools = nextTools;
    survival = new Survival(saved.survival); vitals = playerVitals(saved.vitals);
    mode = saved.mode === "creative" ? "creative" : "survival";
    $("mode").value = mode;
    inventoryUI();
    $("seed").value = world.seed;
    $("world-name").textContent = world.seed;
    rebuild();
    const resumed=resumePlayer(world,saved.player);
    Object.assign(position,resumed.position);yaw=resumed.yaw;pitch=resumed.pitch;
    velocity.x=velocity.y=velocity.z=0;
    persist();
    toast("World imported.");
  } catch (error) {
    toast(error.message || "Could not import this world.");
  } finally {
    e.target.value = "";
  }
};
const dropMeshes = new Map(),
  dropGeometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const dropMaterials = MATERIALS.map((m) =>
  m ? new THREE.MeshBasicMaterial({ color: m.color }) : null,
);
function renderDrops(time) {
  const current = new Set(drops.items);
  for (const [drop, mesh] of dropMeshes)
    if (!current.has(drop)) {
      scene.remove(mesh);
      dropMeshes.delete(drop);
    }
  for (const drop of drops.items) {
    let mesh = dropMeshes.get(drop);
    if (!mesh) {
      mesh = new THREE.Mesh(dropGeometry, dropMaterials[drop.id]);
      dropMeshes.set(drop, mesh);
      scene.add(mesh);
    }
    mesh.position.set(
      drop.x,
      drop.y + (drop.resting ? Math.sin(time * 0.003) * 0.025 : 0),
      drop.z,
    );
    mesh.rotation.set(0.15, time * 0.001, 0.1);
  }
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();
rebuild();
Object.assign(position,initialPlayerState.position);
yaw=initialPlayerState.yaw;pitch=initialPlayerState.pitch;
function frame(time) {
  requestAnimationFrame(frame);
  const dt = Math.min((time - last) / 1000 || 0, 0.04);
  last = time;
  if (!sessionStarted) return;
  if (active) {
    if(!connected) {
      if(world.updateSupplies(Date.now(),[position])){rebuild();changed();}
      world.flushDrops(drops);
    }
    if (!connected) {
      const respawns = vitals.respawns;
      survival.update(world,dt,[{position,tools,vitals,active}],mode);
      if(vitals.respawns!==respawns){velocity.y=0;toast("You were rescued at camp. Your inventory is safe.");}
    }
    if (fallback) {
      yaw +=
        ((keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0)) *
        dt *
        1.8;
      pitch = Math.max(
        -1.5,
        Math.min(
          1.5,
          pitch +
            ((keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0)) *
              dt *
              1.4,
        ),
      );
    }
    let forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
      right = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const length = Math.hypot(forward, right) || 1,
      speed = keys.has("ShiftLeft") ? 7 : 4.5;
    forward = (forward / length) * speed;
    right = (right / length) * speed;
    velocity.x = -Math.sin(yaw) * forward + Math.cos(yaw) * right;
    velocity.z = -Math.cos(yaw) * forward - Math.sin(yaw) * right;
    velocity.y = Math.max(-24, velocity.y - 24 * dt);
    const oldX = position.x,
      oldZ = position.z;
    grounded = movePlayer(world, position, velocity, dt);
    const walking = Math.hypot(position.x - oldX, position.z - oldZ) > 0.0001;
    const picked = connected
      ? []
      : drops.update(world, dt, position, walking, (id) => {
          if (!gathering.add(id)) return false;
          if (mode !== "creative") progression.earn(skillFor(id), 10);
          return true;
        });
    if (picked.length) {
      changed();
      if (time - lastPickupTime > 1200 || pickupMode !== mode) {
        pickupTotals.clear();
        pickupXP = 0;
      }
      for (const item of picked)
        pickupTotals.set(item.id, (pickupTotals.get(item.id) || 0) + 1);
      pickupXP += mode !== "creative" ? picked.length * 10 : 0;
      pickupMode = mode;
      lastPickupTime = time;
      const resources = [...pickupTotals]
        .map(([id, count]) => `${count} ${MATERIALS[id].name}`)
        .join(", ");
      toast(
        `Picked up ${resources}${pickupXP ? ` · +${pickupXP} skill XP` : ""}`,
      );
    }
    if (!connected && time - lastDropSave > 10000) {
      persist();
      lastDropSave = time;
    }
    camera.position.set(position.x, position.y + 1.62, position.z);
    camera.rotation.set(pitch, yaw, 0);
    camera.getWorldDirection(direction);
    hit = raycast(
      world,
      camera.position,
      direction,
      mode === "creative" ? 7 : TOOL_REACH,
    );
    const rule = miningRule(hit, tools, mode);
    const mined = connected
      ? null
      : gathering.mine(
          world,
          hit,
          dt,
          (mode === "creative" || drops.items.length < 2048) &&
            (miningHeld || keys.has("KeyE")),
          mode,
          tools,
        );
    if (mined) {
      if (mode !== "creative" && mined.id!==19) drops.add(mined);
      world.flushDrops(drops);
      refreshNear(mined.x, mined.z);
      changed();
      toast(
        mode === "creative"
          ? "Block removed."
          : mined.id===19 ? "Supplies dropped · walk over to collect. Refills after 3 real hours." : "Resource dropped · walk over it to collect",
      );
      hit = null;
    }
    $("mining").hidden = gathering.progress === 0;
    $("mine-fill").style.width = `${gathering.progress * 100}%`;
    updateCracks(hit?.torchKey ? null : hit, gathering.progress);
    outline.visible = !!hit && !hit.torchKey && hit.distance <= rule.reach;
    if (hit) {
      outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      $("target").textContent =
        `${MATERIALS[hit.id].name}${[19,24].includes(hit.id)?" · R / right-click to open":hit.id===20?" · R / right-click to open or close":""} · ${hit.distance > rule.reach ? "Out of reach" : !rule.allowed ? "Requires " + (hit.id===12?"an Iron pick":hit.id===11?"a Slate or Iron pick":"a pick") : rule.name}`;
    } else $("target").textContent = "";
  } else {
    outline.visible = false;
    cracks.visible = false;
    $("mining").hidden = true;
    camera.position.set(position.x, position.y + 1.62, position.z);
    camera.rotation.set(pitch, yaw, 0);
  }
  if (time - diagnosticTime > 200) {
    $("view").dataset.position = JSON.stringify(position);
    $("view").dataset.edits = String(world.edits.size);
    $("view").dataset.active = String(active);
    $("view").dataset.grounded = String(grounded);
    $("view").dataset.inventory = JSON.stringify(gathering.counts);
    $("view").dataset.bag = JSON.stringify(gathering.layout());
    $("view").dataset.mining = String(gathering.progress);
    $("view").dataset.drops = JSON.stringify(drops.snapshot());
    $("view").dataset.skills = JSON.stringify(progression.snapshot());
    $("view").dataset.tools = JSON.stringify([...tools]);
    $("view").dataset.survival = JSON.stringify(connected ? remoteSurvival : survival.state());
    $("view").dataset.health = String(vitals.health);
    $("view").dataset.attachments = JSON.stringify([...world.torches.values()]);
    diagnosticTime = time;
  }
  for (const avatar of avatars.values())
    avatar.group.position.lerp(avatar.target, 0.2);
  renderSurvival(time);
  renderDrops(time);
  renderer.render(scene, camera);
}
const serverPage =
  !!document.querySelector('meta[name="wildblocks-server"]') &&
  !new URLSearchParams(location.search).has("offline");
const network = new ServerConnection();
let connected = false,
  serverRevision = -1,
  pollTimer = null,
  serverName = "",
  stateSignature = "";
const avatars = new Map();
function openScreen(name, focus = true) {
  for (const screen of document.querySelectorAll(".start-screen"))
    screen.hidden = screen.id !== "screen-" + name;
  if (focus) {
    const screen = $("screen-" + name);
    (screen.querySelector("h2") || screen.querySelector("button"))?.focus();
  }
}
for (const button of document.querySelectorAll("[data-screen]"))
  button.onclick = () => openScreen(button.dataset.screen);
function serverModeLabel(value) {
  $("server-mode-label").textContent = (value === "creative" ? "Creative" : "Survival") + " · Set by the server administrator";
}
function serverControls() {
  document.querySelector(".tag").textContent = serverPage ? "SERVER" : "LOCAL";
  $("server-account").hidden = !serverPage || connected;
  for (const id of ["account-name", "account-password", "login-button", "register-button"])
    $(id).disabled = !serverPage;
  $("server-connected").hidden = !connected;
  $("welcome-enter").disabled = !connected;
  $("single-player").hidden = !serverPage;
  $("play").disabled = serverPage && !connected;
  $("open-workshop").disabled = serverPage && !connected;
  for (const id of ["mode", "new", "import"]) $(id).disabled = serverPage;
  // Mode is a server rule, never a joining-player setting.
  document.querySelector('label[for="mode"]').hidden = serverPage;
  $("mode").hidden = serverPage;
  $("open-host").hidden = !window.wildblocksDesktop;
  $("host-start").disabled = !window.wildblocksDesktop || serverPage;
  $("host-note").textContent = "Your world and accounts are saved automatically.";
  $("current-server").textContent = serverPage ? location.origin : "";
}
function applyServerState(state, initial = false) {
  if (!state?.player) throw Error("Invalid server response.");
  if (state.revision < serverRevision) return;
  if (state.world) {
    world = World.restore(state.world);
    rebuild();
  }
  serverRevision = state.revision;
  if(state.container)showContainer(state.container);else if(!$("container-panel").hidden){$("container-panel").hidden=true;openStorage=null;}
  drops = new Drops(state.drops);
  for (const d of drops.items) d.resting = d.vy === 0;
  gathering = new Gathering(state.player.inventory, state.player.bag);
  gathering.progress = state.player.progress || 0;
  progression = new Progression(state.player.skills);
  tools = restoreTools(state.player.tools);
  remoteSurvival = state.survival;
  const respawned = state.player.vitals?.respawns !== vitals.respawns;
  vitals = {...vitals,...state.player.vitals};
  if(respawned && !initial){Object.assign(position,state.player.position);velocity.y=0;toast("You were rescued at camp. Your inventory is safe.");}
  mode = state.mode === "creative" ? "creative" : "survival";
  serverModeLabel(mode);
  $("mode").value = mode;
  if (initial) {
    Object.assign(position, state.player.position);
    const view=directionView(state.player.direction);yaw=view.yaw;pitch=view.pitch;
    velocity.x = velocity.y = velocity.z = 0;
  }
  const signature = JSON.stringify([
    state.player.inventory,
    state.player.bag,
    state.player.skills,
    state.player.tools,
    state.revision,
  ]);
  if (signature !== stateSignature) {
    stateSignature = signature;
    inventoryUI();
  }
  serverName = state.player.name;
  $("world-name").textContent = world.seed;
  $("server-who").textContent =
    `${serverName} · ${1 + state.players.length} player${state.players.length ? "s" : ""} online`;
  $("saved").textContent = `Server · ${serverName}`;
  const current = new Set(state.players.map((p) => p.name));
  for (const [name, avatar] of avatars)
    if (!current.has(name)) {
      scene.remove(avatar.group);
      avatar.group.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      avatars.delete(name);
    }
  for (const p of state.players) {
    let avatar = avatars.get(p.name);
    if (!avatar) {
      const group = new THREE.Group(),
        body = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 1.1, 0.35),
          new THREE.MeshLambertMaterial({ color: 0x527d88 }),
        ),
        head = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          new THREE.MeshLambertMaterial({ color: 0xe4bb86 }),
        );
      body.position.y = 0.85;
      head.position.y = 1.6;
      group.add(body, head);
      const label = document.createElement("canvas");
      label.width = 256;
      label.height = 48;
      const ctx = label.getContext("2d");
      ctx.fillStyle = "#203d31dd";
      ctx.fillRect(0, 0, 256, 48);
      ctx.fillStyle = "#fff";
      ctx.font = "22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.name, 128, 32);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(label),
          depthTest: false,
        }),
      );
      sprite.position.y = 2.15;
      sprite.scale.set(1.8, 0.34, 1);
      group.add(sprite);
      group.position.set(p.position.x, p.position.y, p.position.z);
      scene.add(group);
      avatar = { group, target: new THREE.Vector3() };
      avatars.set(p.name, avatar);
    }
    avatar.target.set(p.position.x, p.position.y, p.position.z);
  }
}
function inputState() {
  const facing=viewDirection(yaw,pitch);
  return {
    position: { ...position },
    direction: facing,
    holding: active && (miningHeld || keys.has("KeyE")),
    active,
  };
}
function sendInputNow() {
  if (connected)
    network.request("input", inputState()).catch((error) => {
      if (error.position) Object.assign(position, error.position);
    });
}
function lostConnection(message) {
  showWelcome();
  connected = false;
  clearInterval(pollTimer);
  if (active) pause();
  serverControls();
  $("network-message").textContent = message;
}
function joined(state) {
  connected = true;
  serverRevision = -1;
  stateSignature = "";
  applyServerState(state, true);
  serverControls();
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!connected || network.pending) return;
    try {
      await network.request("input", inputState());
      if (!connected) return;
      const state = await network.request("state?revision=" + serverRevision);
      if (connected) applyServerState(state);
    } catch (error) {
      if (error.position) {
        Object.assign(position, error.position);
        toast(error.message);
      } else lostConnection(error.message || "Connection lost. Sign in again.");
    }
  }, 200);
  $("network-message").textContent = "Signed in. Enter the world to play.";
}
async function signIn(register) {
  const username = $("account-name").value,
    password = $("account-password").value;
  $("login-button").disabled = $("register-button").disabled = true;
  $("network-message").textContent = "Signing in…";
  try {
    const state = await network.request(register ? "register" : "login", {
      username,
      password,
    });
    $("account-password").value = "";
    joined(state);
    $("play").onclick();
  } catch (error) {
    $("network-message").textContent = error.message;
  } finally {
    $("login-button").disabled = $("register-button").disabled = false;
  }
}
$("login-button").onclick = () => signIn(false);
$("register-button").onclick = () => signIn(true);
$("account-password").onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    signIn(false);
  }
};
$("logout-button").onclick = async () => {
  showWelcome();
  try {
    await saveSession();
    await network.request("logout", {});
  } catch {}
  connected = false;
  clearInterval(pollTimer);
  serverControls();
  $("network-message").textContent = "Signed out.";
};
$("single-player").onclick = async () => {
  if(window.wildblocksDesktop)return window.wildblocksDesktop.local();
  await saveSession();location.assign(location.origin+"/?offline=1");
};
$("connect-button").onclick = async () => {
  const button = $("connect-button");
  button.disabled = true;
  $("connection-message").textContent = "Connecting…";
  try {
    const address = $("server-address").value.trim();
    const url = new URL(address.includes("://") ? address : "http://" + address);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      throw Error("Enter a server address without a username or password.");
    try { localStorage.setItem("wildblocks-server-address", url.origin); } catch {}
    persist();
    if (window.wildblocksDesktop) await window.wildblocksDesktop.connect(url.origin);
    else location.assign(url.origin + "/");
  } catch (error) {
    $("connection-message").textContent = error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
  } finally { button.disabled = false; }
};
$("server-address").onkeydown = (event) => {
  if (event.key === "Enter") { event.preventDefault(); $("connect-button").click(); }
};
try { $("server-address").value = localStorage.getItem("wildblocks-server-address") || ""; } catch {}
$("host-start").onclick = async () => {
  $("host-start").disabled = true;
  $("hosting-message").textContent = "Starting your server…";
  try {
    const ready = await window.wildblocksDesktop.startServer({
      port: Number($("host-port").value), seed: $("seed").value || "friends-01",
      lan: $("host-lan").checked, mode: $("host-mode").value,
    });
    $("hosting-message").textContent = "Server ready. Joining…";
    await window.wildblocksDesktop.connect(ready.url);
  } catch (error) {
    $("hosting-message").textContent = error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
  } finally { $("host-start").disabled = false; }
};
function showWelcome() {
  if (active) pause();
  sessionStarted = false;
  document.body.classList.add("welcome");
  $("welcome").hidden = false;
  $("menu").hidden = true;
  $("workshop").hidden = true;
  openScreen(serverPage ? "account" : "home", false);
}
$("back-to-welcome").onclick = showWelcome;
$("welcome-mode").onchange = () => {
  if (!serverPage) {
    mode = $("welcome-mode").value;
    $("mode").value = mode;
    inventoryUI();
  }
};
$("solo-enter").onclick = () => {
  if (serverPage) return;
  mode = $("welcome-mode").value;
  $("mode").value = mode;
  inventoryUI();
  $("play").onclick();
};
$("welcome-enter").onclick = () => { if (serverPage && connected) $("play").onclick(); };
$("welcome-mode").value = mode;
showWelcome();
serverControls();
if (serverPage && window.wildblocksDesktop) {
  window.wildblocksDesktop.hosting().then(info => {
    if (!info || new URL(info.url).origin !== location.origin) return;
    $("hosting-panel").hidden = false;
    const addresses = info.lan ? info.addresses.filter(address => !address.includes("127.0.0.1")) : [];
    const address = addresses[0] || info.url;
    $("hosting-addresses").textContent = addresses.length ? "Friends can join: " + addresses.join(", ") : "Local only: " + info.url;
    $("copy-host-address").hidden = !addresses.length;
    $("copy-host-address").onclick = async () => {
      try { await navigator.clipboard.writeText(address); $("copy-host-address").textContent = "Address Copied"; }
      catch { $("network-message").textContent = "Copy the address shown above."; }
    };
    $("stop-hosting").onclick = () => window.wildblocksDesktop.stopHosting().catch(error => {
      $("network-message").textContent = error.message;
    });
  }).catch(() => {});
}
if (serverPage) {
  network.request("status").then(status => serverModeLabel(status.mode)).catch(() => {
    $("network-message").textContent = "Server unavailable. Return to the main menu to try another address.";
  });
  $("network-message").textContent = "Sign in or create an account to join this world.";
  network.request("state?revision=-1").then(joined).catch(() => {});
}

requestAnimationFrame(frame);
addEventListener("pagehide", () => {
  persist();
  if(connected)network.request("checkpoint",{...inputState(),active:false,holding:false},{keepalive:true}).catch(()=>{});
});
async function saveSession() {
  if(active)pause();
  persist();
  if(connected) {
    try { await network.request("checkpoint",{...inputState(),active:false,holding:false},{keepalive:true}); }
    catch(error){if(error.position)Object.assign(position,error.position);throw error;}
  }
}
window.wildblocksDesktop?.onPrepareClose?.(saveSession);
// Read-only diagnostics for local QA.
Object.defineProperty(window, "wildblocksState", {
  get: () => ({
    active,
    fallback,
    seed: world.seed,
    edits: world.edits.size,
    position: { ...position },
    meshes: meshes.size,
    selected,
    grounded,
    health: vitals.health,
    survival: connected ? remoteSurvival : survival.state(),
  }),
});

for(const button of document.querySelectorAll('.quit-game')) {
  button.textContent=window.wildblocksDesktop?'Save & Quit Game':'Save & Leave Game';
  button.onclick=async()=>{if(window.wildblocksDesktop)return window.wildblocksDesktop.quit();try{await saveSession();showWelcome();toast('Game saved. You can close this browser tab.');}catch(error){toast('Could not save to server: '+error.message);}};
}

const creatureMeshes = new Map();
const creatureBody = new THREE.MeshLambertMaterial({color:0x42384f});
const creatureEyes = new THREE.MeshBasicMaterial({color:0xffad70});
const creatureGeometry = new THREE.BoxGeometry(.65,.8,.5);
const eyeGeometry = new THREE.BoxGeometry(.11,.1,.06);
const attachmentMeshes = new Map();
const torchStickGeometry = new THREE.BoxGeometry(.09,.52,.09);
const torchFlameGeometry = new THREE.OctahedronGeometry(.12);
const torchStickMaterial = new THREE.MeshLambertMaterial({color:0x98623a});
const torchFlameMaterial = new THREE.MeshBasicMaterial({color:0xffc75d});
const torchLights = Array.from({length:8},()=>{const light=new THREE.PointLight(0xffb65b,0,12,1.6);scene.add(light);return light;});
const handLight=new THREE.PointLight(0xffbe6b,0,11,1.5);scene.add(handLight);
let torchWorld=null,torchVersion=-1,renderTorches=[],swingUntil=0;
scene.add(camera);
const heldSword = new THREE.Group();
heldSword.add(new THREE.Mesh(new THREE.BoxGeometry(.07,.6,.035),new THREE.MeshLambertMaterial({color:0xaac1c4})));
const guard=new THREE.Mesh(new THREE.BoxGeometry(.24,.04,.06),new THREE.MeshLambertMaterial({color:0xb68b50}));guard.position.y=-.25;heldSword.add(guard);
const grip=new THREE.Mesh(new THREE.BoxGeometry(.065,.2,.06),new THREE.MeshLambertMaterial({color:0x7d5836}));grip.position.y=-.35;heldSword.add(grip);
heldSword.position.set(.45,-.35,-.7);heldSword.rotation.z=-.25;camera.add(heldSword);
function monsterRows(){return connected?(remoteSurvival?.monsters||[]):survival.state().monsters;}
function attackCreature(onlyAimed=false){
  if(!active||mode==='creative')return false;
  camera.getWorldDirection(direction);
  const aimed=monsterRows().some(m=>{
    const dx=m.x-position.x,dy=m.y+.9-(position.y+1.3),dz=m.z-position.z,n=Math.hypot(dx,dy,dz);
    return n<3.5&&n>.01&&(dx*direction.x+dy*direction.y+dz*direction.z)/n>.82&&survival.canSee(world,position,{x:m.x,y:m.y,z:m.z});
  });
  if(onlyAimed&&!aimed)return false;
  swingUntil=performance.now()+220;miningHeld=false;
  if(connected){sendInputNow();network.request('attack',{}).then(applyServerState).catch(error=>toast(error.message));}
  else if(survival.attack(world,{position,tools,vitals,active},direction,mode)) {toast(weapon(tools).name+' hit');changed();}
  return aimed;
}
function renderSurvival(time){
  renderDoors();
  const elapsed=connected?(remoteSurvival?.elapsed||60):survival.elapsed;
  const day=dayState(elapsed),brightness=day.daylight;
  const sky=new THREE.Color(0x111a35).lerp(new THREE.Color(0xb7d2cf),brightness);
  renderer.setClearColor(sky);scene.fog.color.copy(sky);
  ambient.intensity=.3+brightness*2;sun.intensity=.08+brightness*2;
  sun.position.set(32+Math.cos(day.phase*Math.PI*2)*50,5+Math.sin(day.phase*Math.PI*2)*55,15);
  if(torchWorld!==world||torchVersion!==world.revision){renderTorches=torchesIn(world);torchWorld=world;torchVersion=world.revision;}
  const present=new Set(world.torches.keys());
  for(const [key,mesh] of attachmentMeshes)if(!present.has(key)){scene.remove(mesh);attachmentMeshes.delete(key);}
  for(const [key,t] of world.torches)if(!attachmentMeshes.has(key)) {
    const group=new THREE.Group(),stick=new THREE.Mesh(torchStickGeometry,torchStickMaterial),flame=new THREE.Mesh(torchFlameGeometry,torchFlameMaterial);
    flame.position.y=.32;group.add(stick,flame);const p=torchPosition(t);group.position.set(p.x,p.y,p.z);
    group.rotation.z=-t.nx*.3;group.rotation.x=t.nz*.3;scene.add(group);attachmentMeshes.set(key,group);
  }
  const nearby=renderTorches.slice().sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z)).slice(0,8);
  torchLights.forEach((light,i)=>{const t=nearby[i];light.intensity=t?5.5+Math.sin(time*.008+i)*.25:0;if(t)light.position.set(t.x,t.y+.1,t.z);});
  handLight.position.set(position.x,position.y+1.4,position.z);
  handLight.intensity=selectedMaterial()===10&&(mode==='creative'||gathering.counts[10]>0)?4:0;
  heldSword.visible=active&&(tools.has('wood-sword')||tools.has('slate-sword')||tools.has('iron-sword'));
  heldSword.children[0].material.color.set(tools.has('iron-sword')?0xd4e0e4:tools.has('slate-sword')?0xaac1c4:0xc19560);
  heldSword.rotation.z=time<swingUntil?-1.1:-.25;
  const rows=mode==='creative'?[]:monsterRows(),current=new Set(rows.map(m=>m.id));
  for(const [id,mesh] of creatureMeshes)if(!current.has(id)){scene.remove(mesh);creatureMeshes.delete(id);}
  for(const m of rows){
    let mesh=creatureMeshes.get(m.id);
    if(!mesh){mesh=new THREE.Group();const body=new THREE.Mesh(creatureGeometry,creatureBody);body.position.y=.8;mesh.add(body);
      for(const x of [-.18,.18]){const eye=new THREE.Mesh(eyeGeometry,creatureEyes);eye.position.set(x,1.03,-.28);mesh.add(eye);}
      scene.add(mesh);creatureMeshes.set(m.id,mesh);
    }
    mesh.position.set(m.x,m.y+Math.sin(time*.005+m.id)*.025,m.z);mesh.rotation.y=Math.atan2(m.x-position.x,m.z-position.z);
  }
  const town=world.towns.find(t=>Math.hypot(t.x-position.x,t.z-position.z)<15);
  const location=town?" · "+town.name:"";
  const text=mode==='creative'?`${day.label} · Creative · no hostile creatures`:`${day.label} · Health ${vitals.health}/${MAX_HEALTH} · Armor ${Math.round(protection(tools)*100)}% · ${weapon(tools).name}${location}`;
  if($('survival-hud').textContent!==text)$('survival-hud').textContent=text;
  $('survival-hud').classList.toggle('hurt',vitals.hurt>0&&vitals.hurt<2);
}

function facingDirection(){return ((Math.round(yaw/(Math.PI/2))%4)+4)%4;}
function furnitureVertex(x,y,z,a,b,c,id){let turns=[21,23,24].includes(id)?world.facing.get(`${x},${y},${z}`)||0:0;for(let i=0;i<turns;i++)[a,c]=[1-c,a];return[x+a,y+b,z+c];}
let openStorage=null;
function showContainer(data){openStorage=data;if(active)pause();$("container-panel").hidden=false;$("menu").hidden=true;$("container-title").textContent=data.title;containerUI();}
function containerUI(){if(!openStorage)return;const slot=(id,count,direction)=>`<button ${id?'':'disabled'} data-item="${id||0}" data-direction="${direction}" title="${id?MATERIALS[id].name:''}">${id?`<img src="icons/${materialIcon(id)}.svg" alt="${MATERIALS[id].name}"/><b>${count}</b>`:''}</button>`;$("storage-grid").innerHTML=Array.from({length:27},(_,i)=>{const id=openStorage.order[i];return slot(id,openStorage.counts[id],"take");}).join('');$("storage-bag").innerHTML=Array.from({length:gathering.capacity},(_,i)=>{const id=gathering.order[i];return slot(id,gathering.counts[id],"store");}).join('');$("storage-note").textContent=openStorage.kind===19?'Town supplies · take what you need. Empty crates refill after three hours.':'Shared chest · click a stack to move it. Empty the chest before removing it.';}
function closeContainer(){$("container-panel").hidden=true;openStorage=null;$("play").onclick();}
$("close-container").onclick=closeContainer;
$("container-panel").onclick=async e=>{const b=e.target.closest('[data-item]');if(!b||!openStorage)return;const input={x:openStorage.x,y:openStorage.y,z:openStorage.z,id:Number(b.dataset.item),direction:b.dataset.direction,count:$("transfer-count").value==='all'?9999:1};try{if(connected){applyServerState(await network.request('container',input));}else{if(!canReachContainer(world,position,input.x,input.y,input.z))throw Error('Move closer to the container.');const result=transferContainer(world,gathering,input);if(result.error)throw Error(result.error);openStorage=containerView(world,input.x,input.y,input.z);containerUI();inventoryUI();changed();}}catch(error){toast(error.message);}};
function useTarget(){if(!hit||hit.distance>5)return false;if([9,15,16,17].includes(hit.id)){openWorkshop();return true;}if(![19,20,24,25].includes(hit.id))return false;if(connected){sendInputNow();network.request('interact',{}).then(applyServerState).catch(e=>toast(e.message));}else if([20,25].includes(hit.id)){if(world.toggleDoor(hit.x,hit.y,hit.z,[position]))changed();else toast('Step out of the doorway first.');}else if(canReachContainer(world,position,hit.x,hit.y,hit.z)){showContainer(containerView(world,hit.x,hit.y,hit.z));}return true;}
const windowMeshes=new Map(),paneGeometry=new THREE.BoxGeometry(.8,.8,.025),paneMaterial=new THREE.MeshStandardMaterial({color:0xbde6e9,transparent:true,opacity:.24,roughness:.15,depthWrite:false});
const doorMeshes=new Map(),doorGeometry=new THREE.BoxGeometry(1,2,.12),doorMaterial=new THREE.MeshStandardMaterial({color:0xa87840}),knobGeometry=new THREE.BoxGeometry(.09,.09,.1),knobMaterial=new THREE.MeshStandardMaterial({color:0xe4c46e});
let windowWorld=null,windowVersion=-1;
function renderDoors(){
 if(windowWorld!==world||windowVersion!==world.revision){
  for(const mesh of windowMeshes.values())scene.remove(mesh);windowMeshes.clear();
  for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++)for(let y=0;y<HEIGHT;y++)if(world.get(x,y,z)===21){const mesh=new THREE.Mesh(paneGeometry,paneMaterial);mesh.position.set(x+.5,y+.5,z+.5);mesh.rotation.y=-(world.facing.get(`${x},${y},${z}`)||0)*Math.PI/2;scene.add(mesh);windowMeshes.set(`${x},${y},${z}`,mesh);}
  windowWorld=world;windowVersion=world.revision;
 }
for(const [key,mesh]of doorMeshes)if(!world.doors.has(key)){scene.remove(mesh);doorMeshes.delete(key);}for(const [key,d]of world.doors){let group=doorMeshes.get(key);if(!group){group=new THREE.Group();const panel=new THREE.Mesh(doorGeometry,doorMaterial);panel.position.set(.5,1,0);const knob=new THREE.Mesh(knobGeometry,knobMaterial);knob.position.set(.86,1,.1);group.add(panel,knob);scene.add(group);doorMeshes.set(key,group);}const a=d.facing*Math.PI/2;group.position.set(d.x+.5-Math.cos(a)*.5,d.y,d.z+.5-Math.sin(a)*.5);group.rotation.y=-a-(d.open?Math.PI/2:0);}}
