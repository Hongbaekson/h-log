import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

const scannedRoots = ["app", "components"];
const sourceFilePattern = /\.(ts|tsx)$/;

describe("static security guardrails", () => {
  it("does not use raw HTML injection in renderable app code", () => {
    const offenders = scannedRoots
      .flatMap((root) => listSourceFiles(join(process.cwd(), root)))
      .filter((filePath) =>
        readFileSync(filePath, "utf8").includes("dangerouslySetInnerHTML"),
      )
      .map((filePath) => relative(process.cwd(), filePath).replaceAll("\\", "/"));

    assert.deepEqual(offenders, []);
  });
});

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return sourceFilePattern.test(entry.name) ? [entryPath] : [];
  });
}
