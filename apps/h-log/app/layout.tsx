import type { Metadata } from "next";
import { connection } from "next/server";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import { siteConfig } from "@/lib/site";

import "./globals.css";

async function getPublicSiteOrigin() {
  await connection();

  return resolvePublicSiteOrigin("http://localhost:3000");
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getPublicSiteOrigin();

  return {
    description: siteConfig.description,
    metadataBase: new URL(origin),
    openGraph: {
      description: siteConfig.description,
      images: [
        {
          alt: "백엔드 개발자 손홍백 포트폴리오",
          height: 630,
          url: "/opengraph-image",
          width: 1200,
        },
      ],
      locale: "ko_KR",
      siteName: siteConfig.name,
      title: siteConfig.title,
      type: "website",
      url: origin,
    },
    title: {
      default: siteConfig.title,
      template: "%s | 손홍백",
    },
    twitter: {
      card: "summary_large_image",
      description: siteConfig.description,
      images: ["/opengraph-image"],
      title: siteConfig.title,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const origin = await getPublicSiteOrigin();
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    alternateName: "Hongbaek Son",
    jobTitle: "Backend Developer",
    name: siteConfig.name,
    sameAs: ["https://github.com/Hongbaekson"],
    url: origin,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    description: siteConfig.description,
    inLanguage: "ko-KR",
    name: siteConfig.title,
    url: origin,
  };

  return (
    <html lang="ko">
      <body>
        <JsonLd data={personJsonLd} />
        <JsonLd data={websiteJsonLd} />
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
