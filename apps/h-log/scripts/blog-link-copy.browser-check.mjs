import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// Caller supplies an isolated loopback app with Korean, duplicate and nested headings.
export async function verifyBlogLinkCopy(browser, origin, fixture, output) {
  assert.equal(new URL(origin).hostname, "127.0.0.1");
  const samples = [], failures = [];
  const path = `/blog/${fixture.slugs[0]}`;
  const canonical = `https://hlog.example.org${path}`;
  for (const width of [1440, 390, 320]) for (const mode of ["success", "denied", "unsupported", "no-js"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== "no-js", reducedMotion: "reduce", serviceWorkers: "block" });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    if (mode === "success") await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    if (mode === "denied" || mode === "unsupported") await context.addInitScript(mode => {
      Object.defineProperty(navigator, "clipboard", { value: mode === "unsupported" ? undefined : { writeText: async () => { throw new DOMException("Denied", "NotAllowedError"); } } });
    }, mode);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(`${origin}${path}?q=private-query&returnTo=/admin/posts#unrelated`, { waitUntil: "networkidle" });
      const articleLink = page.getByRole("link", { name: "글 주소", exact: true });
      assert.equal(await articleLink.count(), 1, "article canonical link is missing");
      assert.equal(await articleLink.getAttribute("href"), canonical);
      const headings = page.locator("article h2, article h3");
      assert.deepEqual(await headings.evaluateAll(els => els.map(el => el.id)), fixture.headingIds);
      for (let i = 0; i < fixture.headingIds.length; i++) {
        const heading = headings.nth(i), hash = `#${encodeURIComponent(fixture.headingIds[i])}`;
        assert.equal(await heading.getByRole("link", { name: "이 제목으로 이동", exact: true }).getAttribute("href"), hash);
      }
      if (mode === "no-js") {
        assert.equal(await page.getByRole("button", { name: /주소 복사/ }).count(), 0);
      } else {
        for (const [scope, label, href] of [[page, "글 주소 복사", canonical], ...fixture.headingIds.map((id, i) => [headings.nth(i), "소제목 주소 복사", canonical + "#" + encodeURIComponent(id)])]) {
          const button = scope.getByRole("button", { name: label, exact: true });
          await button.focus(); assert(await button.evaluate(el => el.matches(":focus-visible")));
          const before = page.url(); await page.keyboard.press("Enter");
          const group = button.locator("..");
          await group.getByRole("status").filter({ hasText: mode === "success" ? "주소를 복사했습니다." : "복사하지 못했습니다." }).waitFor();
          assert(await button.evaluate(el => el === document.activeElement)); assert.equal(page.url(), before);
          if (mode === "success") assert.equal(await page.evaluate(() => navigator.clipboard.readText()), href);
          else {
            assert.equal(await group.getByRole("link", { name: "주소 직접 복사", exact: true }).getAttribute("href"), href);
            assert(!(await group.innerText()).includes("주소를 복사했습니다."));
          }
        }
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: join(output, `${mode}-${width}.png`), fullPage: true });
      await headings.nth(1).screenshot({ path: join(output, `${mode}-${width}-heading.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: join(output, `${mode}-${width}-top.png`) });
      const hash = "#" + encodeURIComponent(fixture.headingIds[1]);
      await headings.nth(1).getByRole("link", { name: "이 제목으로 이동", exact: true }).click();
      assert.equal(new URL(page.url()).hash, hash);
      await page.goBack(); assert.equal(new URL(page.url()).hash, "#unrelated");
      await page.goto(origin + path + hash, { waitUntil: "networkidle" }); await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator(":target").getAttribute("id"), fixture.headingIds[1]);
      const position = await page.locator(":target").boundingBox(); assert(position.y >= 0 && position.y < 900);
      assert.deepEqual(errors, []);
      samples.push({ width, mode, canonicalOnly: true, headingIdsPreserved: true, directHashAndReload: true, focusPreserved: true });
    } catch (error) { failures.push({ width, mode, message: error.message }); }
    finally { await context.close(); }
  }
  await writeFile(join(output, "copy.json"), JSON.stringify({ samples, failures }, null, 2) + "\n");
  assert.equal(failures.length, 0, "Link copy checks failed; see copy.json");
  return samples;
}
