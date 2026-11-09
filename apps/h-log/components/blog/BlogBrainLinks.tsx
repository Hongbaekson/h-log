import Link from "next/link";
import { loadPublicBrain } from "@/lib/brain-server";
import { getPublicPostBrainLinks } from "@/lib/brain-blog-sources";
import type { BlogContentStore } from "@/lib/blog-public";

export async function BlogBrainLinks({ slug, store }: { slug: string; store: BlogContentStore }) {
  let links: ReturnType<typeof getPublicPostBrainLinks> | null = null;
  try {
    links = getPublicPostBrainLinks(slug, store, await loadPublicBrain());
  } catch {
    console.error("blog_brain_connections_unavailable");
  }
  if (links?.length === 0) return null;
  return <section aria-label="연결된 생각" id="brain-connections" className="mt-10">
    <h2 className="text-lg font-semibold text-white">연결된 생각</h2>
    {links === null ? <>
      <p className="mt-3 text-sm leading-7 text-slate-400" role="status">연결된 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      <form action={`/blog/${slug}#brain-connections`} method="get" className="mt-3">
        <button type="submit" className="rounded-md px-3 py-3 text-sm text-[#b6bdff] hover:bg-[#5865f2]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff]">다시 불러오기</button>
      </form>
    </> : <ul className="mt-4 divide-y divide-slate-700/80 border-y border-slate-700/80">
      {links.map(link => <li key={link.href}><Link href={link.href} prefetch={false}
        className="block min-w-0 rounded-md px-3 py-5 font-semibold leading-7 text-slate-100 wrap-anywhere hover:bg-[#5865f2]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff]">{link.title}</Link></li>)}
    </ul>}
  </section>;
}
