import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function verifyBrainReview(browser, { adminOrigin, publicOrigin, ownerKey, output, red = false }) {
  const samples = [], failures = [];
  for (const width of [1440, 390, 320]) for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, javaScriptEnabled, reducedMotion: "reduce", ignoreHTTPSErrors: true,
      httpCredentials: { username: "owner", password: ownerKey, origin: adminOrigin }, serviceWorkers: "block" });
    await context.route("**/*", route => [adminOrigin, publicOrigin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [], diagnostics = [];
    page.on("console", entry => { if (entry.type() === "error") diagnostics.push(entry.text()); });
    page.on("requestfailed", request => diagnostics.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
    page.on("pageerror", error => errors.push(error.message));
    try {
      const draft = { title: `재검토 흐름 ${width} ${javaScriptEnabled} ${randomUUID()}`, originalText: "PRIVATE_REVIEW_ORIGINAL", publicTitle: "공개 확인 메모", publicSummary: "버전별 확인",
        publicBody: "검토와 공개는 별개입니다.", kind: "question", topic: "reliability", basis: "question", tags: [], questions: ["다시 확인할 조건은?"] };
      const headers = { authorization: `Basic ${Buffer.from("owner:" + ownerKey).toString("base64")}`, origin: adminOrigin };
      const post = data => context.request.post(adminOrigin + "/admin/brain/records", { headers, data });
      const saved = await post({ action: "save", draft, revision: 0, commandId: randomUUID(), commandRevision: 0 });
      assert.equal(saved.status(), 200); const initial = await saved.json();
      await page.goto(adminOrigin + "/admin/brain?reason=questions", { waitUntil: "networkidle" });
      assert.equal(await page.getByText("다시 확인할 기록", { exact: true }).count(), 1, "manual review queue is missing");
      if (red) continue;
      await page.getByText("다시 확인할 기록", { exact: true }).click();
      await page.getByRole("link", { name: draft.title, exact: true }).click();
      await page.waitForURL(url => url.searchParams.get("note") === initial.id);
      const section = page.getByRole("region", { name: "버전별 재검토", exact: true });
      const button = section.getByRole("button", { name: "이 버전 확인 완료", exact: true });
      if (!javaScriptEnabled) {
        assert(await button.isDisabled()); assert((await section.innerText()).includes("미검토"));
      } else {
        await section.getByLabel("검토 메모", { exact: true }).fill("PRIVATE_REVIEW_MEMO");
        await button.focus(); assert(await button.evaluate(el => el.matches(":focus-visible")));
        await page.keyboard.press("Enter");
        await page.getByRole("status").filter({ hasText: "검토 결과를 기록했습니다." }).waitFor();
        assert((await section.innerText()).includes("상태: 확인 완료"));
        await page.getByLabel("그때의 기록", { exact: true }).fill("PRIVATE_REVIEW_NEW_VERSION");
        assert(await button.isDisabled());
        await page.getByRole("button", { name: "비공개로 저장", exact: true }).click();
        await page.getByRole("status").filter({ hasText: "비공개로 저장했습니다." }).waitFor();
        assert((await section.innerText()).includes("상태: 확인 필요"));
        await section.getByLabel("검토 메모", { exact: true }).fill("다음 조건을 직접 확인");
        await section.getByRole("button", { name: "다시 확인할 항목으로 지정", exact: true }).click();
        await page.getByRole("status").filter({ hasText: "검토 결과를 기록했습니다." }).waitFor();
        // Lose the successful response, then replay the same command through the UI.
        await page.route("**/admin/brain/records", async route => {
          if (route.request().method() === "POST" && route.request().postDataJSON().action === "review") {
            await route.fetch(); await route.abort("connectionreset"); await page.unroute("**/admin/brain/records");
          } else await route.continue();
        });
        await button.click();
        await page.getByRole("button", { name: "같은 요청 다시 확인", exact: true }).waitFor();
        assert(await button.isDisabled());
        await page.getByRole("button", { name: "같은 요청 다시 확인", exact: true }).click();
        await page.getByRole("status").filter({ hasText: "검토 결과를 기록했습니다." }).waitFor();
        assert((await section.innerText()).includes("상태: 확인 완료"));
        const detail = await (await context.request.get(adminOrigin + "/admin/brain/records?id=" + initial.id, { headers })).json();
        assert.equal(detail.note.review.history.length, 3); assert.equal(detail.note.publishedRevision, null);
        assert.equal(detail.note.history.at(-1).draft.originalText, draft.originalText);
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await section.screenshot({ path: join(output, `review-${width}-${javaScriptEnabled}.png`) });
      await page.reload({ waitUntil: "networkidle" }); assert.equal(new URL(page.url()).searchParams.get("note"), initial.id);
      await page.goBack({ waitUntil: "networkidle" }); assert.equal(new URL(page.url()).searchParams.get("note"), null);
      assert.deepEqual(errors, []); samples.push({ width, javaScriptEnabled, reviewAndRevision: true, historyAndPrivacy: true });
    } catch (error) { failures.push({ width, javaScriptEnabled, message: error.message, errors, diagnostics }); }
    finally { await context.close(); }
  }
  await writeFile(join(output, "reviews.json"), JSON.stringify({ samples, failures }, null, 2) + "\n");
  assert.equal(failures.length, 0, "Review browser checks failed; see reviews.json");
  return samples;
}
