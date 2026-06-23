import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("resume pdf asset", () => {
  it("places the profile photo below the subtitle at resume-photo size", async () => {
    const pdf = await readFile("public/son-hongbaek-resume.pdf", "latin1");

    assert.match(pdf, /\/ImProfile/);
    assert.match(pdf, /\/Subtype\s*\/Image/);
    assert.match(pdf, /\/Filter\s*\/DCTDecode/);
    assert.match(pdf, /84\.00 0 0 107\.96 46\.00 654\.00 cm/);
    assert.match(pdf, /45\.25 653\.25 85\.50 109\.46 re f/);
    assert.match(pdf, /46 634 m/);
  });
});
