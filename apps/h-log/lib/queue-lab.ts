export type QueueLabOptions = {
  workers: 1 | 2 | 3;
  failure: "none" | "once" | "until-recovery";
};

type LabJob = { id: string; attempts: number };
export type QueueFrame = {
  queued: LabJob[];
  processing: LabJob[];
  completed: LabJob[];
  dlq: LabJob[];
  events: string[];
};

export function buildQueueReplay(options: QueueLabOptions, recover = false): QueueFrame[] {
  const frames: QueueFrame[] = [{
    queued: Array.from({ length: 6 }, (_, i) => ({ id: `J0${i + 1}`, attempts: 0 })),
    processing: [], completed: [], dlq: [],
    events: ["가상 작업 6개를 Queue에 넣었습니다."],
  }];
  let current = frames[0];
  function drain(recovered: boolean) {
    while (current.queued.length || current.processing.length) {
      const next: QueueFrame = {
        queued: [...current.queued], processing: [],
        completed: [...current.completed], dlq: [...current.dlq], events: [],
      };
      if (current.processing.length) {
        for (const job of current.processing) {
          const fails = !recovered && (job.id === "J02" || job.id === "J05") &&
            (options.failure === "until-recovery" || (options.failure === "once" && job.attempts === 1));
          if (!fails) {
            next.completed.push(job);
            next.events.push(`${job.id} 처리 완료 · 누적 ${job.attempts}회 시도`);
          } else if (job.attempts < 2) {
            next.queued.push(job);
            next.events.push(`${job.id} 처리 실패 · Queue 뒤에서 한 번 더 시도합니다.`);
          } else {
            next.dlq.push(job);
            next.events.push(`${job.id} 2회 실패 · DLQ에 보관합니다.`);
          }
        }
      } else {
        next.processing = next.queued.splice(0, options.workers).map((job) => ({ ...job, attempts: job.attempts + 1 }));
        next.events = next.processing.map((job) => `${job.id} 처리 시작 · 누적 ${job.attempts}회 시도`);
      }
      frames.push(next);
      current = next;
    }
  }
  drain(false);
  if (recover && current.dlq.length) {
    current = {
      ...current, queued: current.dlq, dlq: [],
      events: ["실패 원인을 해결했다고 가정하고 DLQ의 작업을 Queue로 옮겼습니다."],
    };
    frames.push(current);
    drain(true);
  }
  return frames;
}
