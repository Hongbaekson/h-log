import Link from "next/link";
import { Braces, Mail } from "lucide-react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { siteConfig } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-3 z-30 px-3">
      <div className="mx-auto flex h-14 w-[calc(100%_-_2rem)] max-w-[21rem] min-w-0 items-center justify-between gap-2 rounded-2xl border border-slate-700/70 bg-[#080d18]/86 px-3 shadow-[0_18px_60px_rgb(0_0_0_/_0.25)] backdrop-blur-xl sm:w-full sm:max-w-6xl md:px-4">
        <Link
          className="inline-flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-100 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          href="/"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <Braces aria-hidden="true" size={17} strokeWidth={2} />
          </span>
          <span className="truncate tracking-[0.16em]">h-log</span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          {siteConfig.navItems.map((item) => (
            <Link
              className="rounded-xl px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/75 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          aria-label="Contact"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-300/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 md:hidden"
          href="/contact"
        >
          <Mail aria-hidden="true" size={15} strokeWidth={2} />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
