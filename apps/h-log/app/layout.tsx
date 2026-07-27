import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { siteConfig } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <a
          className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950 motion-reduce:transition-none"
          href="#main-content"
        >
          본문으로 건너뛰기
        </a>
        <Header />
        <main
          className="min-w-0 overflow-x-hidden focus:outline-none"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
