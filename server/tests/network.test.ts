import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { describe, test } from "node:test";

function notBlocked(error: unknown): boolean {
  return error instanceof Error && !/network blocked/.test(error.message);
}

function once(socket: net.Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
    socket.once("error", reject);
  });
}

async function caught(run: () => unknown): Promise<unknown> {
  try {
    await run();
    return undefined;
  } catch (error) {
    return error;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

describe("network guard", { concurrency: false }, () => {
  test("blocks_public_hosts_and_treats_ipv6_loopback_as_local", async () => {
    await assert.rejects(() => fetch("https://example.com"), /network blocked: example.com/);
    await assert.rejects(() => fetch("http://[::1]:1/"), notBlocked);
  });

  test("blocks_net_http_and_https_off_loopback_and_allows_loopback", async () => {
    for (const run of [
      () => once(net.connect(80, "example.com")),
      () => once(net.connect({ port: 80, host: "example.com" })),
      () =>
        new Promise((resolve, reject) => {
          const req = http.get("http://example.com/", () => resolve(undefined));
          req.on("error", reject);
        }),
      () =>
        new Promise((resolve, reject) => {
          const req = http.request("http://example.com/", () => resolve(undefined));
          req.on("error", reject);
          req.end();
        }),
      () =>
        new Promise((resolve, reject) => {
          const req = https.get("https://example.com/", () => resolve(undefined));
          req.on("error", reject);
        }),
    ]) {
      assert.match(messageOf(await caught(run)), /network blocked/);
    }
    assert.ok(notBlocked(await caught(() => once(net.connect(1, "127.0.0.1")))));
    assert.ok(notBlocked(await caught(() => once(net.connect({ port: 1, host: "localhost" })))));
    assert.ok(
      notBlocked(
        await caught(
          () =>
            new Promise((resolve, reject) => {
              const req = http.get("http://127.0.0.1:1/", () => resolve(undefined));
              req.on("error", reject);
            }),
        ),
      ),
    );
  });
});
