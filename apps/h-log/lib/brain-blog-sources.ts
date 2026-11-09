import type { BrainGraph } from "./brain.ts";
import type { BlogContentStore } from "./blog-public.ts";
import { selectPublicBlogRouteEntries } from "./blog-content-model.ts";

export async function resolveBrainBlogSources(graph: BrainGraph, loadStore: () => Promise<BlogContentStore>, origin?: string): Promise<BrainGraph> {
  const paths = graph.nodes.map(node => node.sources.map(source => blogSourcePath(source.href, origin)));
  if (!paths.some(node => node.some(path => path !== undefined))) return graph;

  let titles: Map<string, string> | undefined;
  try {
    const store = await loadStore();
    titles = new Map(selectPublicBlogRouteEntries(store.posts, store.versions)
      .map(({ post, version }) => [`/blog/${post.slug}`, version.title]));
  } catch {
    // Never reuse a previous public result when the current lookup fails.
    titles = undefined;
  }
  return { ...graph, nodes: graph.nodes.map((node, i) => ({
    ...node,
    ...(titles === undefined && paths[i].some(path => path !== undefined) ? { sourcesUnavailable: true as const } : {}),
    sources: node.sources.map((source, j) => {
      const path = paths[i][j];
      if (path === undefined) return source;
      const title = titles?.get(path);
      // A saved label may itself be a withdrawn title or slug. Do not forward it.
      return title ? { label: title, href: path } : { label: "블로그 기록" };
    }),
  })) };
}

export function getPublicPostBrainLinks(slug: string, store: BlogContentStore, graph: BrainGraph): { href: string; title: string }[] {
  if (!selectPublicBlogRouteEntries(store.posts, store.versions).some(entry => entry.post.slug === slug)) return [];
  return graph.nodes.filter(node => node.sources.some(source => source.href === `/blog/${slug}`))
    .map(node => ({ href: `/brain/${node.id}`, title: node.title }));
}

// undefined: unrelated source; empty string: internal Blog URL without a valid detail path.
function blogSourcePath(href: string | undefined, origin?: string): string | undefined {
  if (!href) return undefined;
  const url = new URL(href, origin ?? "https://unconfigured.invalid");
  if (!href.startsWith("/") && url.origin !== origin) return undefined;
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname).replace(/\/{2,}/g, "/"); }
  catch { return ""; }
  if (!/^\/blog(?:\/|$)/.test(pathname)) return undefined;
  const match = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname);
  return match ? `/blog/${match[1]}` : "";
}
