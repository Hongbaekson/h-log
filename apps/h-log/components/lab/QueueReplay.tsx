"use client";

import { useEffect, useState } from "react";
import { buildQueueReplay, type QueueLabOptions } from "@/lib/queue-lab";

const stages = [
  { key: "queued", title: "Queue", description: "차례를 기다리는 작업", color: "text-[#b6bdff]" },
  { key: "processing", title: "처리 중", description: "Worker가 가져간 작업", color: "text-sky-300" },
  { key: "completed", title: "완료", description: "처리를 마친 작업", color: "text-slate-100" },
  { key: "dlq", title: "DLQ", description: "두 번 실패한 작업 보관", color: "text-amber-300" },
] as const;
const buttonClass = "min-h-11 cursor-pointer rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-[#5865f2]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff] disabled:cursor-default disabled:opacity-40";
const selectClass = "mt-2 block min-h-11 w-full rounded-lg border border-slate-600 bg-[#191d3a] px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]";

export function QueueReplay() {
  const [options, setOptions] = useState<QueueLabOptions>({ workers: 2, failure: "until-recovery" });
  const [recovered, setRecovered] = useState(false);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = buildQueueReplay(options, recovered);
  const frame = frames[position];
  const atEnd = position === frames.length - 1;
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => setPosition((current) => current + 1), 1000);
    return () => window.clearTimeout(timer);
  }, [isPlaying, position]);

  function reset(nextOptions = options) {
    setPlaying(false);
    setRecovered(false);
    setPosition(0);
    setOptions(nextOptions);
  }

  return (
    <section aria-label="Queue 재생기" className="min-w-0">
      <div className="grid gap-5 border-y border-slate-700 py-6 sm:grid-cols-2">
        <div className="min-w-0 text-sm font-semibold text-slate-200">
          <label htmlFor="queue-workers">Worker 수</label>
          <select id="queue-workers" className={selectClass} value={options.workers} onChange={(event) => {
            const workers = Number(event.target.value);
            if (workers === 1 || workers === 2 || workers === 3) reset({ ...options, workers });
          }}>
            <option value={1}>1개</option><option value={2}>2개</option><option value={3}>3개</option>
          </select>
        </div>
        <div className="min-w-0 text-sm font-semibold text-slate-200">
          <label htmlFor="queue-failure">실패 조건</label>
          <select id="queue-failure" className={selectClass} value={options.failure} onChange={(event) => {
            const failure = event.target.value;
            if (failure === "none" || failure === "once" || failure === "until-recovery") reset({ ...options, failure });
          }}>
            <option value="until-recovery">J02·J05 계속 실패</option>
            <option value="once">J02·J05 첫 시도만 실패</option>
            <option value="none">실패 없음</option>
          </select>
        </div>
        <p className="text-sm leading-6 text-slate-400 sm:col-span-2">설정을 바꾸면 처음부터 시작합니다. 작업은 최대 2회 시도하고, 실패하면 Queue 뒤로 돌려보냅니다.</p>
      </div>

      <div className="my-6 flex flex-wrap gap-3" aria-label="재생 조작">
        <button className={`${buttonClass} border-[#5865f2] bg-[#5865f2]/25`} disabled={atEnd} onClick={() => setPlaying(!isPlaying)} type="button">{isPlaying ? "일시정지" : "재생"}</button>
        <button className={buttonClass} disabled={atEnd || isPlaying} onClick={() => setPosition(position + 1)} type="button">한 단계 진행</button>
        <button className={buttonClass} onClick={() => reset()} type="button">초기화</button>
        <button className={buttonClass} disabled={!atEnd || !frame.dlq.length} onClick={() => {
          setPlaying(false);
          setRecovered(true);
          setPosition(position + 1);
        }} type="button">원인 해결 후 DLQ 재처리</button>
      </div>
      <p className="text-sm leading-7 text-slate-300">재처리는 실패 원인이 해결됐다고 가정하고, DLQ에 남은 작업만 Queue로 옮깁니다.</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="font-mono text-[#b6bdff]" data-testid="replay-step">단계 {position}</p>
        <p className="text-slate-300">전체 6개 · 완료 {frame.completed.length}개 · DLQ {frame.dlq.length}개</p>
      </div>
      <div className="mt-4 grid min-w-0 gap-6 border-y border-slate-700 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map(({ key, title, description, color }) => (
          <section aria-label={title} className="min-w-0" key={key}>
            <h2 className={`flex items-center justify-between gap-2 text-lg font-semibold ${color}`}>{title}<span className="font-mono text-sm">{frame[key].length}</span></h2>
            <p className="mt-1 text-xs leading-6 text-slate-400">{description}</p>
            {frame[key].length ? (
              <ol className="mt-4 space-y-2">
                {frame[key].map((job) => <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#191d3a] px-3 py-3 text-sm" key={job.id}>
                  <span className={`font-mono font-semibold ${color}`}>{job.id}</span>
                  <span className="text-xs text-slate-300">누적 시도 {job.attempts}회</span>
                </li>)}
              </ol>
            ) : <p className="mt-4 py-3 text-sm text-slate-500">작업 없음</p>}
          </section>
        ))}
      </div>
      <div className="mt-6 min-h-32" role="status" aria-live="polite" aria-atomic="true">
        <p className="text-sm font-semibold text-white">{isPlaying ? "재생 중" : atEnd ? (frame.dlq.length ? "재처리 대기" : "모든 작업 완료") : "재생 대기"}</p>
        <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-300">
          {frame.events.map((event) => <li key={event}>{event}</li>)}
        </ul>
      </div>
      <details className="mt-2 border-t border-slate-700 pt-4">
        <summary className="cursor-pointer rounded-md py-3 text-sm font-semibold text-[#b6bdff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">지금까지의 처리 기록</summary>
        <ol className="mt-3 space-y-4 text-sm leading-7 text-slate-300">
          {frames.slice(0, position + 1).map((item, index) => <li key={index}>
            <p className="font-mono text-xs text-slate-400">단계 {index}</p>
            {item.events.map((event) => <p key={event}>{event}</p>)}
          </li>)}
        </ol>
      </details>
    </section>
  );
}
