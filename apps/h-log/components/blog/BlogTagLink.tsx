import Link from "next/link";

import { Badge } from "@/components/ui";
import { buildBlogBrowseHref } from "@/lib/blog-search-ui";

export function BlogTagLink({ tag, query = "", tone = "slate" }: {
  tag: string;
  query?: string;
  tone?: "cyan" | "slate";
}) {
  return (
    <Link
      className="inline-flex min-w-0 max-w-full rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff]"
      href={buildBlogBrowseHref({ query, tag, page: 1 })}
    >
      <Badge className="max-w-full wrap-anywhere transition-colors hover:border-[#b6bdff]" tone={tone}>
        {tag}
      </Badge>
    </Link>
  );
}
