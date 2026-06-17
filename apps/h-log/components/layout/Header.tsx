"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Braces, Menu, X } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { siteConfig } from "@/lib/site";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActiveNavItem = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
          {siteConfig.navItems.map((item) => {
            const isActive = isActiveNavItem(item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 ${
                  isActive
                    ? "bg-blue-400/10 text-blue-100 shadow-[inset_0_0_0_1px_rgb(96_165_250_/_0.22)]"
                    : "text-slate-300 hover:bg-slate-800/75 hover:text-white"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <button
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 text-slate-200 transition-colors hover:border-cyan-300/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 md:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? (
              <X aria-hidden="true" size={18} strokeWidth={2} />
            ) : (
              <Menu aria-hidden="true" size={18} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
      {isMenuOpen ? (
        <nav
          aria-label="Mobile navigation"
          className="mx-auto mt-2 grid w-[calc(100%_-_2rem)] max-w-[21rem] gap-1 rounded-2xl border border-slate-700/70 bg-[#080d18]/92 p-2 shadow-[0_18px_60px_rgb(0_0_0_/_0.25)] backdrop-blur-xl sm:w-full sm:max-w-6xl md:hidden"
          id="mobile-navigation"
        >
          {siteConfig.navItems.map((item) => {
            const isActive = isActiveNavItem(item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                  isActive
                    ? "bg-blue-400/10 text-blue-100 shadow-[inset_0_0_0_1px_rgb(96_165_250_/_0.22)]"
                    : "text-slate-300 hover:bg-slate-800/75 hover:text-white"
                }`}
                href={item.href}
                key={item.href}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
                {isActive ? (
                  <span className="h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_14px_rgb(34_211_238_/_0.55)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
