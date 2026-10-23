"use client";

import { Rss } from "lucide-react";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return (
    <footer className="site-footer">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm sm:px-5">
        <p className="footer-signature">h-log<span>개발과 고민의 기록.</span></p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            className="inline-flex min-h-10 items-center gap-2 rounded-sm text-sm text-[#b6bdff] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
            href="/feed.xml"
            type="application/rss+xml"
          >
            <Rss aria-hidden="true" size={15} />
            RSS 구독
          </a>
          <p>© {new Date().getFullYear()} 손홍백. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
