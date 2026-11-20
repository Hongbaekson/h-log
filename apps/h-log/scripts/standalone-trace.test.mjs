import assert from "node:assert/strict";
import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import test from "node:test";

const excluded = ["private", "phases", "deploy/env.production", "deploy/postgres.env.production", "compose.override.yaml"];

test("the standalone server omits private files, deployment inputs and phase documents", () => {
  const root = ".next/standalone";
  assert(existsSync(join(root, "server.js")), "Run the production build first");
  assert.deepEqual(excluded.filter(path => existsSync(join(root, path))), []);
});

test("server file traces omit private files, deployment inputs and phase documents", () => {
  const traces = globSync(".next/server/**/*.nft.json");
  assert(traces.length > 0, "Expected production route traces");
  for (const trace of [...traces, ".next/next-server.js.nft.json"]) {
    const { files } = JSON.parse(readFileSync(trace, "utf8"));
    const count = files.filter(file => {
      const path = relative(process.cwd(), resolve(dirname(trace), file)).split(sep).join("/");
      return excluded.some(prefix => path === prefix || path.startsWith(prefix + "/"));
    }).length;
    assert.equal(count, 0, `${trace} references ${count} excluded files`);
  }
});
