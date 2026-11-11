"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy } from "lucide-react";

const subscribe = () => () => {};

export function BlogLinkCopy({ href, label }: { href: string; label: string }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");

  async function copyLink() {
    if (status === "copying") return;
    setStatus("copying");
    try {
      await navigator.clipboard.writeText(href);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  if (!hydrated) return null;

  return (
    <span className="inline font-normal">
      <button
        aria-disabled={status === "copying"}
        aria-label={label}
        className="ml-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md align-middle text-slate-400 hover:bg-[#5865f2]/15 hover:text-[#b6bdff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff] aria-disabled:cursor-wait"
        onClick={copyLink}
        title={label}
        type="button"
      >
        <Copy aria-hidden="true" size={16} />
      </button>
      <span aria-atomic="true" aria-live="polite" className="text-xs leading-6 text-slate-300" role="status">
        {status === "copying" && "복사 중입니다."}
        {status === "copied" && "주소를 복사했습니다."}
        {status === "error" && <>복사하지 못했습니다. <a className="rounded-sm text-[#b6bdff] underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={href}>주소 직접 복사</a> 링크를 길게 누르거나 우클릭해 복사해 주세요.</>}
      </span>
    </span>
  );
}
