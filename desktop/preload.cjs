const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("wildblocksDesktop", {
  startServer: (options) => ipcRenderer.invoke("wildblocks:start", options),
  connect: (url) => ipcRenderer.invoke("wildblocks:connect", url),
  hosting: () => ipcRenderer.invoke("wildblocks:hosting"),
  stopHosting: () => ipcRenderer.invoke("wildblocks:stop-hosting"),
  onPrepareClose: (callback) => {
    ipcRenderer.on("wildblocks:prepare-close",async (_event,id)=>{
      try {
        await callback();
        ipcRenderer.send("wildblocks:checkpoint-complete",id,{ok:true});
      } catch(error) {
        ipcRenderer.send("wildblocks:checkpoint-complete",id,{ok:false,message:String(error?.message || "Saving failed.").slice(0,500)});
      }
    });
  },
  quit: () => ipcRenderer.invoke("wildblocks:quit"),
  local: () => ipcRenderer.invoke("wildblocks:local"),
});
