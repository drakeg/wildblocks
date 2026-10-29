(async () => {
  const { startServer } = await import("./server.mjs");
  if (process.argv.includes("--help")) {
    console.log("Wildblocks Dedicated Server\nnode server/entry.cjs --config server.config.json\nOverrides: --mode survival|creative --host ADDRESS --port NUMBER --data PATH --seed NAME");
    return;
  }
  const { serverOptions } = await import("./config.mjs");
  const options = serverOptions(process.argv.slice(2));
  const service = await startServer(options);
  const ready = { url: service.url, addresses: service.addresses };
  if (process.parentPort) process.parentPort.postMessage({ ready });
  else
    process.stdout.write(
      `Wildblocks server: ${service.url}\nData: ${options.dataDir}\n`,
    );
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await service.close();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  // A Windows service wrapper requests a graceful save through stdin.
  if (!process.parentPort) {
    const readline = require("node:readline");
    const lines = readline.createInterface({ input: process.stdin });
    lines.on("line", line => { if (line.trim() === "stop") stop(); });
  }
  if (process.parentPort)
    process.parentPort.on("message", (event) => {
      if (event.data === "stop") stop();
    });
})().catch((error) => {
  if (process.parentPort)
    process.parentPort.postMessage({
      error:
        error.code === "EADDRINUSE"
          ? "That port is already in use. Choose another hosting port."
          : "Server could not start. Check the port and saved data.",
    });
  else process.stderr.write(error.message + "\n");
  process.exit(1);
});
