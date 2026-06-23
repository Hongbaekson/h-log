export function GithubWebhookArchitectureDiagram() {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/72 p-4 shadow-[0_24px_70px_rgb(8_47_73/0.20)] md:p-6">
      <div className="mb-5">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          System Architecture
        </p>
        <h2 className="card-heading mt-3 text-2xl tracking-tight text-white md:text-3xl">
          시스템 아키텍처
        </h2>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#f8f5ee] p-3">
        <svg
          aria-labelledby="workflow-system-architecture-title workflow-system-architecture-desc"
          className="mx-auto block h-auto min-w-[58rem] max-w-[1120px] rounded-lg border-2 border-slate-950 bg-[#fbf7eb] shadow-[6px_6px_0_rgb(17_24_39/0.14)]"
          role="img"
          viewBox="0 0 1120 620"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title id="workflow-system-architecture-title">시스템 아키텍처</title>
          <desc id="workflow-system-architecture-desc">
            GitHub Issues webhook이 회사 Edge와 Backend Receiver를 거쳐 Bot Backend 내부의 DB,
            Queue, Discord Adapter, GitHub App API, LLM Worker로 비동기 처리되는 아키텍처.
          </desc>
          <defs>
            <filter id="workflow-rough-shadow" x="-18%" y="-18%" width="136%" height="136%">
              <feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="1" seed="8" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.7" xChannelSelector="R" yChannelSelector="G" result="rough" />
              <feDropShadow in="rough" dx="4" dy="5" stdDeviation="0.5" floodColor="#111827" floodOpacity="0.16" />
            </filter>
            <filter id="workflow-rough-line" x="-12%" y="-12%" width="124%" height="124%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="21" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.75" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <pattern id="workflow-stripe-purple" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
              <rect width="15" height="15" fill="#f4ecff" />
              <path d="M0 0 L0 15" stroke="#c4b5fd" strokeWidth="4" opacity=".38" />
            </pattern>
            <pattern id="workflow-stripe-yellow" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
              <rect width="15" height="15" fill="#fff5cf" />
              <path d="M0 0 L0 15" stroke="#facc15" strokeWidth="4" opacity=".35" />
            </pattern>
            <pattern id="workflow-stripe-blue" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
              <rect width="15" height="15" fill="#eaf3ff" />
              <path d="M0 0 L0 15" stroke="#93c5fd" strokeWidth="4" opacity=".38" />
            </pattern>
            <pattern id="workflow-stripe-green" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
              <rect width="15" height="15" fill="#e9fbf2" />
              <path d="M0 0 L0 15" stroke="#6ee7b7" strokeWidth="4" opacity=".36" />
            </pattern>
            <pattern id="workflow-stripe-pink" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
              <rect width="15" height="15" fill="#fff0f6" />
              <path d="M0 0 L0 15" stroke="#f9a8d4" strokeWidth="4" opacity=".36" />
            </pattern>
            <pattern id="workflow-stripe-indigo" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
              <rect width="15" height="15" fill="#eef2ff" />
              <path d="M0 0 L0 15" stroke="#a5b4fc" strokeWidth="4" opacity=".38" />
            </pattern>
            <pattern id="workflow-stripe-red" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
              <rect width="15" height="15" fill="#fff1f2" />
              <path d="M0 0 L0 15" stroke="#fca5a5" strokeWidth="4" opacity=".34" />
            </pattern>
            <style>{`
              .workflow-paper { fill: #f8f4e9; }
              .workflow-panel { fill: rgba(255, 255, 255, .25); stroke: #111827; stroke-width: 2.4; filter: url(#workflow-rough-line); }
              .workflow-box { stroke: #111827; stroke-width: 2.5; filter: url(#workflow-rough-shadow); }
              .workflow-boundary { fill: rgba(255,255,255,.22); stroke: #111827; stroke-width: 2.8; stroke-dasharray: 9 8; filter: url(#workflow-rough-line); }
              .workflow-arrow-line { fill: none; stroke: #111827; stroke-width: 2.8; stroke-linecap: round; stroke-linejoin: round; filter: url(#workflow-rough-line); }
              .workflow-arrow-head { fill: none; stroke: #111827; stroke-width: 2.8; stroke-linecap: round; stroke-linejoin: round; filter: url(#workflow-rough-line); }
              .workflow-job-line { fill: none; stroke: #111827; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 7 7; opacity: .76; filter: url(#workflow-rough-line); }
              .workflow-approval-line { fill: none; stroke: #dc2626; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; filter: url(#workflow-rough-line); }
              .workflow-approval-head { fill: none; stroke: #dc2626; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; filter: url(#workflow-rough-line); }
              .workflow-scribble { fill: none; stroke: #111827; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; opacity: .34; filter: url(#workflow-rough-line); }
              .workflow-title-text { font-family: "Segoe Print", "Comic Sans MS", "Pretendard", "Noto Sans KR", sans-serif; fill: #111827; font-size: 21px; font-weight: 800; }
              .workflow-sub { font-family: "Segoe Print", "Comic Sans MS", "Pretendard", "Noto Sans KR", sans-serif; fill: #111827; font-size: 13px; font-weight: 650; }
              .workflow-label { font-family: "Segoe Print", "Comic Sans MS", "Pretendard", "Noto Sans KR", sans-serif; fill: #111827; font-size: 17px; font-weight: 800; text-anchor: middle; }
              .workflow-label-lg { font-family: "Segoe Print", "Comic Sans MS", "Pretendard", "Noto Sans KR", sans-serif; fill: #111827; font-size: 19px; font-weight: 800; text-anchor: middle; }
              .workflow-desc { font-family: "Segoe Print", "Comic Sans MS", "Pretendard", "Noto Sans KR", sans-serif; fill: #334155; font-size: 12.5px; font-weight: 700; text-anchor: middle; }
              .workflow-tiny { font-family: "Segoe Print", "Comic Sans MS", "Pretendard", "Noto Sans KR", sans-serif; fill: #334155; font-size: 11px; font-weight: 700; text-anchor: middle; }
              .workflow-warn { font-family: "Segoe Print", "Comic Sans MS", "Pretendard", "Noto Sans KR", sans-serif; fill: #991b1b; font-size: 12px; font-weight: 800; }
              .workflow-warn-title { font-family: "Segoe Print", "Comic Sans MS", "Pretendard", "Noto Sans KR", sans-serif; fill: #111827; font-size: 18px; font-weight: 800; }
            `}</style>
          </defs>

          <rect className="workflow-paper" x="0" y="0" width="1120" height="620" rx="18" />
          <rect className="workflow-panel" x="32" y="34" width="1056" height="552" rx="16" />
          <path className="workflow-scribble" d="M52 56 C240 49 391 55 570 51 C743 48 884 58 1066 53" />
          <path className="workflow-scribble" d="M50 558 C278 571 501 558 730 564 C854 567 956 560 1048 567" />

          <text className="workflow-title-text" x="68" y="86">Discord x GitHub Issues Webhook Architecture</text>
          <text className="workflow-sub" x="68" y="108">D-01 = 검증, 저장, 중복 방지, 큐, 감사. LLM은 격리 Worker에서 나중에 실행.</text>

          <rect className="workflow-box" x="68" y="174" width="126" height="76" rx="14" fill="url(#workflow-stripe-purple)" />
          <path className="workflow-scribble" d="M78 181 C112 177 153 178 185 181" />
          <text className="workflow-label" x="131" y="204">GitHub</text>
          <text className="workflow-desc" x="131" y="226">이슈 웹훅</text>
          <text className="workflow-tiny" x="131" y="242">이슈 / 댓글 / 라벨 변경</text>

          <g aria-label="GitHub에서 Company Edge로 이동">
            <path className="workflow-arrow-line" d="M200 212 C226 207 242 209 263 214" />
            <path className="workflow-arrow-head" d="M253 202 L267 215 L249 222" />
          </g>

          <rect className="workflow-box" x="288" y="160" width="150" height="112" rx="14" fill="url(#workflow-stripe-yellow)" />
          <path className="workflow-scribble" d="M300 168 C336 161 396 164 428 168" />
          <text className="workflow-label-lg" x="363" y="196">Company</text>
          <text className="workflow-label-lg" x="363" y="220">Edge</text>
          <text className="workflow-desc" x="363" y="243">WAF / Ingress</text>
          <text className="workflow-tiny" x="363" y="258">TLS · 원문 body 보존</text>

          <g aria-label="Company Edge에서 Backend Receiver로 이동">
            <path className="workflow-arrow-line" d="M446 209 C465 205 477 204 496 210" />
            <path className="workflow-arrow-head" d="M486 198 L501 211 L483 218" />
          </g>

          <rect className="workflow-box" x="512" y="142" width="182" height="138" rx="14" fill="url(#workflow-stripe-blue)" />
          <path className="workflow-scribble" d="M524 151 C575 144 635 146 683 151" />
          <text className="workflow-label-lg" x="603" y="176">Backend</text>
          <text className="workflow-label-lg" x="603" y="201">Receiver</text>
          <text className="workflow-desc" x="603" y="228">서명 검증 · 허용 목록</text>
          <text className="workflow-desc" x="603" y="248">빠른 2xx · queue 적재</text>

          <rect x="514" y="294" width="184" height="42" rx="11" fill="url(#workflow-stripe-red)" stroke="#dc2626" strokeWidth="2" />
          <text className="workflow-warn" x="606" y="320" textAnchor="middle">invalid signature는 즉시 실패</text>

          <rect className="workflow-boundary" x="760" y="126" width="306" height="358" rx="22" />
          <text className="workflow-label-lg" x="913" y="154">Bot Backend Boundary</text>
          <text className="workflow-tiny" x="913" y="173">정책 · 인증 · 감사 · 권한 실행 경계</text>

          <rect className="workflow-box" x="798" y="204" width="108" height="76" rx="12" fill="url(#workflow-stripe-green)" />
          <path className="workflow-scribble" d="M807 212 C837 207 870 209 895 212" />
          <text className="workflow-label" x="852" y="236">DB</text>
          <text className="workflow-desc" x="852" y="256">이벤트 저장</text>
          <text className="workflow-tiny" x="852" y="272">전달 ID</text>

          <rect className="workflow-box" x="928" y="204" width="108" height="76" rx="12" fill="url(#workflow-stripe-green)" />
          <path className="workflow-scribble" d="M937 212 C967 207 1000 209 1025 212" />
          <text className="workflow-label" x="982" y="236">Queue</text>
          <text className="workflow-desc" x="982" y="256">알림 / LLM 작업</text>
          <text className="workflow-tiny" x="982" y="272">재시도 / archive</text>

          <g aria-label="DB에서 Queue로 이동">
            <path className="workflow-arrow-line" d="M907 242 C915 241 918 241 927 242" />
            <path className="workflow-arrow-head" d="M918 233 L929 242 L918 251" />
          </g>

          <rect className="workflow-box" x="798" y="326" width="108" height="76" rx="12" fill="url(#workflow-stripe-indigo)" />
          <path className="workflow-scribble" d="M807 334 C837 329 870 331 895 334" />
          <text className="workflow-label" x="852" y="358">Discord</text>
          <text className="workflow-desc" x="852" y="378">Adapter</text>
          <text className="workflow-tiny" x="852" y="394">429 대응</text>

          <rect className="workflow-box" x="928" y="326" width="108" height="76" rx="12" fill="url(#workflow-stripe-green)" />
          <path className="workflow-scribble" d="M937 334 C967 329 1000 331 1025 334" />
          <text className="workflow-label" x="982" y="358">GitHub</text>
          <text className="workflow-desc" x="982" y="378">App API</text>
          <text className="workflow-tiny" x="982" y="394">Backend만 실행</text>

          <g aria-label="Queue에서 Discord Adapter로 알림 작업 전달">
            <path className="workflow-arrow-line" d="M956 282 C942 305 918 319 890 326" />
            <path className="workflow-arrow-head" d="M896 313 L886 328 L904 325" />
          </g>

          <rect className="workflow-box" x="568" y="430" width="186" height="86" rx="14" fill="url(#workflow-stripe-pink)" />
          <path className="workflow-scribble" d="M579 438 C625 432 701 434 743 438" />
          <text className="workflow-label-lg" x="661" y="465">LLM Worker</text>
          <text className="workflow-desc" x="661" y="488">Queue job만 처리</text>
          <text className="workflow-tiny" x="661" y="505">격리 작업공간 · JSON 스키마</text>

          <g aria-label="Queue에서 LLM Worker로 격리 작업 전달">
            <path className="workflow-job-line" d="M936 282 C900 300 840 304 778 316 C748 328 738 382 733 428" />
            <text className="workflow-tiny" x="795" y="307">LLM job 예약</text>
          </g>

          <g aria-label="Receiver에서 DB로 저장">
            <path className="workflow-arrow-line" d="M696 214 C727 218 759 230 793 244" />
            <path className="workflow-arrow-head" d="M778 234 L798 246 L777 253" />
          </g>

          <rect className="workflow-box" x="914" y="510" width="144" height="58" rx="12" fill="url(#workflow-stripe-indigo)" />
          <path className="workflow-scribble" d="M924 517 C966 513 1013 514 1047 517" />
          <text className="workflow-label" x="986" y="539">Discord</text>
          <text className="workflow-desc" x="986" y="560">채널 / 버튼 승인</text>

          <g aria-label="Discord Adapter에서 Discord Channel로 전송">
            <path className="workflow-arrow-line" d="M904 397 C930 444 946 482 965 509" />
            <path className="workflow-arrow-head" d="M948 505 L968 512 L960 494" />
          </g>
          <g aria-label="Discord Channel에서 승인과 명령을 Discord Adapter로 전달">
            <path className="workflow-approval-line" d="M914 528 C875 504 850 458 850 405" />
            <path className="workflow-approval-head" d="M841 419 L850 402 L858 419" />
          </g>
          <g aria-label="Discord Adapter가 승인 확인 후 GitHub App API 실행">
            <path className="workflow-approval-line" d="M907 365 C915 365 920 365 927 365" />
            <path className="workflow-approval-head" d="M918 356 L930 365 L918 374" />
          </g>
          <text className="workflow-warn" x="772" y="421">변경 작업은 Discord 승인 후</text>
          <text className="workflow-warn" x="804" y="440">Backend가 GitHub App API 실행</text>

          <rect x="86" y="370" width="322" height="122" rx="13" fill="url(#workflow-stripe-red)" stroke="#dc2626" strokeWidth="2.2" filter="url(#workflow-rough-shadow)" />
          <text className="workflow-warn-title" x="110" y="402">Critical security notes</text>
          <text className="workflow-warn" x="112" y="428">1. 원문 본문 기준으로 서명 검증</text>
          <text className="workflow-warn" x="112" y="452">2. 전달 ID 저장으로 중복 방지</text>
          <text className="workflow-warn" x="112" y="476">3. LLM/agent는 backend 경계 내부에서 격리</text>
        </svg>
      </div>

      <p className="mt-4 text-center text-xs leading-6 text-slate-500 md:text-sm">
        Receiver는 서명 검증 후 저장과 queue 적재까지만 수행하고, Discord 전송과 LLM 처리는 Worker가 비동기로 처리합니다.
      </p>
    </section>
  );
}
