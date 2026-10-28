import { open, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { runAutoPublishCycle } from "./blog-auto-publish-cycle.ts";

type Candidate = { postId: string; versionId: string | null; status: string };
type Evidence = { result: string; stage: string; verified: boolean; checked_at: number };

export async function runObservedPublishCycle({ generate, runRequiredWorkerOnce, verify, write, now = () => Date.now() / 1000 }: {
  generate(): Promise<Candidate>;
  runRequiredWorkerOnce: Parameters<typeof runAutoPublishCycle>[0]["runRequiredWorkerOnce"];
  verify(candidate: Candidate): Promise<boolean>;
  write(evidence: Evidence): Promise<void>;
  now?: () => number;
}) {
  let stage = "generation", candidate: Candidate | undefined;
  const record = async (result: string, verified = false) => {
    try { await write({ result, stage, verified, checked_at: now() }); } catch { /* Observation must not alter publication or trigger a provider retry. */ }
  };
  await record("running");
  let result;
  try {
    result = await runAutoPublishCycle({ generate: async () => {
      candidate = await generate();
      stage = "worker"; await record("running");
      return candidate;
    }, runRequiredWorkerOnce });
  } catch (error) { await record("failed"); throw error; }
  stage = "complete";
  if (candidate?.status === "budget_exceeded") await record("budget_blocked");
  else if (["generation_failed", "weak_sources", "policy_unavailable", "budget_unconfigured", "attention_required"].includes(candidate!.status)) { stage = "generation"; await record("failed"); }
  else if (candidate?.status !== "publishing" || result.status === "paused") await record("skipped");
  else {
    stage = "verification";
    let verified = false;
    try { verified = await verify(candidate); } catch { /* Missing proof stays unverified. */ }
    if (verified) stage = "complete";
    await record(verified ? "succeeded" : "unverified", verified);
  }
  return result;
}

export async function writeCycleEvidence(evidence: Evidence, environment: Record<string, string | undefined> = process.env): Promise<void> {
  const directory = environment.HLOG_OBSERVABILITY_EVIDENCE_DIR, invocation = environment.HLOG_OBSERVABILITY_INVOCATION_ID;
  if (!directory && !invocation) return;
  let temporary: string | undefined;
  try {
    if (!directory || !invocation || !/^[a-f0-9]{32}$/.test(invocation)) throw Error("invalid observation configuration");
    temporary = join(directory, `${invocation}.tmp`);
    const file = await open(temporary, "wx", 0o640);
    try { await file.writeFile(JSON.stringify({ schema_version: 1, invocation_id: invocation, ...evidence })); await file.sync(); }
    finally { await file.close(); }
    await rename(temporary, join(directory, "autopublish.json"));
    const parent = await open(directory, "r");
    try { await parent.sync(); } finally { await parent.close(); }
  } catch { console.error("monitoring evidence write failed"); }
  finally { if (temporary) await unlink(temporary).catch(() => undefined); }
}
