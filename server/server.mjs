import { canReachContainer, containerView, transferContainer, INTERACT_REACH } from "../dist/interactions.js";
import { resumePlayer, validPlayerPosition, validDirection, viewDirection } from "../dist/player-state.js";
import { Survival, playerVitals } from "../dist/survival.js";
import http from "node:http";
import https from "node:https";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import {
  World,
  raycast,
  collides,
  overlapsBlock,
  SIZE,
  HEIGHT,
} from "../dist/world.js";
import { Gathering } from "../dist/gathering.js";
import { Drops } from "../dist/drops.js";
import { Progression, skillFor } from "../dist/progression.js";
import { craft, craftProblem, RECIPES, restoreTools, nearCraftingTable, nearStation } from "../dist/crafting.js";
import { TOOL_REACH, PLACE_REACH, miningRule } from "../dist/tools.js";
const scrypt = promisify(scryptCallback),
  root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const userPattern = /^[a-zA-Z0-9_-]{3,24}$/;
export async function startServer({
  dataDir,
  host = "127.0.0.1",
  port = 4182,
  seed = "friends-01",
  tlsCert,
  tlsKey,
  publicHost,
  mode,
} = {}) {
  if (!dataDir) throw Error("A server data directory is required.");
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const savePath = resolve(dataDir, "server.json");
  if (mode !== undefined && !["survival", "creative"].includes(mode))
    throw Error("Invalid server game type.");
  let gameMode = mode ?? "survival";
  let survival = new Survival();
  let authBusy = 0;
  let world = new World(seed),
    drops = new Drops(),
    revision = 0,
    dirty = false,
    closed = false;
  const users = new Map(),
    sessions = new Map(),
    rates = new Map();
  function hydrate(row) {
    return {
      name: row.name,
      openContainer: null,
      salt: row.salt,
      hash: row.hash,
      bag: new Gathering(row.inventory, row.bag),
      skills: new Progression(row.skills),
      tools: restoreTools(row.tools),
      position: resumePlayer(world,{position:row.position}).position,
      direction: validDirection(row.direction) ? {...row.direction} : viewDirection(0,-.15),
      holding: false,
      active: false,
      lastInput: 0,
      vitals: playerVitals(row.vitals),
      walking: false,
      lastSeen: 0,
    };
  }
  if (existsSync(savePath)) {
    const saved = JSON.parse(readFileSync(savePath, "utf8"));
    world = World.restore(saved.world);
    gameMode = mode ?? (saved.mode === "creative" ? "creative" : "survival");
    drops = new Drops(saved.drops);
    survival = new Survival(saved.survival);
    if (!Array.isArray(saved.users) || saved.users.length > 64)
      throw Error("Invalid server account file.");
    for (const row of saved.users) {
      if (
        !userPattern.test(row.name) ||
        !/^[a-f0-9]{32}$/.test(row.salt) ||
        !/^[a-f0-9]{128}$/.test(row.hash)
      )
        throw Error("Invalid server account file.");
      const user = hydrate(row);
      users.set(row.name.toLowerCase(), user);
    }
  }
  dirty = true; // Persist initial terrain and administrator rule changes, even before anyone joins.
  function save() {
    if (!dirty || closed) return;
    const data = {
      world: world.snapshot(),
      mode: gameMode,
      survival: survival.snapshot(),
      drops: drops.snapshot(),
      users: [...users.values()].map((u) => ({
        name: u.name,
        salt: u.salt,
        hash: u.hash,
        inventory: u.bag.snapshot(),
        bag: u.bag.layout(),
        skills: u.skills.snapshot(),
        tools: [...u.tools],
        position: u.position,
        direction: u.direction,
        vitals: { health:u.vitals.health, respawns:u.vitals.respawns },
      })),
    };
    writeFileSync(savePath + ".tmp", JSON.stringify(data), { mode: 0o600 });
    renameSync(savePath + ".tmp", savePath);
    dirty = false;
  }
  function account(req) {
    const token = (req.headers.cookie ?? "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("wildblocks_session="))
      ?.slice(19);
    const session = sessions.get(token);
    if (!session || session.expires < Date.now()) {
      sessions.delete(token);
      return null;
    }
    return { user: users.get(session.user), token };
  }
  function loginCookie(res, key) {
    res.setHeader(
      "Set-Cookie",
      `wildblocks_session=${key}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${tlsCert ? "; Secure" : ""}`,
    );
  }
  function state(u, rev) {
    const now = Date.now();
    return {
      protocol: 1,
      container: u.openContainer && canReachContainer(world,u.position,u.openContainer.x,u.openContainer.y,u.openContainer.z) ? containerView(world,u.openContainer.x,u.openContainer.y,u.openContainer.z) : null,
      mode: gameMode,
      survival: survival.state(),
      revision,
      world: rev === revision ? undefined : world.snapshot(),
      drops: drops.snapshot(),
      player: {
        name: u.name,
        vitals: { health:u.vitals.health, respawns:u.vitals.respawns },
        position: u.position,
        direction: u.direction,
        inventory: u.bag.snapshot(),
        bag: u.bag.layout(),
        skills: u.skills.snapshot(),
        tools: [...u.tools],
        progress: u.bag.progress,
      },
      players: [...users.values()]
        .filter((p) => p !== u && now - p.lastSeen < 5000)
        .map((p) => ({ name: p.name, position: p.position })),
    };
  }
  function json(res, status, value) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
  }
  function fail(status, message) {
    throw Object.assign(Error(message), { status });
  }
  async function body(req) {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      fail(415, "Use JSON requests.");
    let size = 0,
      chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 8192) fail(413, "Request too large.");
      chunks.push(chunk);
    }
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString());
      if (!value || typeof value !== "object" || Array.isArray(value))
        fail(400, "Use a JSON object.");
      return value;
    } catch {
      fail(400, "Invalid JSON.");
    }
  }
  const hosts = new Set([
    "127.0.0.1",
    "localhost",
    ...Object.values(networkInterfaces())
      .flat()
      .filter(Boolean)
      .map((n) => n.address),
  ]);
  if (publicHost && /^[a-zA-Z0-9.-]+$/.test(publicHost)) hosts.add(publicHost);
  const handler = async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    try {
      const requestHost = req.headers.host?.replace(/:\d+$/, "");
      if (!hosts.has(requestHost)) fail(403, "Unknown server address.");
      const url = new URL(
          req.url,
          `${tlsCert ? "https" : "http"}://${req.headers.host}`,
        ),
        path = url.pathname;
      if (path === "/api/status" && req.method === "GET")
        return json(res, 200, {
          wildblocks: true,
          protocol: 1,
          mode: gameMode,
          name: world.seed,
          players: [...users.values()].filter(
            (u) => Date.now() - u.lastSeen < 5000,
          ).length,
        });
      if (path.startsWith("/api/")) {
        const ip = req.socket.remoteAddress,
          now = Date.now(),
          key =
            ip +
            (path === "/api/login" || path === "/api/register"
              ? ":auth"
              : ":api");
        let rate = rates.get(key);
        if (!rate || now - rate.start > 60000) {
          rate = { start: now, count: 0 };
          rates.set(key, rate);
        }
        if (++rate.count > (key.endsWith(":auth") ? 20 : 6000))
          fail(429, "Too many requests. Please wait a minute.");
        if (rates.size > 1000)
          for (const [k, v] of rates)
            if (now - v.start > 60000) rates.delete(k);
        if (
          req.method === "POST" &&
          req.headers.origin &&
          req.headers.origin !== url.origin
        )
          fail(403, "Request origin does not match server.");
        if (
          (path === "/api/register" || path === "/api/login") &&
          req.method === "POST"
        ) {
          const input = await body(req);
          if (
            typeof input.username !== "string" ||
            !userPattern.test(input.username) ||
            typeof input.password !== "string" ||
            input.password.length < 10 ||
            input.password.length > 128
          )
            fail(
              400,
              "Use a 3–24 character name (letters, numbers, _ or -) and a 10–128 character password.",
            );
          if (authBusy >= 2)
            fail(429, "Server is processing sign-ins. Try again shortly.");
          authBusy++;
          try {
            const key = input.username.toLowerCase();
            let u = users.get(key);
            if (path === "/api/register") {
              if (u) fail(409, "That name is already registered.");
              if (users.size >= 64) fail(409, "Server account limit reached.");
              const salt = randomBytes(16).toString("hex"),
                hash = (await scrypt(input.password, salt, 64)).toString("hex");
              if (users.has(key)) fail(409, "That name is already registered.");
              if (users.size >= 64) fail(409, "Server account limit reached.");
              u = hydrate({ name: input.username, salt, hash });
              u.position = {
                x: 32.5,
                y: world.surface(32, 32) + 0.05,
                z: 32.5,
              };
              users.set(key, u);
              dirty = true;
              save();
            } else {
              const hash = await scrypt(
                input.password,
                u?.salt ?? "00000000000000000000000000000000",
                64,
              );
              if (!u || !timingSafeEqual(Buffer.from(u.hash, "hex"), hash))
                fail(401, "Incorrect name or password.");
            }
            if(collides(world,u.position)) {
              u.position=resumePlayer(world,{position:u.position}).position;
              u.vitals.hurt=5;dirty=true;
            }
            for (const [token, s] of sessions)
              if (
                s.expires < now ||
                s.user === key ||
                now - users.get(s.user).lastSeen > 60000
              )
                sessions.delete(token);
            if (sessions.size >= 8)
              fail(409, "Server is full (8 signed-in players).");
            const token = randomBytes(32).toString("hex");
            sessions.set(token, { user: key, expires: now + 86400000 });
            loginCookie(res, token);
            u.lastSeen = now;
            u.lastInput = now;
            return json(res, 200, state(u));
          } finally {
            authBusy--;
          }
        }
        const session = account(req);
        if (!session) fail(401, "Sign in to this server.");
        const u = session.user;
        u.lastSeen = now;
        if (path === "/api/state" && req.method === "GET")
          return json(
            res,
            200,
            state(u, Number(url.searchParams.get("revision"))),
          );
        if (path === "/api/logout" && req.method === "POST") {
          sessions.delete(session.token);
          u.active = false;
          u.holding = false;
          u.lastSeen = 0;
          dirty=true;save();
          loginCookie(res, "");
          return json(res, 200, { ok: true });
        }
        if (["/api/input","/api/checkpoint"].includes(path) && req.method === "POST") {
          const input = await body(req),
            p = input.position,
            d = input.direction;
          if (
            !validPlayerPosition(p) ||
            !d ||
            ![d.x, d.y, d.z].every(Number.isFinite) ||
            Math.abs(Math.hypot(d.x, d.y, d.z) - 1) > 0.02
          )
            fail(400, "Invalid player input.");
          const elapsed = Math.min(
              1,
              Math.max(0.05, (now - u.lastInput) / 1000),
            ),
            distance = Math.hypot(
              p.x - u.position.x,
              p.y - u.position.y,
              p.z - u.position.z,
            );
          if (distance > 28 * elapsed + 1 || collides(world, p)) {
            u.active = false;
            u.holding = false;
            return json(res, 409, {
              error: "Movement was corrected.",
              position: u.position,
            });
          }
          u.walking =
            Math.hypot(p.x - u.position.x, p.z - u.position.z) > 0.0001;
          u.position = { ...p };
          u.direction = { ...d };
          u.active = path!=="/api/checkpoint" && input.active === true;
          if(u.active)u.openContainer=null;
          u.holding = u.active && input.holding === true;
          u.lastInput = now;
          dirty = true;
          if(path==="/api/checkpoint")save();
          return json(res, 200, { ok: true });
        }
        if(path==="/api/interact"&&req.method==="POST") {
          await body(req);
          const hit=raycast(world,{x:u.position.x,y:u.position.y+1.62,z:u.position.z},u.direction,INTERACT_REACH);
          if(!hit)fail(409,"Move closer and point at a door, chest or crate.");
          if(hit.id===20||hit.id===25) {
            if(!world.toggleDoor(hit.x,hit.y,hit.z,[...users.values()].filter(other=>now-other.lastSeen<5000)))fail(409,"The doorway must be clear before closing.");
            revision++;dirty=true;save();return json(res,200,state(u));
          }
          if(![19,24].includes(hit.id)||!canReachContainer(world,u.position,hit.x,hit.y,hit.z))fail(409,"That object cannot be opened from here.");
          u.openContainer={x:hit.x,y:hit.y,z:hit.z};u.active=false;u.holding=false;u.bag.reset();
          return json(res,200,state(u));
        }
        if(path==="/api/container"&&req.method==="POST") {
          const input=await body(req),target=u.openContainer;
          if(!target||input.x!==target.x||input.y!==target.y||input.z!==target.z||!canReachContainer(world,u.position,target.x,target.y,target.z))fail(409,"Open a nearby chest or crate first.");
          const result=transferContainer(world,u.bag,input,now);if(result.error)fail(409,result.error);
          revision++;dirty=true;save();return json(res,200,state(u));
        }
        if (path === "/api/attack" && req.method === "POST") {
          await body(req);
          survival.attack(world, u, u.direction, gameMode);
          dirty = true;
          return json(res, 200, state(u));
        }
        if (path === "/api/craft" && req.method === "POST") {
          const input = await body(req);
          if (
            !craft(
              input.key,
              u.bag,
              u.tools,
              u.skills,
              gameMode,
              nearCraftingTable(world, u.position),
              [15,16,17].filter(id=>nearStation(world,u.position,id)),
            )
          )
            fail(
              409,
              craftProblem(RECIPES.find(r=>r.key===input.key),u.bag,u.tools,gameMode,nearCraftingTable(world,u.position),u.skills,[15,16,17].filter(id=>nearStation(world,u.position,id))) || "Recipe cannot be crafted.",
            );
          dirty = true;
          save();
          return json(res, 200, state(u));
        }
        if (path === "/api/place" && req.method === "POST") {
          const input = await body(req),
            hit = raycast(
              world,
              { x: u.position.x, y: u.position.y + 1.62, z: u.position.z },
              u.direction,
              gameMode === "creative" ? 7 : TOOL_REACH,
            );
          if (
            !hit ||
            hit.distance > (gameMode === "creative" ? 7 : PLACE_REACH) ||
            input.id!==10 && [...users.values()].some(
              (other) =>
                other !== u &&
                now - other.lastSeen < 5000 &&
                overlapsBlock(
                  other.position,
                  hit.x + hit.normal.x,
                  hit.y + hit.normal.y,
                  hit.z + hit.normal.z,
                ) || input.id===20 && other!==u && now-other.lastSeen<5000 && overlapsBlock(other.position,hit.x+hit.normal.x,hit.y+hit.normal.y+1,hit.z+hit.normal.z),
            ) ||
            !(input.id===10 ? u.bag.placeTorch(world,hit,gameMode) : u.bag.place(
              world,
              hit.x + hit.normal.x,
              hit.y + hit.normal.y,
              hit.z + hit.normal.z,
              input.id,
              u.position,
              gameMode,
              ((Math.round(Math.atan2(-u.direction.x,-u.direction.z)/(Math.PI/2))%4)+4)%4,
            ))
          )
            fail(409, "Cannot place that block here.");
          revision++;
          dirty = true;
          return json(res, 200, state(u));
        }
        fail(404, "Unknown server operation.");
      }
      if (req.method !== "GET" && req.method !== "HEAD")
        fail(405, "Method not allowed.");
      const file = resolve(
        root,
        "." + decodeURIComponent(path === "/" ? "/index.html" : path),
      );
      if (!file.startsWith(root + sep)) fail(404, "Not found.");
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".txt": "text/plain",
      };
      const type = types[extname(file)];
      if (!type) fail(404, "Not found.");
      let data;
      try {
        data = readFileSync(file);
      } catch {
        fail(404, "Not found.");
      }
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
      if (file.endsWith("index.html"))
        data = Buffer.from(
          data
            .toString()
            .replace(
              "<head>",
              '<head><meta name="wildblocks-server" content="1">',
            ),
        );
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (error) {
      if (!res.headersSent)
        json(res, error.status ?? 500, {
          error: error.status
            ? error.message
            : "Server could not complete the request.",
        });
      else res.end();
    }
  };
  const server = tlsCert
    ? https.createServer(
        { cert: readFileSync(tlsCert), key: readFileSync(tlsKey) },
        handler,
      )
    : http.createServer(handler);
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const actualPort = server.address().port;
  const ticker = setInterval(() => {
    const now = Date.now();
    if(world.updateSupplies(now,[...users.values()].filter(u=>now-u.lastSeen<5000))) revision++;
    world.flushDrops(drops);
    survival.update(world, 0.05, [...users.values()].map(u => {
      if (now-u.lastInput>700 || now-u.lastSeen>5000) u.active=false;
      return u;
    }), gameMode);
    dirty = true;
    drops.update(world, 0.05, { x: -100, y: 0, z: -100 }, false, () => false);
    for (const u of users.values()) {
      if (now - u.lastInput > 700 || now - u.lastSeen > 5000) {
        u.holding = false;
        u.active = false;
        u.walking = false;
        u.bag.reset();
        continue;
      }
      const hit = raycast(
        world,
        { x: u.position.x, y: u.position.y + 1.62, z: u.position.z },
        u.direction,
        gameMode === "creative" ? 7 : TOOL_REACH,
      );
      const mined = u.bag.mine(
        world,
        hit,
        0.05,
        u.holding && (gameMode === "creative" || drops.items.length < 2048),
        gameMode,
        u.tools,
      );
      if (mined) {
        if (gameMode !== "creative" && mined.id!==19) drops.add(mined);
        world.flushDrops(drops);
        revision++;
        dirty = true;
      }
      if (
        drops.collect(
          u.position,
          u.walking,
          (id) => {
            if (!u.bag.add(id)) return false;
            if (gameMode !== "creative") u.skills.earn(skillFor(id), 10);
            return true;
          },
          u.name,
        ).length
      )
        dirty = true;
      u.walking = false;
    }
  }, 50);
  const saver = setInterval(() => {
    try {
      save();
    } catch {
      process.stderr.write("Server save failed. Check disk space.\n");
    }
  }, 2000);
  return {
    server,
    url: `${tlsCert ? "https" : "http"}://127.0.0.1:${actualPort}`,
    addresses: [...hosts]
      .filter((h) => h !== "localhost" && !h.includes(":"))
      .map((h) => `${tlsCert ? "https" : "http"}://${h}:${actualPort}`),
    async close() {
      clearInterval(ticker);
      clearInterval(saver);
      save();
      closed = true;
      await new Promise((resolve) => server.close(resolve));
      server.closeAllConnections();
    },
    get world() {
      return world;
    },
  };
}
