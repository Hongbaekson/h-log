import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { siteConfig } from "./site.ts";

const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const headerSource = readFileSync(
  new URL("../components/layout/Header.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const themeTogglePath = new URL("../components/layout/ThemeToggle.tsx", import.meta.url);

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

  it("links the first keyboard focus target to the main content", () => {
    assert.match(layoutSource, /href="#main-content"/);
    assert.match(layoutSource, /<main[^>]*id="main-content"/);
  });

  it("closes the mobile navigation with Escape and restores focus", () => {
    assert.match(headerSource, /event\.key === "Escape"/);
    assert.match(headerSource, /menuButtonRef\.current\?\.focus\(\)/);
  });

  it("keeps the shared shell dark-only", () => {
    assert.equal(existsSync(themeTogglePath), false);
    assert.doesNotMatch(layoutSource, /h-log-theme|ThemeToggle/);
    assert.doesNotMatch(headerSource, /ThemeToggle/);
    assert.doesNotMatch(globalStylesSource, /data-theme="light"|\[class\*=/);
  });
});
