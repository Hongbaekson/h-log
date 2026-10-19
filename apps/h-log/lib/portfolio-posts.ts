import type { BlogContentStore } from "./blog-public.ts";
import { selectPublicBlogRouteEntries } from "./blog-content-model.ts";
import { getProjectBySlug } from "./projects.ts";

export const projectPostConnections = [
  {
    projectSlug: "h-log-public-reading",
    postSlug: "home-recent-posts",
    reason: "H-Log 홈에서 최근 글 조회와 소개 화면을 분리한 구현 기록입니다.",
  },
  {
    projectSlug: "redisson-async-processing-recovery",
    postSlug: "redis-pubsub-delivery",
    reason: "메시지 유실과 처리 확인 기준을 다시 살펴보는 문서 분석입니다. 이 프로젝트의 Pub/Sub 도입이나 교체 기록은 아닙니다.",
  },
];

export function getPublicProjectPostConnections(store: BlogContentStore): {
  projectSlug: string;
  projectHref: string;
  projectTitle: string;
  postSlug: string;
  postHref: string;
  postTitle: string;
  reason: string;
}[] {
  const entries = selectPublicBlogRouteEntries(store.posts, store.versions);

  return projectPostConnections.flatMap((relation) => {
    const project = getProjectBySlug(relation.projectSlug);
    const entry = entries.find(({ post }) => post.slug === relation.postSlug);
    if (!project || !entry) return [];

    return [
      {
        ...relation,
        projectHref: `/portfolio/${project.slug}`,
        projectTitle: project.context,
        postHref: `/blog/${entry.post.slug}`,
        postTitle: entry.version.title,
      },
    ];
  });
}
