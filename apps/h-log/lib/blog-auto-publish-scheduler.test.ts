import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const appUrl = new URL("../", import.meta.url);
const deployUrl = new URL("../deploy/", import.meta.url);

describe("auto publish scheduler packaging", () => {
  it("uses image-owned worker and auto-publish runtime defaults", async () => {
    const [dockerfile, autoPublishDockerfile, compose] = await Promise.all([
      readFile(new URL("Dockerfile", appUrl), "utf8"),
      readFile(new URL("Dockerfile.auto-publish", appUrl), "utf8"),
      readFile(new URL("compose.yaml", appUrl), "utf8"),
    ]);
    const workerService = compose.slice(
      compose.indexOf("  hlog-worker:"),
      compose.indexOf("  hlog-auto-publish:"),
    );
    const autoPublishService = compose.slice(
      compose.indexOf("  hlog-auto-publish:"),
      compose.indexOf("  hlog-migrate:"),
    );

    assert.match(
      dockerfile,
      /FROM job-deps AS worker[\s\S]*CMD \["npm", "run", "worker:once"\]/,
    );
    assert.match(autoPublishDockerfile, /ENV HERMES_HOME=\/opt\/data/);
    assert.match(
      autoPublishDockerfile,
      /CMD \["npm", "run", "auto-publish:cycle"\]/,
    );
    assert.doesNotMatch(workerService, /^\s+command:/m);
    assert.doesNotMatch(
      autoPublishService,
      /^\s+(?:HERMES_HOME|HLOG_HERMES_COMMAND):/m,
    );
  });

  it("runs the image-owned cycle only after the container-local OAuth check", async () => {
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
      /^ExecStart=\/usr\/bin\/docker compose --profile scheduler run --rm hlog-auto-publish$/m,
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
