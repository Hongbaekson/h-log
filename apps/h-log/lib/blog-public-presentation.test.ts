import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatPublicBlogArticleMode,
  formatPublicBlogDate,
} from "./blog-public-presentation.ts";
import { blogArticleModes } from "./blog-content-model.ts";

describe("public blog presentation", () => {
  it("formats valid dates with the current Korean day/month/year order", () => {
    assert.equal(formatPublicBlogDate("2026-06-27T09:00:00.000Z"), "2026. 06. 27.");
  });

  it("leaves invalid search dates unchanged", () => {
    assert.equal(formatPublicBlogDate("invalid-date"), "invalid-date");
  });

  it("labels every article mode using the detail page's Korean wording", () => {
    assert.deepEqual(
      blogArticleModes.map((mode) => formatPublicBlogArticleMode(mode)),
      ["실험 기록", "적용 분석", "문서 분석", "프로젝트 기록", "운영 회고"],
    );
  });
});
