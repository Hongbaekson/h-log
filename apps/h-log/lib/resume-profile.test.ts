import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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

  it("puts experience before compact skills and education", async () => {
    const page = await readFile("app/resume/page.tsx", "utf8");
    const aboutIndex = page.indexOf('eyebrow="About"');
    const experienceIndex = page.indexOf('eyebrow="Experience"');
    const skillsIndex = page.indexOf('eyebrow="Skills"');
    const educationIndex = page.indexOf('eyebrow="Education"');

    assert.ok(aboutIndex >= 0);
    assert.ok(aboutIndex < experienceIndex);
    assert.ok(experienceIndex < skillsIndex);
    assert.ok(skillsIndex < educationIndex);
    assert.match(page, /max-w-\[70ch\]/);
    assert.doesNotMatch(page, /오프너드|아스템즈|약 85%|평균 3분/);
  });

  it("withholds the unsafe PDF download surface until a safe replacement exists", async () => {
    const page = await readFile("app/resume/page.tsx", "utf8");

    assert.doesNotMatch(page, /PdfDownloadButton|\/api\/resume\/pdf/);
    await assert.rejects(access("public/son-hongbaek-resume.pdf"));
    await assert.rejects(access("app/api/resume/pdf/route.ts"));
  });
});
