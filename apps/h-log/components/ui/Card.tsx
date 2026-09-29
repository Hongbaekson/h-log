import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-white/10 bg-[#191d3a]/70 ${className}`}
      {...props}
    />
  );
}
