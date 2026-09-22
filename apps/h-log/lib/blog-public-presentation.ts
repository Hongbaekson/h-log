import type { PublicBlogPost } from "./blog-public.ts";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const articleModeLabels: Record<PublicBlogPost["articleMode"], string> = {
  applied_analysis: "적용 분석",
  document_analysis: "문서 분석",
  experiment: "실험 기록",
  ops_incident: "운영 회고",
  project_record: "프로젝트 기록",
};

export function formatPublicBlogDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function formatPublicBlogArticleMode(
  value: PublicBlogPost["articleMode"],
): string {
  return articleModeLabels[value];
}
