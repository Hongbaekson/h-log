import type { HTMLAttributes } from "react";

type BadgeTone = "blue" | "cyan" | "mint" | "violet" | "slate";

const toneClasses: Record<BadgeTone, string> = {
  blue: "border-blue-300/20 bg-blue-400/10 text-blue-100",
  cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  mint: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  slate: "border-slate-500/30 bg-slate-800/70 text-slate-200",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className = "", tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
