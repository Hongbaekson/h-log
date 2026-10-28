"use client";

import { useEffect, useState } from "react";
import { snapshotFreshness } from "@/lib/admin-observation";

export function AdminObservation({ observedAt }: { observedAt: string }) {
  const [now, setNow] = useState(() => Date.parse(observedAt));
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 5000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  const stale = snapshotFreshness(observedAt, now) === "stale";
  return (
    <div className="ops-observation">
      <p role="status" className={stale ? "ops-warning" : ""}>{stale ? "오래된 조회 결과 · 다시 조회해 주세요" : "조회 시점의 기록"}</p>
      <time dateTime={observedAt}>{observedAt.replace("T", " ").slice(0, 19)} UTC</time>
      <span>자동 갱신되지 않습니다. 조회한 지 3분이 지나면 현재 상태와 다를 수 있습니다.</span>
    </div>
  );
}
