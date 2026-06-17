"use client";

import { FileDown } from "lucide-react";
import { useEffect, useState } from "react";

const downloadCooldownMs = 4_000;

export function PdfDownloadButton() {
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);
  const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const isCoolingDown = remainingSeconds > 0;

  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [isCoolingDown]);

  return (
    <a
      aria-disabled={isCoolingDown}
      className={`group inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-cyan-300/25 bg-slate-950/45 px-4 text-sm font-bold text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06),0_18px_46px_rgb(0_0_0_/_0.22)] transition-colors duration-200 hover:border-cyan-300/55 hover:bg-slate-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 sm:w-auto sm:px-5 ${
        isCoolingDown ? "pointer-events-none opacity-70" : ""
      }`}
      download="손홍백-자기소개서.pdf"
      href="/api/resume/pdf"
      onClick={(event) => {
        if (isCoolingDown) {
          event.preventDefault();
          return;
        }

        const nextCooldownUntil = Date.now() + downloadCooldownMs;
        setNow(Date.now());
        setCooldownUntil(nextCooldownUntil);
      }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 transition-colors duration-200 group-hover:border-cyan-300/45 group-hover:bg-cyan-300/15">
        <FileDown aria-hidden="true" size={19} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 text-base leading-none">
        {isCoolingDown ? `PDF 준비 중 ${remainingSeconds}s` : "PDF 다운로드"}
      </span>
    </a>
  );
}
