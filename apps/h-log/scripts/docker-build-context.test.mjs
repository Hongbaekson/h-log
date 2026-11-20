import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const app = fileURLToPath(new URL("../", import.meta.url));
const excluded = [
  "deploy/env.production", "deploy/postgres.env.production", "compose.override.yaml",
  "backups/marker", "deploy/backups/marker", "db.dump", "deploy/db.dump.gz",
  "deploy/db.backup", "private/marker",
];
const included = [
  "deploy/env.dev", "deploy/postgres.env.dev", "compose.yaml", "package.json",
  "lib/example.ts", "scripts/example.mjs", "migrations/example.sql", "public/icon.svg",
];

test("release Dockerfiles exclude local deployment inputs from COPY", async t => {
  const parent = resolve(tmpdir());
  const root = await mkdtemp(join(parent, "hlog-build-context-"));
  const input = join(root, "input");
  try {
    for (const path of [...excluded, ...included]) {
      const file = join(input, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, "synthetic marker");
    }
    await copyFile(join(app, ".dockerignore"), join(input, ".dockerignore"));
    for (const dockerfile of ["Dockerfile", "Dockerfile.auto-publish"]) {
      await t.test(dockerfile, async () => {
        const override = dockerfile + ".dockerignore";
        try {
          await copyFile(join(app, override), join(input, override));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        await writeFile(join(input, dockerfile), "FROM scratch\nCOPY . /context/\n");
        const output = join(root, "out-" + dockerfile);
        await exec("docker", ["buildx", "build", "--network", "none", "-f", dockerfile,
          "--output", "type=local,dest=" + output, "."], { cwd: input, windowsHide: true });
        const visible = [];
        for (const path of [...excluded, ...included]) {
          try {
            assert.equal(await readFile(join(output, "context", path), "utf8"), "synthetic marker");
            visible.push(path);
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
        }
        assert.deepEqual(visible, included);
      });
    }
  } finally {
    assert.equal(dirname(resolve(root)), parent);
    assert(basename(root).startsWith("hlog-build-context-"));
    await rm(root, { recursive: true, force: true });
  }
});
