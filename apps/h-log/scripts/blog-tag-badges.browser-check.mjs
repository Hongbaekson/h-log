// The caller supplies an isolated loopback app, public fixture and browser.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildBlogBrowseHref } from "../lib/blog-search-ui.ts";

export async function verifyBlogTagBadges(browser, origin, fixture, output) {
  assert.equal(new URL(origin).hostname, "127.0.0.1");
  const samples = [], failures = [];
  for (const width of [1440, 390, 320]) for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled, reducedMotion: "reduce", serviceWorkers: "block",
      extraHTTPHeaders: { "x-real-ip": `tag-badges-${width}-${javaScriptEnabled}` } });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const overflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "horizontal overflow");
    const row = () => page.locator("main article").filter({ has: page.locator("h2") }).first();
    const expected = (tag, query = "") => buildBlogBrowseHref({ tag, query, page: 1 });
    try {
      for (const surface of javaScriptEnabled ? ["list", "detail", "search"] : ["list", "detail"]) {
        try {
          const query = surface === "search" ? fixture.query : "";
          const path = surface === "detail" ? `/blog/${fixture.slugs[0]}` : buildBlogBrowseHref({ query, tag: null, page: 2 });
          assert.equal((await page.goto(origin + path, { waitUntil: "networkidle" })).status(), 200);
          if (surface === "search") await page.getByText(`${fixture.publicCount}개 결과`, { exact: true }).waitFor();
          const scope = surface === "detail" ? page.locator("main") : row();
          for (const tag of fixture.tags) {
            const link = scope.getByRole("link", { name: tag, exact: true });
            assert.equal(await link.count(), 1, `${surface}: ${tag} needs a native anchor`);
            assert.equal(await link.getAttribute("href"), expected(tag, query));
            assert.equal(await link.locator("a").count(), 0, "nested anchor");
            assert.equal(await link.evaluate(el => el.parentElement.closest("a") !== null), false);
          }
          await overflow();
          // Unsubmitted text must not replace the query that produced the rows.
          if (surface === "search") await page.getByRole("searchbox", { name: "블로그 검색", exact: true }).fill("아직 제출하지 않은 검색어");
          const link = scope.getByRole("link", { name: fixture.tags[1], exact: true });
          assert.equal(await link.getAttribute("href"), expected(fixture.tags[1], query));
          await link.focus();
          assert(await link.evaluate(el => el.matches(":focus-visible")));
          assert.notEqual(await link.evaluate(el => getComputedStyle(el).outlineStyle), "none");
          await page.screenshot({ path: join(output, `${surface}-${width}-${javaScriptEnabled}.png`), fullPage: true });
          await page.keyboard.press("Enter"); await page.waitForURL(origin + expected(fixture.tags[1], query));
          if (query) await page.getByText(`${fixture.publicCount}개 결과`, { exact: true }).waitFor();
          const selected = page.getByRole("navigation", { name: "블로그 태그", exact: true }).locator('a[aria-current="page"]');
          assert((await selected.innerText()).includes(fixture.tags[1]));
          assert.equal(new URL(page.url()).searchParams.get("page"), null);
          assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
          await overflow();
          await page.goBack({ waitUntil: "networkidle" }); await page.waitForURL(origin + path);
          if (query) await page.getByText(`${fixture.publicCount}개 결과`, { exact: true }).waitFor();
          const popupPromise = context.waitForEvent("page");
          await (surface === "detail" ? page.locator("main") : row()).getByRole("link", { name: fixture.tags[0], exact: true }).click({ modifiers: ["Control"] });
          const popup = await popupPromise; await popup.waitForLoadState("domcontentloaded");
          assert.equal(popup.url(), origin + expected(fixture.tags[0], query)); await popup.close();
          assert.equal(page.url(), origin + path);
          samples.push({ width, javaScriptEnabled, surface, nativeLinks: fixture.tags.length, keyboardAndBack: true, newTab: true, overflow: false });
        } catch (error) { failures.push({ width, javaScriptEnabled, surface, message: error.message }); }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  await writeFile(join(output, "badges.json"), JSON.stringify({ samples, failures }, null, 2) + "\n");
  assert.equal(failures.length, 0, "Tag badge checks failed; see badges.json");
  return samples;
}
