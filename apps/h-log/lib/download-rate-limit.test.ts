import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createFixedWindowRateLimiter } from "./download-rate-limit.ts";

describe("createFixedWindowRateLimiter", () => {
  it("allows requests until the window limit is reached", () => {
    const limiter = createFixedWindowRateLimiter({
      limit: 2,
      windowMs: 60_000,
    });

    assert.deepEqual(limiter.check("client-a", 1_000), {
      allowed: true,
      remaining: 1,
      resetAt: 61_000,
      retryAfterSeconds: 0,
    });
    assert.deepEqual(limiter.check("client-a", 2_000), {
      allowed: true,
      remaining: 0,
      resetAt: 61_000,
      retryAfterSeconds: 0,
    });
    assert.deepEqual(limiter.check("client-a", 3_000), {
      allowed: false,
      remaining: 0,
      resetAt: 61_000,
      retryAfterSeconds: 58,
    });
  });

  it("resets the counter after the window passes", () => {
    const limiter = createFixedWindowRateLimiter({
      limit: 1,
      windowMs: 1_000,
    });

    assert.equal(limiter.check("client-a", 1_000).allowed, true);
    assert.equal(limiter.check("client-a", 1_500).allowed, false);
    assert.deepEqual(limiter.check("client-a", 2_001), {
      allowed: true,
      remaining: 0,
      resetAt: 3_001,
      retryAfterSeconds: 0,
    });
  });

  it("tracks different clients independently", () => {
    const limiter = createFixedWindowRateLimiter({
      limit: 1,
      windowMs: 60_000,
    });

    assert.equal(limiter.check("client-a", 1_000).allowed, true);
    assert.equal(limiter.check("client-a", 2_000).allowed, false);
    assert.equal(limiter.check("client-b", 2_000).allowed, true);
  });
});
