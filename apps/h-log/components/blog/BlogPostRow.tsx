import Link from "next/link";

import { Badge } from "@/components/ui";
import { BlogPostThumbnail } from "./BlogPostThumbnail";
import type { PublicBlogThumbnail } from "@/lib/blog-thumbnails";

type BlogPostRowProps = {
  title: string;
  href: string;
  description: string;
  publishedAt: string;
  publishedDateLabel: string;
  metadataLabel: string;
  tags: string[];
  thumbnail?: PublicBlogThumbnail;
};

export function BlogPostRow({
  title,
  href,
  description,
  publishedAt,
  publishedDateLabel,
  metadataLabel,
  tags,
  thumbnail,
}: BlogPostRowProps) {
  return (
    <article className="group flex min-w-0 flex-col gap-6 border-t border-slate-700/80 py-7 transition-colors hover:border-[#b6bdff]/50 md:flex-row md:py-8">
      <div className="min-w-0 flex-1">
        <h2 className="card-heading text-xl leading-snug text-white wrap-anywhere md:text-2xl">
          <Link
            className="transition-colors group-hover:text-[#b6bdff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b6bdff]"
            href={href}
          >
            {title}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-2 max-w-3xl text-base leading-7 text-slate-300 wrap-anywhere">
          {description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-5 text-slate-400">
          <time dateTime={publishedAt}>{publishedDateLabel}</time>
          <span className="text-[#b6bdff] wrap-anywhere">{metadataLabel}</span>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge className="max-w-full wrap-anywhere" key={tag} tone="slate">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {thumbnail && <BlogPostThumbnail key={thumbnail.src} thumbnail={thumbnail} />}
    </article>
  );
}
