import assert from "node:assert/strict";
import { describe, test } from "node:test";

describe("network guard", { concurrency: false }, () => {
  test("blocks_public_hosts_and_treats_ipv6_loopback_as_local", async () => {
    await assert.rejects(() => fetch("https://example.com"), /network blocked: example.com/);
    await assert.rejects(
      () => fetch("http://[::1]:1/"),
      (error: unknown) => error instanceof Error && !/network blocked/.test(error.message),
    );
  });
});
