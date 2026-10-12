import { Socket } from "node:net";

function isLoopback(host: string): boolean {
  const bare = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return bare === "localhost" || bare === "127.0.0.1" || bare === "::1" || bare === "::ffff:127.0.0.1" || bare === "";
}

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

/**
 * Blocks non-loopback sockets and fetch. On unless NO_NETWORK=0.
 * `[::1]` is loopback: Node reports that hostname with the brackets.
 *
 * Tests install this with `node --import`. Scripts that talk to the model router import it.
 * The API server does not. A real provider on that server is not blocked by this guard.
 * Set NO_NETWORK=0 only for a script that must call a non-loopback host.
 */
if (process.env.NO_NETWORK !== "0") {
  const original = Socket.prototype.connect;
  Socket.prototype.connect = function connect(this: Socket, ...args: unknown[]) {
    const host = hostFrom(args);
    if (!isLoopback(host)) {
      throw new Error(`network blocked: ${host}`);
    }
    return original.apply(this, args as never);
  } as typeof Socket.prototype.connect;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw);
    if (!isLoopback(url.hostname)) throw new Error(`network blocked: ${url.hostname}`);
    return originalFetch(input, init);
  }) as typeof fetch;
}
