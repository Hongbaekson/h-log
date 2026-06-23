import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { siteConfig } from "./site.ts";

describe("site navigation", () => {
  it("does not expose a contact category", () => {
    const navItems: ReadonlyArray<{ href: string; label: string }> = siteConfig.navItems;

    assert.equal(
      navItems.some((item) => item.href === "/contact"),
      false,
    );
    assert.equal(
      navItems.some((item) => item.label === "Contact"),
      false,
    );
  });
});
