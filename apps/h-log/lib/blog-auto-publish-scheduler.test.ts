import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const deployUrl = new URL("../deploy/", import.meta.url);

describe("auto publish scheduler packaging", () => {
  it("runs the Compose cycle only after the container-local OAuth check", async () => {
    const service = await readFile(
      new URL("systemd/hlog-auto-publish.service", deployUrl),
      "utf8",
    );

    assert.match(
      service,
      /ExecStartPre=.*hlog-auto-publish npm run auth:preflight/,
    );
    assert.match(
      service,
      /ExecStart=.*hlog-auto-publish npm run auto-publish:cycle/,
    );
  });

  it("uses a persistent 09:00 Asia\/Seoul timer", async () => {
    const timer = await readFile(
      new URL("systemd/hlog-auto-publish.timer", deployUrl),
      "utf8",
    );

    assert.match(timer, /OnCalendar=\*-\*-\* 09:00:00 Asia\/Seoul/);
    assert.match(timer, /Persistent=true/);
  });
});
