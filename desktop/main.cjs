const {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  utilityProcess,
  Menu,
  dialog,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { pathToFileURL } = require("node:url");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "wildblocks",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
let win, hosted, serverOrigin, pendingCheckpoint;
let quitting=false, closing=false;
function trusted(event) {
  if (
    event.sender !== win.webContents ||
    event.senderFrame !== win.webContents.mainFrame
  )
    throw Error("Unavailable.");
}
async function prepareRenderer() {
  if(!win || win.isDestroyed() || !win.webContents.getURL())return;
  if(pendingCheckpoint)return pendingCheckpoint;
  pendingCheckpoint=new Promise((resolve,reject)=>{
    const id=randomUUID();
    const finish=(error)=>{clearTimeout(timer);ipcMain.removeListener("wildblocks:checkpoint-complete",onComplete);if(error)reject(error);else resolve();};
    const onComplete=(event,requestId,result)=>{
      try { trusted(event); } catch { return; }
      if(requestId!==id || (result?.ok!==true && result?.ok!==false))return;
      finish(result.ok ? null : Error(String(result.message || "Saving failed.").slice(0,500)));
    };
    const timer=setTimeout(()=>finish(Error("The game did not confirm that saving finished. Please try again.")),6000);
    ipcMain.on("wildblocks:checkpoint-complete",onComplete);
    try { win.webContents.send("wildblocks:prepare-close",id); } catch(error) { finish(error); }
  }).finally(()=>{pendingCheckpoint=null;});
  return pendingCheckpoint;
}
function showSaveFailure(error,canRetry=false) {
  return dialog.showMessageBox(win,{
    type:"warning",title:"Your game is still open",message:"Your game could not be saved.",
    detail:String(error?.message || "Saving failed.").slice(0,500)+"\n\nYour game and hosted server remain open. Try again, or export your world from the pause menu under World & settings.",
    buttons:canRetry?["Return to Game","Retry Save & Quit"]:["Return to Game"],defaultId:0,cancelId:0,
  });
}
async function local(skipCheckpoint=false) {
  if(!skipCheckpoint)await prepareRenderer();
  serverOrigin = null;
  return win.loadURL("wildblocks://game/index.html");
}
async function stopHosting() {
  const child = hosted;
  if (!child) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { child.kill(); resolve(); }, 5000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.postMessage("stop");
  });
  if (hosted === child) hosted = null;
}
app.whenReady().then(() => {
  const root = path.resolve(__dirname, "../dist");
  protocol.handle("wildblocks", (request) => {
    const url = new URL(request.url),
      file = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (url.hostname !== "game" || !file.startsWith(root + path.sep))
      return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: "Wildblocks",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.on("close",event=>{if(!quitting){event.preventDefault();app.quit();}});
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    try {
      if (
        !url.startsWith("wildblocks://game/") &&
        new URL(url).origin !== serverOrigin
      )
        event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  ipcMain.handle("wildblocks:quit", (event) => { trusted(event); app.quit(); });
  ipcMain.handle("wildblocks:local", (event) => {
    trusted(event);
    return local();
  });
  ipcMain.handle("wildblocks:connect", async (event, address) => {
    trusted(event);
    if (!event.senderFrame.url.startsWith("wildblocks://game/"))
      throw Error("Return to the main menu to join another server.");
    const url = new URL(address);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw Error(
        "Use an http:// or https:// server address without embedded credentials.",
      );
    let response;
    try {
      response = await net.fetch(url.origin + "/api/status", { signal: AbortSignal.timeout(8000) });
    } catch {
      throw Error("Could not reach the server. Check its address and whether it is running.");
    }
    if (!response.ok) throw Error("Server unavailable. Check the address and try again.");
    const status = await response.json();
    if (!["survival", "creative"].includes(status.mode)) throw Error("This address is not a Wildblocks server.");
    serverOrigin = url.origin;
    await win.loadURL(serverOrigin + "/");
    return true;
  });
  ipcMain.handle("wildblocks:hosting", (event) => {
    trusted(event);
    if (!event.senderFrame.url.startsWith("wildblocks://game/") && new URL(event.senderFrame.url).origin !== hosted?.ready?.url)
      return null;
    return hosted?.ready || null;
  });
  ipcMain.handle("wildblocks:stop-hosting", async (event) => {
    trusted(event);
    const origin = new URL(event.senderFrame.url).origin;
    if (!event.senderFrame.url.startsWith("wildblocks://game/") && origin !== hosted?.ready?.url)
      throw Error("Only your local hosted server can be stopped here.");
    await prepareRenderer();
    await stopHosting();
    return local(true);
  });
  ipcMain.handle("wildblocks:start", async (event, options) => {
    trusted(event);
    if (!event.senderFrame.url.startsWith("wildblocks://game/"))
      throw Error("Return to single-player to manage hosting.");
    if (hosted) {
      if (!hosted.ready) throw Error("Your server is still starting.");
      if (hosted.ready.mode !== options?.mode || hosted.ready.lan !== (options?.lan === true) || new URL(hosted.ready.url).port !== String(options?.port))
        throw Error("Your server is already running with other settings. Join it, then stop it before changing settings.");
      return hosted.ready;
    }
    if (
      !options ||
      !Number.isInteger(options.port) ||
      options.port < 1024 ||
      options.port > 65535 ||
      typeof options.seed !== "string" ||
      options.seed.length > 64 ||
      !["survival", "creative"].includes(options.mode)
    )
      throw Error("Choose a port from 1024–65535 and a world seed.");
    const dataDir = path.join(
      app.getPath("userData"),
      "hosted-server",
      options.mode === "creative" ? "creative" : ".",
    );
    fs.mkdirSync(dataDir, { recursive: true });
    const child = utilityProcess.fork(
      path.join(__dirname, "../server/entry.cjs"),
      [
        dataDir,
        options.lan === true ? "0.0.0.0" : "127.0.0.1",
        String(options.port),
        options.seed,
        options.mode,
      ],
      { stdio: "pipe", serviceName: "Wildblocks server" },
    );
    hosted = child;
    child.on("exit", () => {
      if (hosted === child) hosted = null;
    });
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill();
        hosted = null;
        reject(Error("Server startup timed out."));
      }, 15000);
      child.once("message", (message) => {
        clearTimeout(timer);
        if (message.error) {
          hosted = null;
          reject(Error(message.error));
        } else {
          child.ready = { ...message.ready, mode: options.mode, lan: options.lan === true };
          resolve(child.ready);
        }
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(Error("Server stopped during startup."));
      });
    });
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      {
        label: "Game",
        submenu: [
          { label: "Return to single-player", click: () => local().catch(error=>showSaveFailure(error)) },
          { label: "Stop hosted server", click: async () => { try { await prepareRenderer(); await stopHosting(); await local(true); } catch(error) { await showSaveFailure(error); } } },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
  local(true);
  app.on("activate", () => win.show());
});
app.on("before-quit",event=>{
  if(quitting)return;
  event.preventDefault();
  if(closing)return;
  closing=true;
  (async()=>{
    let retry=false;
    try { await prepareRenderer(); await stopHosting(); quitting=true; app.quit(); }
    catch(error) { retry=(await showSaveFailure(error,true)).response===1; }
    finally { closing=false; }
    if(retry)app.quit();
  })().catch(()=>{closing=false;});
});
app.on("window-all-closed", () => app.quit());
