// Run through an isolated local harness with its own browser and public graph.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function verifyBrainDiscovery(browser, origin, graph, output) {
  assert.equal(new URL(origin).hostname, "127.0.0.1");
  const samples = [], failures = [], blocked = [];
  for (const width of [1440, 390, 320]) for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width, height: 900 }, serviceWorkers: "block" });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === origin && (url.pathname === "/" || /^\/(?:brain|blog|portfolio|resume)(?:\/|$)/.test(url.pathname) || url.pathname.startsWith("/_next/") || ["/icon.svg", "/profile-photo.jpg"].includes(url.pathname))) return route.continue();
      blocked.push(url.pathname);
      return route.abort();
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      assert.equal((await page.goto(origin + (javaScriptEnabled ? "/brain?view=list" : "/brain"), { waitUntil: "networkidle" })).status(), 200);
      if (javaScriptEnabled) await page.locator(".mem-catalog").waitFor();
      const result = await page.evaluate(() => ({
        links: [...document.querySelectorAll('main a[href^="/brain/"]')].filter(a => a.checkVisibility()).map(a => ({ href: a.getAttribute("href"), text: a.textContent })),
        overflow: document.documentElement.scrollWidth > innerWidth,
        title: document.querySelector("main h1")?.textContent,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      }));
      samples.push({ width, javaScriptEnabled, ...result });
      assert.deepEqual(result.links.map(link => link.href).sort(), graph.nodes.map(node => `/brain/${node.id}`).sort(), "Every public note needs a visible independent detail anchor");
      for (const node of graph.nodes) assert(result.links.find(link => link.href === `/brain/${node.id}`).text.includes(node.title));
      assert(!result.overflow);
      assert.equal(result.canonical, "https://hlog.example.org/brain");
      if (!javaScriptEnabled) assert.equal(result.title, "Second Brain");
      if (graph.nodes.length) {
        const node = graph.nodes[0];
        if (!javaScriptEnabled) {
          await page.locator(`a[href="/brain/${node.id}"]`).click();
          await page.waitForURL(origin + `/brain/${node.id}`);
        } else await page.goto(origin + `/brain/${node.id}`, { waitUntil: "networkidle" });
        assert.equal(await page.locator("main h1").textContent(), node.title);
        for (const section of node.sections) for (const paragraph of section.paragraphs) assert((await page.locator("main").innerText()).includes(paragraph));
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://hlog.example.org/brain/${node.id}`);
      }
      assert.deepEqual(errors, []);
    } catch (error) {
      failures.push({ width, javaScriptEnabled, message: error.message });
    } finally { await context.close(); }
  }
  await writeFile(join(output, "discovery.json"), JSON.stringify({ samples, failures, blocked }, null, 2));
  assert.deepEqual(blocked, []);
  assert.equal(failures.length, 0, "Brain discovery checks failed; see discovery.json");
  return samples;
}
