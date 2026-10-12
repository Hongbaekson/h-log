"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

type CodeBlockProps = {
  code: string;
  language: string | null;
};

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");

  async function copyCode() {
    if (status === "copying") return;
    setStatus("copying");
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <figure className="mt-6 min-w-0 rounded-xl border border-slate-700 bg-slate-950/70">
      <figcaption className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-2">
        <span className="min-w-0 font-mono text-xs text-slate-400 wrap-anywhere">{language ?? "코드"}</span>
        <button
          aria-disabled={status === "copying"}
          aria-label="코드 복사"
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-slate-200 hover:bg-[#5865f2]/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff] aria-disabled:cursor-wait aria-disabled:opacity-60"
          onClick={copyCode}
          type="button"
        >
          <Copy aria-hidden="true" size={15} />
          복사
        </button>
      </figcaption>
      <div aria-atomic="true" aria-live="polite" className="px-4 text-xs leading-6 text-slate-300" role="status">
        {status === "copying" && "복사 중입니다."}
        {status === "copied" && "코드를 복사했습니다."}
        {status === "error" && "복사하지 못했습니다. 코드를 선택해 직접 복사해 주세요."}
      </div>
      <pre
        className="overflow-x-auto rounded-b-xl p-4 font-mono text-sm leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
        tabIndex={0}
      >
        <code className="rounded-none! bg-transparent! p-0!">{code}</code>
      </pre>
    </figure>
  );
}
