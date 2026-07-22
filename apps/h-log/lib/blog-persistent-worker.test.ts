import assert from "node:assert/strict";
import { it } from "node:test";

import type { Pool } from "pg";

import { runPersistentWorkerOnce } from "./blog-persistent-worker.ts";

it("scopes a scheduled required worker claim to one post", async () => {
  let claimedQuery = "";
  let claimedValues: unknown[] = [];
  const pool = {
    async query(query: string, values: unknown[]) {
      claimedQuery = query;
      claimedValues = values;
      return { rowCount: 0, rows: [] };
    },
  } as unknown as Pool;

  const result = await runPersistentWorkerOnce({
    adapter: {
      async run() {
        throw new Error("idle worker must not call the adapter");
      },
    },
    importance: "required",
    pool,
    postId: "post-2026-07-22",
    runAt: "2026-07-22T00:00:00.000Z",
    workerId: "scheduled-worker",
  });

  assert.deepEqual(result, { status: "idle" });
  assert.match(claimedQuery, /job\.post_id = \$5/);
  assert.match(claimedQuery, /job\.importance = \$6/);
  assert.deepEqual(claimedValues.slice(4), [
    "post-2026-07-22",
    "required",
  ]);
});
