import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resumeProfile } from "./resume-profile.ts";

describe("resume profile", () => {
  it("uses a stable public photo asset for the resume hero", () => {
    assert.equal(resumeProfile.photo.src, "/profile-photo.jpg");
    assert.equal(resumeProfile.photo.width, 365);
    assert.equal(resumeProfile.photo.height, 469);
    assert.equal(resumeProfile.photo.displayWidth, 168);
    assert.match(resumeProfile.photo.alt, /손홍백/);
  });
});
