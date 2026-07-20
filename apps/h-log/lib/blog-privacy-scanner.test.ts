import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createBlogPrivacyScanPolicyFromEnvironment,
  scanBlogPrivacyText,
} from "./blog-privacy-scanner.ts";

describe("blog privacy scanner", () => {
  it("redacts sensitive values without retaining them in the scan result", () => {
    const fakeToken = `sk-${"x".repeat(24)}`;
    const internalUrl = "http://worker.internal/admin";
    const personalEmail = "developer@example.test";
    const organizationName = "Example Confidential Customer";
    const privateRepository = "example/private-platform";
    const result = scanBlogPrivacyText(
      [
        `api_key=${fakeToken}`,
        `internal=${internalUrl}`,
        `contact=${personalEmail}`,
        `customer=${organizationName}`,
        `private repo=${privateRepository}`,
      ].join("\n"),
      {
        restrictedTerms: [
          { category: "organization_name", value: organizationName },
          { category: "private_repository", value: privateRepository },
        ],
      },
    );

    assert.equal(result.status, "blocked");
    assert.deepEqual(result.findingTypes, [
      "api_credential",
      "internal_network",
      "personal_contact",
      "organization_name",
      "private_repository",
    ]);
    assert.match(result.redactedText, /\[REDACTED\]/);
    assert.match(result.auditMessage, /\[REDACTED\]/);

    const serialized = JSON.stringify(result);
    for (const sensitiveValue of [
      fakeToken,
      internalUrl,
      personalEmail,
      organizationName,
      privateRepository,
    ]) {
      assert.equal(serialized.includes(sensitiveValue), false);
    }
  });

  it("builds explicit organization and private repository terms from environment JSON", () => {
    const policy = createBlogPrivacyScanPolicyFromEnvironment({
      HLOG_PRIVACY_ORGANIZATION_NAMES: JSON.stringify(["Example Customer"]),
      HLOG_PRIVACY_PRIVATE_REPOSITORIES: JSON.stringify([
        "example/internal-api",
      ]),
    });

    assert.deepEqual(policy.restrictedTerms, [
      { category: "organization_name", value: "Example Customer" },
      { category: "private_repository", value: "example/internal-api" },
    ]);
    assert.throws(
      () =>
        createBlogPrivacyScanPolicyFromEnvironment({
          HLOG_PRIVACY_ORGANIZATION_NAMES: "not-json",
        }),
      /HLOG_PRIVACY_ORGANIZATION_NAMES must be a JSON string array/,
    );
  });

  it("detects credential values in structured JSON input", () => {
    const fakeCredential = `credential-${"x".repeat(16)}`;
    const result = scanBlogPrivacyText(
      JSON.stringify({ apiKey: fakeCredential }),
    );

    assert.equal(result.status, "blocked");
    assert.deepEqual(result.findingTypes, ["api_credential"]);
    assert.equal(JSON.stringify(result).includes(fakeCredential), false);
  });
});
