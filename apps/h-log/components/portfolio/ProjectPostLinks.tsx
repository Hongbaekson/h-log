import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { getPublicProjectPostConnections } from "@/lib/portfolio-posts";

export function ProjectPostLinks({
  connections,
  direction,
}: {
  connections: ReturnType<typeof getPublicProjectPostConnections>;
  direction: "posts" | "projects";
}) {
  if (connections.length === 0) return null;
  const heading = direction === "posts" ? "연결된 글" : "연결된 프로젝트";

  return (
    <section aria-label={heading} className="min-w-0 border-t border-[var(--border)] pt-8">
      <h2 className="text-xl font-semibold text-white">{heading}</h2>
      <ul className="mt-4 divide-y divide-[var(--border)]">
        {connections.map((connection) => (
          <li key={`${connection.projectSlug}/${connection.postSlug}`}>
            <Link
              className="group flex min-w-0 items-start justify-between gap-4 rounded-md px-3 py-5 hover:bg-[#5865f2]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff]"
              href={direction === "posts" ? connection.postHref : connection.projectHref}
            >
              <span className="min-w-0 wrap-anywhere">
                <span className="block font-semibold leading-7 text-slate-100 group-hover:text-white">
                  {direction === "posts" ? connection.postTitle : connection.projectTitle}
                </span>
                <span className="mt-2 block text-sm leading-7 text-[var(--text-secondary)]">{connection.reason}</span>
              </span>
              <ArrowRight aria-hidden="true" className="mt-1 shrink-0 text-[#b6bdff]" size={18} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
