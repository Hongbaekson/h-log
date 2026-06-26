import {
  createPostVersionContentFromMarkdown,
  type PostRecord,
  type PostSourceRecord,
  type PostTagRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";
import type { BlogContentStore } from "./blog-public.ts";

const now = "2026-06-26T00:00:00.000Z";

const posts: PostRecord[] = [
  {
    articleMode: "document_analysis",
    createdAt: "2026-06-25T09:00:00.000Z",
    currentVersionId: "version-db-first-public-boundary",
    description:
      "DB 기반 블로그 전환에서 public route가 published 최신 version만 읽도록 고정한 구현 기록입니다.",
    id: "post-db-first-public-boundary",
    publishedAt: "2026-06-26T09:00:00.000Z",
    retractedAt: null,
    slug: "db-first-public-boundary",
    status: "published",
    title: "DB 기반 블로그의 공개 경계를 먼저 고정하기",
    unpublishedAt: null,
    updatedAt: now,
  },
  {
    articleMode: "applied_analysis",
    createdAt: "2026-06-25T08:00:00.000Z",
    currentVersionId: "version-oci-compose-deployment-checklist",
    description:
      "OCI Compute와 Docker Compose 운영을 전제로 블로그 자동화가 커지기 전에 확인할 배포 경계를 정리했습니다.",
    id: "post-oci-compose-deployment-checklist",
    publishedAt: "2026-06-25T12:00:00.000Z",
    retractedAt: null,
    slug: "oci-compose-deployment-checklist",
    status: "published",
    title: "OCI Docker Compose 배포 전에 고정할 운영 경계",
    unpublishedAt: null,
    updatedAt: "2026-06-25T12:00:00.000Z",
  },
  {
    articleMode: "document_analysis",
    createdAt: now,
    currentVersionId: "version-admin-preview-sample",
    description: "관리자 미리보기 전용 글입니다.",
    id: "post-admin-preview-sample",
    publishedAt: null,
    retractedAt: null,
    slug: "admin-preview-sample",
    status: "ready_to_publish",
    title: "관리자 미리보기 샘플",
    unpublishedAt: null,
    updatedAt: now,
  },
];

const versions: PostVersionRecord[] = [
  createVersion({
    contentMarkdown: `# DB 기반 블로그의 공개 경계를 먼저 고정하기

자동 글 작성보다 먼저 필요한 것은 저장소와 공개 경계다. H-Log에서는 \`posts\`와 \`post_versions\`를 분리하고, public route가 \`status=published\`인 최신 version만 읽도록 기준을 잡았다.

## 왜 public boundary가 먼저인가

draft, ready_to_publish, failed_verification 상태가 URL에 노출되면 이후 자동화 단계가 위험해진다. 그래서 목록, 상세, Markdown endpoint는 같은 selector를 통과한 글만 렌더링한다.

## 이번 단계의 범위

실제 PostgreSQL 연결이나 migration은 아직 다루지 않는다. 현재 단계는 DB contract와 route behavior를 작게 검증하는 데 집중한다.
`,
    description:
      "DB 기반 블로그 전환에서 public route가 published 최신 version만 읽도록 고정한 구현 기록입니다.",
    id: "version-db-first-public-boundary",
    postId: "post-db-first-public-boundary",
    title: "DB 기반 블로그의 공개 경계를 먼저 고정하기",
  }),
  createVersion({
    contentMarkdown: `# OCI Docker Compose 배포 전에 고정할 운영 경계

H-Log의 운영 기본값은 OCI Compute와 Docker Compose다. 자동 블로그 플랫폼은 web, worker, PostgreSQL, Redis, Nginx가 함께 움직이므로 배포 전에 책임 경계를 먼저 정해야 한다.

## 기본 원칙

PostgreSQL과 Redis는 public internet에 노출하지 않는다. Nginx는 80/443 ingress와 TLS 종료를 맡고, secret은 저장소에 남기지 않는다.

## 다음 확인 항목

Compose 서비스 경계, DB 백업/복구, 배포 smoke, rollback runbook을 별도 phase에서 검증한다.
`,
    description:
      "OCI Compute와 Docker Compose 운영을 전제로 블로그 자동화가 커지기 전에 확인할 배포 경계를 정리했습니다.",
    id: "version-oci-compose-deployment-checklist",
    postId: "post-oci-compose-deployment-checklist",
    title: "OCI Docker Compose 배포 전에 고정할 운영 경계",
  }),
  createVersion({
    contentMarkdown: "# 관리자 미리보기 샘플\n\n이 글은 공개 route에 노출되면 안 됩니다.\n",
    description: "관리자 미리보기 전용 글입니다.",
    id: "version-admin-preview-sample",
    postId: "post-admin-preview-sample",
    title: "관리자 미리보기 샘플",
  }),
];

const sources: PostSourceRecord[] = [
  {
    fetchedAt: "2026-06-25T09:00:00.000Z",
    id: "source-next-app-router",
    postId: "post-db-first-public-boundary",
    publisher: "Next.js",
    researchPackId: null,
    snapshotHash: "",
    sourceRole: "official",
    summary: "App Router route and metadata behavior reference.",
    title: "Next.js App Router",
    url: "https://nextjs.org/docs/app",
  },
  {
    fetchedAt: "2026-06-25T09:00:00.000Z",
    id: "source-postgresql",
    postId: "post-db-first-public-boundary",
    publisher: "PostgreSQL",
    researchPackId: null,
    snapshotHash: "",
    sourceRole: "official",
    summary: "Future DB runtime reference.",
    title: "PostgreSQL documentation",
    url: "https://www.postgresql.org/docs/",
  },
  {
    fetchedAt: "2026-06-25T08:00:00.000Z",
    id: "source-docker-compose",
    postId: "post-oci-compose-deployment-checklist",
    publisher: "Docker",
    researchPackId: null,
    snapshotHash: "",
    sourceRole: "official",
    summary: "Compose service boundary reference.",
    title: "Docker Compose documentation",
    url: "https://docs.docker.com/compose/",
  },
];

const tags: PostTagRecord[] = [
  createTag("post-db-first-public-boundary", "DB"),
  createTag("post-db-first-public-boundary", "Blog"),
  createTag("post-db-first-public-boundary", "발행"),
  createTag("post-oci-compose-deployment-checklist", "OCI"),
  createTag("post-oci-compose-deployment-checklist", "Docker"),
  createTag("post-oci-compose-deployment-checklist", "운영"),
  createTag("post-admin-preview-sample", "비공개"),
];

export const blogContentStore: BlogContentStore = {
  posts,
  sources,
  tags,
  versions,
};

function createVersion({
  contentMarkdown,
  description,
  id,
  postId,
  title,
}: {
  contentMarkdown: string;
  description: string;
  id: string;
  postId: string;
  title: string;
}): PostVersionRecord {
  const content = createPostVersionContentFromMarkdown(contentMarkdown);

  return {
    ...content,
    createdAt: now,
    createdBy: "admin",
    description,
    id,
    personaVersionId: null,
    postId,
    researchPackId: null,
    title,
    versionNo: 1,
  };
}

function createTag(postId: string, tag: string): PostTagRecord {
  return {
    createdAt: now,
    id: `${postId}-${tag}`,
    postId,
    tag,
  };
}
