import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-slate-700/80 bg-slate-900/45 shadow-[0_24px_80px_rgb(0_0_0_/_0.28)] ${className}`}
      {...props}
    />
  );
}
