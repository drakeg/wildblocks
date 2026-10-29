import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

// Only the server process reads this file. Clients cannot change these rules.
export function serverOptions(args, env = process.env, cwd = process.cwd()) {
  if (args.length && !args[0].startsWith("--")) {
    const [dataDir, host, port, seed, mode] = args;
    return validate({ dataDir: resolve(cwd, dataDir), host: host || env.WILDBLOCKS_HOST || "127.0.0.1", port: Number(port || env.WILDBLOCKS_PORT || 4182), seed: seed || "friends-01", mode: mode || env.WILDBLOCKS_MODE, tlsCert: env.WILDBLOCKS_TLS_CERT, tlsKey: env.WILDBLOCKS_TLS_KEY, publicHost: env.WILDBLOCKS_PUBLIC_HOST });
  }
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const match = /^(--(?:config|mode|port|host|data|seed))(?:=(.*))?$/.exec(args[i]);
    if (!match) throw Error("Unknown server option: " + args[i]);
    const value = match[2] ?? args[++i];
    if (!value || value.startsWith("--")) throw Error("Missing value for " + match[1]);
    flags[match[1].slice(2)] = value;
  }
  const configPath = flags.config ? resolve(cwd, flags.config) : null;
  const config = configPath ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  if (!config || typeof config !== "object" || Array.isArray(config)) throw Error("Invalid server configuration.");
  const base = configPath ? dirname(configPath) : cwd;
  return validate({
    dataDir: resolve(base, flags.data ?? env.WILDBLOCKS_DATA ?? config.dataDir ?? "server-data"),
    host: flags.host ?? env.WILDBLOCKS_HOST ?? config.host ?? "127.0.0.1",
    port: Number(flags.port ?? env.WILDBLOCKS_PORT ?? config.port ?? 4182),
    seed: flags.seed ?? env.WILDBLOCKS_SEED ?? config.seed ?? "friends-01",
    mode: flags.mode ?? env.WILDBLOCKS_MODE ?? config.mode,
    tlsCert: env.WILDBLOCKS_TLS_CERT ?? (config.tlsCert ? resolve(base, config.tlsCert) : undefined),
    tlsKey: env.WILDBLOCKS_TLS_KEY ?? (config.tlsKey ? resolve(base, config.tlsKey) : undefined),
    publicHost: env.WILDBLOCKS_PUBLIC_HOST ?? config.publicHost,
  });
}
function validate(options) {
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535)
    throw Error("Server port must be an integer from 1 to 65535.");
  if (options.mode !== undefined && !["survival", "creative"].includes(options.mode))
    throw Error("Server mode must be survival or creative.");
  if (typeof options.host !== "string" || !options.host || /[\s/]/.test(options.host))
    throw Error("Invalid server bind address.");
  if (typeof options.seed !== "string" || options.seed.length > 64)
    throw Error("World seed must be at most 64 characters.");
  if (!!options.tlsCert !== !!options.tlsKey) throw Error("Configure both TLS certificate and key.");
  return options;
}
