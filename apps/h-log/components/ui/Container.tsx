import type { HTMLAttributes } from "react";

export function Container({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mx-auto w-full max-w-6xl min-w-0 px-4 sm:px-5 ${className}`}
      {...props}
    />
  );
}
