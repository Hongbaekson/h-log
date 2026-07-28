export function GithubWebhookArchitectureDiagram() {
  return (
    <section
      aria-labelledby="workflow-diagram-heading"
      className="min-w-0 border-t border-slate-700/80 pt-10"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
        System Architecture
      </p>
      <h2
        className="card-heading mt-3 text-2xl tracking-tight text-white md:text-3xl"
        id="workflow-diagram-heading"
      >
        공개 범위의 시스템 흐름
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
        내부 구성은 일반화하고, 이벤트 검증부터 승인된 외부 동작까지의 핵심 경계만
        표시했습니다.
      </p>
      <p className="mt-4 text-xs text-slate-500" id="workflow-diagram-instructions">
        좁은 화면에서는 다이어그램 영역을 좌우로 스크롤할 수 있습니다.
      </p>

      <div
        aria-describedby="workflow-diagram-instructions"
        aria-label="GitHub Issues 운영 자동화 시스템 흐름"
        className="mt-4 w-full max-w-full overflow-x-auto rounded-lg border border-slate-700/80 bg-[#f8f5ee] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
        role="region"
        tabIndex={0}
      >
        <div className="mx-auto min-w-[42rem] max-w-[56rem]">
          <svg
            aria-labelledby="workflow-system-title workflow-system-desc"
            className="block h-auto w-full rounded-lg border-2 border-slate-950 bg-[#fbf7eb] shadow-[6px_6px_0_rgb(17_24_39/0.14)]"
            role="img"
            viewBox="0 0 900 300"
            xmlns="http://www.w3.org/2000/svg"
          >
          <title id="workflow-system-title">GitHub Issues 운영 자동화 시스템 흐름</title>
          <desc id="workflow-system-desc">
            서명된 이벤트를 검증하고 중복을 제거한 뒤 비동기 Queue에 저장하며, 알림과
            읽기 전용 요약은 Worker가 처리하고 변경 작업은 사용자 승인 뒤 실행합니다.
          </desc>
          <defs>
            <marker
              id="workflow-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path d="M0 0 L8 4 L0 8" fill="none" stroke="#111827" strokeWidth="1.5" />
            </marker>
          </defs>

          <path
            d="M52 54 C260 46 480 58 846 50"
            fill="none"
            opacity=".24"
            stroke="#111827"
            strokeLinecap="round"
            strokeWidth="2"
          />
          <text
            fill="#111827"
            fontFamily='"Segoe Print", "Comic Sans MS", "Pretendard", sans-serif'
            fontSize="19"
            fontWeight="800"
            x="58"
            y="86"
          >
            Verified event to approved action
          </text>

          {[
            {
              detail: "서명된 webhook",
              fill: "#f4ecff",
              label: "Event Input",
              x: 58,
            },
            {
              detail: "검증 · 중복 방지 · 비동기 저장",
              fill: "#eaf3ff",
              label: "Verify & Queue",
              x: 330,
            },
            {
              detail: "알림 · 읽기 전용 요약 · 승인된 변경",
              fill: "#e9fbf2",
              label: "Approved Delivery",
              x: 602,
            },
          ].map((stage) => (
            <g key={stage.label}>
              <rect
                fill={stage.fill}
                height="112"
                rx="14"
                stroke="#111827"
                strokeWidth="2.5"
                width="240"
                x={stage.x}
                y="120"
              />
              <text
                fill="#111827"
                fontFamily='"Segoe Print", "Comic Sans MS", "Pretendard", sans-serif'
                fontSize="18"
                fontWeight="800"
                textAnchor="middle"
                x={stage.x + 120}
                y="164"
              >
                {stage.label}
              </text>
              <text
                fill="#334155"
                fontFamily='"Pretendard", "Noto Sans KR", sans-serif'
                fontSize="13"
                fontWeight="700"
                textAnchor="middle"
                x={stage.x + 120}
                y="196"
              >
                {stage.detail}
              </text>
            </g>
          ))}

          <path
            d="M300 176 H322"
            fill="none"
            markerEnd="url(#workflow-arrow)"
            stroke="#111827"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <path
            d="M572 176 H594"
            fill="none"
            markerEnd="url(#workflow-arrow)"
            stroke="#111827"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <text
            fill="#991b1b"
            fontFamily='"Pretendard", "Noto Sans KR", sans-serif'
            fontSize="13"
            fontWeight="800"
            textAnchor="middle"
            x="450"
            y="264"
          >
            변경 작업은 권한 확인과 사용자 승인 후 실행
          </text>
          </svg>
        </div>
      </div>
    </section>
  );
}
