import type { Metadata } from "next";

// Next replaces nested metadata fields; each page must supply both social cards.
export function withPageSocialMetadata(
  metadata: Metadata & { title: string; description: string },
  url: string,
  type: "website" | "article" = "website",
): Metadata {
  return {
    ...metadata,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url,
      type,
      locale: "ko_KR",
      siteName: "손홍백",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "백엔드 개발자 손홍백 포트폴리오" }],
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: ["/opengraph-image"],
    },
  };
}
