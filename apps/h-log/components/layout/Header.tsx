"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Braces, Code2, Menu, X } from "lucide-react";
import { useRef, useState } from "react";

import { siteConfig } from "@/lib/site";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const isActiveNavItem = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className="site-header sticky top-0 z-30"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isMenuOpen) {
          setIsMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      }}
    >
      <div className="site-header-inner mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          className="site-brand inline-flex min-w-0 items-center gap-3 rounded-xl py-2 font-semibold text-white"
          href="/"
        >
          <span className="site-brand-mark grid h-10 w-10 place-items-center rounded-[14px]">
            <Braces aria-hidden="true" size={22} strokeWidth={1.8} />
          </span>
          <span className="truncate tracking-tight">h-log<span className="brand-period">.</span></span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          {siteConfig.navItems.map((item) => {
            const isActive = isActiveNavItem(item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`site-nav-link ${isActive ? "is-active" : ""}`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <a className="header-github" href="https://github.com/Hongbaekson" rel="noreferrer" target="_blank" aria-label="GitHub 프로필 (새 창)">
            <Code2 aria-hidden="true" size={17} strokeWidth={1.7} />
            <span className="hidden sm:inline">GitHub</span>
            <ArrowUpRight aria-hidden="true" className="hidden sm:block" size={14} />
          </a>
          <button
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="site-menu-toggle inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-200 transition-colors hover:text-white md:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            ref={menuButtonRef}
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
          className="site-mobile-nav mx-auto grid w-full max-w-6xl gap-1 p-3 md:hidden"
          id="mobile-navigation"
        >
          {siteConfig.navItems.map((item) => {
            const isActive = isActiveNavItem(item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`site-nav-link flex items-center justify-between ${isActive ? "is-active" : ""}`}
                href={item.href}
                key={item.href}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
                {isActive ? (
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
