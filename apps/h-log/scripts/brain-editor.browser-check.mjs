import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// The caller owns the isolated database, loopback origins and disposable browser.
export async function verifyBrainEditor(browser, { adminOrigin, publicOrigin, ownerKey, output, mode }) {
  for (const origin of [adminOrigin, publicOrigin]) assert.equal(new URL(origin).hostname, "127.0.0.1");
  const samples = [];
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, httpCredentials: { username: "owner", password: ownerKey }, ignoreHTTPSErrors: true, serviceWorkers: "block" });
    const page = await context.newPage(), errors = [];
    context.setDefaultTimeout(10000);
    page.on("pageerror", error => errors.push(error.message));
    await context.route("**/*", route => [adminOrigin, publicOrigin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    try {
      const marker = randomUUID().slice(0, 8), title = `UI_PRIVATE_${marker}`;
      await page.goto(`${adminOrigin}/admin/brain`);
      await page.getByLabel("내 기록 제목", { exact: true }).fill(title);
      await page.getByLabel("그때의 기록", { exact: true }).fill(`PRIVATE_ORIGINAL_${marker}`);
      await page.getByText("공개용 메모 따로 쓰기", { exact: true }).click();
      await page.getByLabel("공개 제목", { exact: true }).fill(`UI 공개 메모 ${marker}`);
      await page.getByLabel("공개 요약", { exact: true }).fill("공개용으로 작성한 요약");
      await page.getByLabel("공개 본문", { exact: true }).fill("공개용으로 따로 쓴 본문");
      await page.getByRole("button", { name: "출처 추가", exact: true }).click({ timeout: 4000 });
      await page.getByLabel("출처 1 제목", { exact: true }).fill(`  출처 ${marker}  `);
      await page.getByLabel("출처 1 주소", { exact: true }).fill(" https://example.com/reference ");
      await page.getByRole("button", { name: "질문 추가", exact: true }).click();
      const question = `  실패하면\n어디서 재개할까? ${marker}  `;
      await page.getByLabel("질문 1", { exact: true }).fill(question);
      const preview = page.getByRole("region", { name: "공개 미리보기", exact: true });
      await preview.getByRole("link", { name: `출처 ${marker}`, exact: true }).waitFor();
      assert.equal(await preview.getByRole("link", { name: `출처 ${marker}`, exact: true }).getAttribute("href"), "https://example.com/reference");
      assert((await preview.innerText()).includes(`어디서 재개할까? ${marker}`));
      assert(!(await preview.innerText()).includes(title));
      await page.getByLabel("출처 1 주소", { exact: true }).fill("/admin/brain");
      await page.getByText("공개 HTTPS 주소나 /resume, /portfolio/항목 주소를 적어 주세요.", { exact: true }).waitFor();
      await page.getByRole("button", { name: "비공개로 저장", exact: true }).click();
      await page.locator(".capture-error[role=alert]").waitFor();
      assert.equal(await page.getByLabel("질문 1", { exact: true }).inputValue(), question);
      await page.getByLabel("출처 1 주소", { exact: true }).fill(" https://example.com/reference ");
      await page.getByRole("button", { name: "출처 추가", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.getByLabel("출처 2 제목", { exact: true }).fill(`출처 ${marker}`);
      await page.getByText("같은 출처 제목이 있습니다. 구분해서 적어 주세요.", { exact: true }).first().waitFor();
      await page.getByLabel("출처 2 제목", { exact: true }).fill("이력서");
      await page.getByLabel("출처 2 주소", { exact: true }).fill("/resume");
      await page.getByRole("button", { name: "질문 추가", exact: true }).click();
      await page.getByLabel("질문 2", { exact: true }).fill(question.trim());
      await page.getByText("같은 질문이 있습니다. 하나만 남겨 주세요.", { exact: true }).first().waitFor();
      await page.getByLabel("질문 2", { exact: true }).fill("다음에 확인할 조건은?");
      assert.equal(new URL(await preview.getByRole("link", { name: "이력서", exact: true }).getAttribute("href")).pathname, "/resume");
      assert.notEqual(new URL(await preview.getByRole("link", { name: "이력서", exact: true }).getAttribute("href")).origin, adminOrigin);
      if (width === 1440) {
        for (let i = 3; i <= 12; i++) {
          await page.getByRole("button", { name: "출처 추가", exact: true }).click();
          await page.getByLabel(`출처 ${i} 제목`, { exact: true }).fill(`출처 ${i}`);
          await page.getByRole("button", { name: "질문 추가", exact: true }).click();
          await page.getByLabel(`질문 ${i}`, { exact: true }).fill(`질문 ${i}`);
        }
        assert(await page.getByRole("button", { name: "출처 추가", exact: true }).isDisabled());
        assert(await page.getByRole("button", { name: "질문 추가", exact: true }).isDisabled());
        await page.getByLabel("출처 12 제목", { exact: true }).fill("가".repeat(161));
        assert.equal((await page.getByLabel("출처 12 제목", { exact: true }).inputValue()).length, 160);
        await page.getByLabel("질문 12", { exact: true }).fill("가".repeat(301));
        assert.equal((await page.getByLabel("질문 12", { exact: true }).inputValue()).length, 300);
        assert.equal(await page.getByLabel("출처 12 주소", { exact: true }).getAttribute("maxlength"), "2048");
        for (let i = 12; i >= 3; i--) {
          await page.getByRole("button", { name: `출처 ${i} 빼기`, exact: true }).click();
          await page.getByRole("button", { name: `질문 ${i} 빼기`, exact: true }).click();
        }
      }
      let lostResponse = false;
      const sent = [];
      await page.route("**/admin/brain/records", async route => {
        if (route.request().method() === "POST" && route.request().postDataJSON().action === "save") {
          sent.push(route.request().postDataJSON());
          if (!lostResponse) {
            lostResponse = true;
            assert.equal((await route.fetch()).status(), 200);
            return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "storage_unavailable" }) });
          }
        }
        return route.fallback();
      });
      await page.getByRole("button", { name: "비공개로 저장", exact: true }).click();
      await page.getByRole("button", { name: "같은 요청 다시 확인", exact: true }).waitFor();
      assert.equal(await page.getByLabel("질문 1", { exact: true }).inputValue(), question);
      assert(await page.getByLabel("질문 1", { exact: true }).isDisabled());
      await page.getByRole("button", { name: "같은 요청 다시 확인", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "비공개로 저장했습니다." }).waitFor();
      assert.equal(sent.length, 2); assert.deepEqual(sent[0], sent[1]);
      await page.unroute("**/admin/brain/records");
      const api = `${adminOrigin}/admin/brain/records`;
      const notes = (await (await page.request.get(api)).json()).notes;
      const id = notes.find(item => item.title === title).id;
      const owner = async () => (await (await page.request.get(`${api}?id=${id}`)).json()).note;
      const saved = await owner();
      assert.equal(saved.revision, 1); assert.equal(saved.actions.length, 1);
      assert.deepEqual(saved.draft.questions, [question, "다음에 확인할 조건은?"]);
      assert.deepEqual(saved.draft.sources.map(item => item.label), [`  출처 ${marker}  `, "이력서"]);
      await page.reload();
      await page.getByRole("button", { name: new RegExp(title) }).click();
      await page.getByText("공개용 메모 따로 쓰기", { exact: true }).click();
      assert.equal(await page.getByLabel("질문 1", { exact: true }).inputValue(), question);
      await page.getByRole("region", { name: "공개용 출처", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(output, `editor-${mode}-${width}.png`) });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.getByRole("checkbox", { name: "공개용 제목·요약·본문과 출처·질문을 확인했습니다." }).check();
      await page.getByRole("button", { name: "확인한 사본 공개", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "확인한 사본을 공개했습니다." }).waitFor();
      const visitor = await context.newPage();
      await visitor.goto(`${publicOrigin}/brain/${id}`);
      assert.deepEqual(await visitor.locator(".brain-note-questions li").allTextContents(), saved.draft.questions.map(item => item.trim()));
      assert.equal(await visitor.locator(".brain-note-sources a").first().getAttribute("href"), "https://example.com/reference");
      await visitor.goto(`${publicOrigin}/brain?view=list`);
      await visitor.locator(`.mem-catalog a[href='/brain/${id}']`).click();
      const reader = visitor.getByRole("dialog", { name: "기록 읽기" });
      await reader.waitFor();
      assert((await reader.innerText()).includes(`출처 ${marker}`));
      assert((await reader.innerText()).includes(`어디서 재개할까? ${marker}`));
      await visitor.screenshot({ path: join(output, `reader-${mode}-${width}.png`) });
      await visitor.goBack(); await reader.waitFor({ state: "hidden" });
      await page.getByLabel("질문 1", { exact: true }).fill(`미공개 질문 ${marker}`);
      assert(await page.getByRole("button", { name: "확인한 사본 공개", exact: true }).isDisabled());
      await page.getByRole("button", { name: "비공개로 저장", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "비공개로 저장했습니다." }).waitFor();
      await visitor.goto(`${publicOrigin}/brain/${id}`);
      assert(!(await visitor.locator("main").innerText()).includes(`미공개 질문 ${marker}`));
      for (const kind of ["출처", "질문"]) for (let i = 2; i >= 1; i--) await page.getByRole("button", { name: `${kind} ${i} 빼기`, exact: true }).click();
      await page.getByRole("button", { name: "비공개로 저장", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "비공개로 저장했습니다." }).waitFor();
      assert.deepEqual((await owner()).draft.sources, []); assert.deepEqual((await owner()).draft.questions, []);
      await page.getByRole("checkbox", { name: "공개용 제목·요약·본문과 출처·질문을 확인했습니다." }).check();
      await page.getByRole("button", { name: "확인한 사본 공개", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "확인한 사본을 공개했습니다." }).waitFor();
      await visitor.reload();
      assert.equal(await visitor.locator(".brain-note-questions").count(), 0);
      assert.equal(await visitor.locator(".brain-note-sources li").count(), 0);
      await page.getByRole("button", { name: "공개 해제", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "공개를 해제했습니다." }).waitFor();
      assert.equal((await visitor.reload()).status(), 404);
      assert.equal((await owner()).history.length, 3);
      const legacy = { ...saved.draft, title: `LEGACY_${marker}` }; delete legacy.sources; delete legacy.questions;
      const legacyResponse = await page.request.post(api, { headers: { origin: adminOrigin }, data: { action: "save", revision: 0, commandId: randomUUID(), commandRevision: 0, draft: legacy } });
      assert.equal(legacyResponse.status(), 200);
      const legacyId = (await legacyResponse.json()).id;
      await page.reload(); await page.getByRole("button", { name: new RegExp(legacy.title) }).click();
      await page.getByText("공개용 메모 따로 쓰기", { exact: true }).click();
      assert((await preview.innerText()).includes("작성자가 직접 정리한 공개 메모"));
      await page.getByLabel("공개 요약", { exact: true }).fill("이전 기록을 다시 정리한 요약");
      await page.getByRole("button", { name: "비공개로 저장", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "비공개로 저장했습니다." }).waitFor();
      const legacySaved = (await (await page.request.get(`${api}?id=${legacyId}`)).json()).note;
      assert(!Object.hasOwn(legacySaved.draft, "sources")); assert(!Object.hasOwn(legacySaved.draft, "questions"));
      assert.deepEqual(errors, []);
      samples.push({ width, mode, editor: "save/reopen/publish/edit/clear/withdraw/legacy", lostResponseReplay: true, errors });
    } finally { await context.close(); }
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 }, httpCredentials: { username: "owner", password: ownerKey }, ignoreHTTPSErrors: true });
    try {
      const page = await noJs.newPage();
      await page.goto(`${adminOrigin}/admin/brain`);
      await writeFile(join(output, `no-js-${mode}-${width}.html`), await page.content());
      await page.screenshot({ path: join(output, `no-js-${mode}-${width}.png`) });
      const guidance = page.locator(".brain-capture noscript p");
      await guidance.waitFor();
      assert((await guidance.textContent()).includes("기록 작성과 저장에는 JavaScript가 필요합니다."));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      samples.push({ width, mode, javaScriptEnabled: false, guidance: true });
    } finally { await noJs.close(); }
  }
  await writeFile(join(output, `editor-${mode}.json`), JSON.stringify(samples, null, 2) + "\n");
  return samples;
}
