const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("wildblocksDesktop", {
  startServer: (options) => ipcRenderer.invoke("wildblocks:start", options),
  connect: (url) => ipcRenderer.invoke("wildblocks:connect", url),
  hosting: () => ipcRenderer.invoke("wildblocks:hosting"),
  stopHosting: () => ipcRenderer.invoke("wildblocks:stop-hosting"),
  onPrepareClose: (callback) => {
    ipcRenderer.on("wildblocks:prepare-close",async (_event,id)=>{
      try { await callback(); } catch {}
      finally { ipcRenderer.send("wildblocks:checkpoint-complete",id); }
    });
  },
  quit: () => ipcRenderer.invoke("wildblocks:quit"),
  local: () => ipcRenderer.invoke("wildblocks:local"),
});
