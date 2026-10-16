"use client";

import Image from "next/image";
import { useState } from "react";

import type { PublicBlogThumbnail } from "@/lib/blog-thumbnails";

export function BlogPostThumbnail({ thumbnail }: { thumbnail: PublicBlogThumbnail }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <Image
      alt={thumbnail.alt}
      className="aspect-[8/5] w-full shrink-0 self-start rounded-xl border border-slate-700/80 bg-slate-950/30 object-contain md:w-48 lg:w-56"
      height={400}
      onError={() => setFailed(true)}
      src={thumbnail.src}
      unoptimized
      width={640}
    />
  );
}
