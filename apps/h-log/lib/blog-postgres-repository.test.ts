import assert from "node:assert/strict";
import test from "node:test";

import type { Pool } from "pg";

import { createPostgresBlogRepository } from "./blog-postgres-repository.ts";

test("limits public read candidates to published current versions in SQL", async () => {
  const queries: string[] = [];
  const pool = {
    async query(query: string) {
      queries.push(query);
      return { rows: [] };
    },
  } as unknown as Pool;
  const repository = createPostgresBlogRepository(pool);

  await repository.findPublicBlogContent();
  await repository.findPublicBlogContentBySlug("private-draft");

  const [publicPostsQuery, publicVersionsQuery, slugQuery] = queries;

  assert.match(
    publicPostsQuery,
    /where\s+status = 'published'\s+and\s+current_version_id is not null/i,
  );
  assert.match(
    publicVersionsQuery,
    /join\s+posts[\s\S]*status = 'published'[\s\S]*current_version_id = post_versions\.id/i,
  );
  assert.match(
    slugQuery,
    /where\s+slug = \$1\s+and\s+status = 'published'\s+and\s+current_version_id is not null/i,
  );
});
