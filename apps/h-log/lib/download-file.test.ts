import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAttachmentContentDisposition } from "./download-file.ts";

describe("createAttachmentContentDisposition", () => {
  it("uses an ASCII fallback and an RFC 5987 UTF-8 filename", () => {
    assert.equal(
      createAttachmentContentDisposition("손홍백-자기소개서.pdf", "resume.pdf"),
      "attachment; filename=\"resume.pdf\"; filename*=UTF-8''%EC%86%90%ED%99%8D%EB%B0%B1-%EC%9E%90%EA%B8%B0%EC%86%8C%EA%B0%9C%EC%84%9C.pdf",
    );
  });
});
