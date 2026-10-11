import { Socket } from "node:net";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "::ffff:127.0.0.1", ""]);

function hostFrom(args: unknown[]): string {
  const first = args[0];
  if (typeof first === "number") return typeof args[1] === "string" ? args[1] : "127.0.0.1";
  if (typeof first === "string") return first;
  if (first && typeof first === "object") {
    const record = first as { host?: string; hostname?: string; path?: string; port?: number };
    if (record.path && record.port === undefined && !record.host && !record.hostname) return "";
    return record.host ?? record.hostname ?? "127.0.0.1";
  }
  return "127.0.0.1";
}

if (process.env.NO_NETWORK === "1") {
  const original = Socket.prototype.connect;
  Socket.prototype.connect = function connect(this: Socket, ...args: unknown[]) {
    const host = hostFrom(args);
    if (!LOOPBACK.has(host)) {
      throw new Error(`network blocked: ${host}`);
    }
    return original.apply(this, args as never);
  } as typeof Socket.prototype.connect;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw);
    if (!LOOPBACK.has(url.hostname)) throw new Error(`network blocked: ${url.hostname}`);
    return originalFetch(input, init);
  }) as typeof fetch;
}
