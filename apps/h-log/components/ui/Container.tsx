import type { HTMLAttributes } from "react";

export function Container({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mx-auto w-[calc(100%_-_2rem)] max-w-[21rem] min-w-0 px-0 sm:w-full sm:max-w-6xl sm:px-5 ${className}`}
      {...props}
    />
  );
}
