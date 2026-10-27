import "server-only";
import { open } from "node:fs/promises";
import { requireAdminOwner } from "./admin-server";
import { getAdminBlogPool } from "./blog-admin-review-server";
import { createDraftRequestRepository, prepareDraftInput, type DraftCommand } from "./blog-draft-requests.ts";
import { changeAutomationPolicy, loadAutomationState, type AutomationCommand } from "./blog-automation-policy.ts";

async function loadConfiguredInput() {
  const path = process.env.HLOG_AUTO_PUBLISH_INPUT_FILE;
  if (!path) throw Error("input_unavailable");
  const file = await open(path, "r");
  try {
    if (!(await file.stat()).isFile()) throw Error("input_unavailable");
    const buffer = Buffer.alloc(262145);
    let size = 0;
    while (size < buffer.length) {
      const read = await file.read(buffer, size, buffer.length - size, size);
      if (!read.bytesRead) break;
      size += read.bytesRead;
    }
    if (size > 262144) throw Error("input_unavailable");
    let parsed: unknown;
    try { parsed = JSON.parse(buffer.subarray(0, size).toString("utf8")); } catch { throw Error("input_unavailable"); }
    return prepareDraftInput(parsed);
  } finally { await file.close(); }
}
export async function loadDraftRequests() {
  await requireAdminOwner();
  const requests = await createDraftRequestRepository(getAdminBlogPool()).list();
  const automation = await loadAutomationState(getAdminBlogPool());
  const enabled = automation.policy.effective.generation;
  let input: { hash: string; title: string; sourceCount: number } | null = null;
  let inputError: string | null = null;
  try {
    const pack = await loadConfiguredInput();
    input = { hash: pack.hash, title: pack.input.topicSources[0].title.slice(0, 200), sourceCount: pack.input.researchPackSources.length };
  } catch (e) { inputError = e instanceof Error && e.message === "input_stale" ? "자료를 가져온 지 하루가 지났어요. 자료를 갱신한 뒤 다시 열어 주세요." : "초안에 사용할 자료가 준비되지 않았거나 검사를 통과하지 못했어요."; }
  return { requests, enabled, input, inputError, automation };
}
export async function submitAutomationPolicy(command: AutomationCommand) {
  await requireAdminOwner();
  return changeAutomationPolicy(getAdminBlogPool(), command);
}
export async function submitDraftRequest(command: DraftCommand) {
  await requireAdminOwner();
  return createDraftRequestRepository(getAdminBlogPool()).submit(command, loadConfiguredInput, process.env.HLOG_BLOG_DRAFT_GENERATION_ENABLED === "1");
}
