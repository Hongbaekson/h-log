import { loadPublicBlogContentStore } from "@/lib/blog-public-source";
import { getPublicProjectPostConnections, projectPostConnections } from "@/lib/portfolio-posts";
import { ProjectPostLinks } from "./ProjectPostLinks";

export async function ProjectRelatedPosts({ projectSlug }: { projectSlug: string }) {
  if (!projectPostConnections.some((connection) => connection.projectSlug === projectSlug)) return null;

  let connections: ReturnType<typeof getPublicProjectPostConnections> | null = null;
  try {
    const store = await loadPublicBlogContentStore();
    connections = getPublicProjectPostConnections(store).filter((connection) => connection.projectSlug === projectSlug);
  } catch {
    console.error("portfolio_related_posts_unavailable");
  }

  if (connections === null) {
    return (
      <section aria-label="연결된 글" className="border-t border-[var(--border)] pt-8">
        <h2 className="text-xl font-semibold text-white">연결된 글</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]" role="status">연결된 글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        <form action={`/portfolio/${projectSlug}`} className="mt-4" method="get">
          <button className="rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5865f2]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6bdff]" type="submit">다시 불러오기</button>
        </form>
      </section>
    );
  }

  return <ProjectPostLinks connections={connections} direction="posts" />;
}
