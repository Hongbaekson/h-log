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

  it("aligns career evidence and separates professional skills from side-project tools", async () => {
    const page = await readFile("app/resume/page.tsx", "utf8");

    assert.match(page, /Gitea Actions 기반 빌드·테스트·배포 흐름 운영/);
    assert.match(page, /캐시 예열 시간을 35분 36초에서 68초로 단축/);
    assert.match(page, /장애 원인 식별 시간을 약 87% 단축/);
    assert.doesNotMatch(page, /GitHub Issues 변경과 Discord 알림 흐름 자동화/);
    assert.doesNotMatch(page, /GitHub Actions 기반 CI\/CD 파이프라인 구축 및 배포 자동화/);
    assert.match(page, /실무 핵심/);
    assert.match(page, /개인 프로젝트·운영/);
  });

  it("withholds the unsafe PDF download surface until a safe replacement exists", async () => {
    const page = await readFile("app/resume/page.tsx", "utf8");

    assert.doesNotMatch(page, /PdfDownloadButton|\/api\/resume\/pdf/);
    await assert.rejects(access("public/son-hongbaek-resume.pdf"));
    await assert.rejects(access("app/api/resume/pdf/route.ts"));
  });
});
