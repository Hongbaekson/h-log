import type { Metadata } from "next";
import Link from "next/link";
import { BlogContent } from "@/components/blog/BlogContent";
import { requireAdminOwner } from "@/lib/admin-server";
import { loadAdminPosts } from "@/lib/blog-admin-review-server";
import { adminPostStatusLabels, parseAdminPostReviewQuery, type AdminPostReviewQuery, type AdminPostsResult } from "@/lib/blog-admin-review";
import { blogPostStatuses } from "@/lib/blog-content-model";
import { buildPublicBlogContentBlocks } from "@/lib/blog-public";
import "./posts.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "블로그 검토", robots: { index: false, follow: false } };

function href(query: AdminPostReviewQuery, change: Partial<AdminPostReviewQuery> = {}) {
  const value = { ...query, ...change }, params = new URLSearchParams();
  if (value.status) params.set("status", value.status);
  if (value.page > 1) params.set("page", String(value.page));
  if (value.post) params.set("post", value.post);
  if (value.version) params.set("version", String(value.version));
  return `/admin/posts${params.size ? `?${params}` : ""}`;
}
function date(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
}
const resultLabels: Record<string, string> = { passed: "통과", failed: "실패", queued: "대기", running: "실행 중", retrying: "재시도 대기", succeeded: "완료" };

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminOwner();
  const heading = <header className="admin-heading"><p>내 글 관리</p><h1>블로그 검토</h1><span>저장된 글과 이전 버전을 읽고, 출처와 검사 기록을 확인하세요.</span></header>;
  let query: AdminPostReviewQuery;
  try { query = parseAdminPostReviewQuery(await searchParams); }
  catch { return <>{heading}<p role="alert">조회 조건을 확인해 주세요.</p><a className="review-link" href="/admin/posts">목록으로 돌아가기</a></>; }
  if (!process.env.DATABASE_URL) return <>{heading}<p>블로그 저장소가 아직 설정되지 않았습니다.</p></>;
  let data: AdminPostsResult;
  try { data = await loadAdminPosts(query); }
  catch { return <>{heading}<p role="alert">글을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p><a className="review-link" href={href(query)}>다시 열기</a></>; }
  const review = data.review, version = review?.version;
  let blocks: ReturnType<typeof buildPublicBlogContentBlocks> | null = null;
  if (version?.contentMarkdown != null) {
    try { blocks = buildPublicBlogContentBlocks(version.contentMarkdown); } catch { /* Keep the saved source available if parsing fails. */ }
  }
  return <div className="post-review">
    {heading}
    <form action="/admin/posts" className="review-filter">
      <label htmlFor="post-status">글 상태</label>
      <select id="post-status" name="status" defaultValue={query.status ?? ""}>
        <option value="">전체 상태</option>
        {blogPostStatuses.map(status => <option key={status} value={status}>{adminPostStatusLabels[status]}</option>)}
      </select>
      <button type="submit">적용</button>
      <p>조회만으로 글이 수정되거나 공개되지 않습니다.</p>
    </form>
    <div className={query.post ? "review-columns" : undefined}>
      <section className="review-list" aria-labelledby="review-list-title">
        <div className="review-section-heading"><h2 id="review-list-title">저장된 글</h2><span>{query.page}페이지 · 최대 20개</span></div>
        {data.posts.length === 0 ? <p className="review-empty">해당하는 글이 없습니다.</p> : <ul>
          {data.posts.map(post => <li key={post.id}><Link href={href(query, { post: post.id, version: null }) + "#post-review"} prefetch={false} aria-current={query.post === post.id ? "true" : undefined}>
            <span className="review-status">{adminPostStatusLabels[post.status]}</span><strong>{post.title}</strong>
            <time dateTime={post.updatedAt}>{date(post.updatedAt)} 수정</time>
          </Link></li>)}
        </ul>}
        <nav className="review-pagination" aria-label="글 목록 페이지">
          {query.page > 1 && <Link href={href(query, { page: query.page - 1 })} prefetch={false}>이전 페이지</Link>}
          {data.hasNext && <Link href={href(query, { page: query.page + 1 })} prefetch={false}>다음 페이지</Link>}
        </nav>
      </section>
      {query.post && <section id="post-review" className="review-detail" aria-label="선택한 글 검토" tabIndex={-1}>
        {!review ? <p role="status">글이나 선택한 버전을 찾을 수 없습니다. 목록에서 다시 선택해 주세요.</p> : <>
          <div className="review-section-heading"><span className="review-status">{adminPostStatusLabels[review.post.status]}</span><Link href={href(query, { post: null, version: null })} prefetch={false}>검토 닫기</Link></div>
          <h2 className="review-title">{version?.title ?? review.post.title}</h2>
          {!version ? <p>저장된 본문 버전이 없습니다.</p> : <>
            <p className="review-caption">표시 중: v{version.versionNo} · {version.id === review.post.currentVersionId ? "현재 지정 버전" : review.post.currentVersionId ? "별도 저장 버전" : "현재 버전 미지정"}</p>
            <p className="review-caption">{date(version.createdAt)} 저장 · {version.createdBy === "admin" ? "직접 작성" : "자동 작성"} · 시각은 한국 기준입니다.</p>
            <form action="/admin/posts#post-review" className="review-version">
              <input type="hidden" name="post" value={query.post} />
              {query.status && <input type="hidden" name="status" value={query.status} />}
              <input type="hidden" name="page" value={query.page} />
              <label htmlFor="review-version">버전 번호 <small>(최신 v{review.latestVersionNo})</small></label>
              <input id="review-version" type="number" name="version" min="1" max={review.latestVersionNo ?? undefined} defaultValue={version.versionNo} key={version.id} required />
              <button type="submit">버전 보기</button>
              {review.post.currentVersionId && version.id !== review.post.currentVersionId && <Link href={href(query, { version: null }) + "#post-review"} prefetch={false}>현재 버전 보기</Link>}
            </form>
            <p className="review-description">{version.description}</p>
            {review.hashMatches === false && <p className="review-warning" role="alert">저장된 본문과 해시가 일치하지 않습니다. 원문을 확인해 주세요.</p>}
            <section aria-label="본문 미리보기" className="review-preview">
              <h3>본문 미리보기</h3>
              {blocks ? <div className="min-w-0 text-[17px] leading-8 text-slate-300 wrap-anywhere [&_code]:rounded-md [&_code]:bg-slate-950/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-cyan-100 [&_figure]:my-8 [&>h1]:sr-only [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:leading-snug [&_h2]:font-bold [&_h2]:tracking-normal [&_h2]:text-white md:[&_h2]:text-[28px] [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:leading-snug [&_h3]:font-bold [&_h3]:text-white [&_p]:mt-5 [&>:first-child]:mt-0 [&>h1:first-child+*]:mt-0"><BlogContent blocks={blocks} /></div> : <p>본문을 미리 볼 수 없습니다. 원문 크기 제한(256 KiB)이나 형식을 확인해 주세요.</p>}
            </section>
            <details className="review-record"><summary>저장 원문과 해시</summary>
              <p>미리보기는 Markdown으로 표시합니다. 아래 HTML은 실행하지 않는 저장 원문입니다.</p>
              <p>해시 확인: {review.hashMatches === null ? "크기 제한으로 미검사" : review.hashMatches ? "일치" : "불일치"}</p><code className="review-hash">{version.contentHash}</code>
              <h4>Markdown</h4><pre>{version.contentMarkdown ?? "256 KiB를 넘는 원문은 이 화면에서 불러오지 않습니다."}</pre>
              <h4>HTML</h4><pre>{version.contentHtml ?? "256 KiB를 넘는 원문은 이 화면에서 불러오지 않습니다."}</pre>
            </details>
          </>}
          <details className="review-record" open><summary>글에 연결된 출처</summary>
            <p>최근 50개까지 표시합니다. 글 단위 기록이라 이전 버전 작성 당시의 목록과 다를 수 있습니다.</p>
            {review.sources.length ? <ul>{review.sources.map(source => <li key={source.id}>
              {source.href ? <a href={source.href} target="_blank" rel="noreferrer noopener">{source.title} <span>(새 창)</span></a> : <span>{source.title} · 링크를 표시할 수 없습니다.</span>}
              <small>{source.publisher} · {source.role} · {date(source.fetchedAt)}</small>
            </li>)}</ul> : <p>저장된 출처가 없습니다.</p>}
          </details>
          <details className="review-record" open><summary>저장된 검증 결과</summary>
            <p>선택한 버전의 기록을 각각 최대 50개 표시합니다. 생성 과정과 품질 점수는 별도로 기록되어 있지 않습니다.</p>
            <h4>공개 검증 기록</h4>
            {review.checks.length ? <ul>{review.checks.map(check => <li key={check.id}><strong>{check.type} · {resultLabels[check.status]}</strong><small>{check.responseCode ? `HTTP ${check.responseCode} · ` : ""}{date(check.checkedAt)}</small></li>)}</ul> : <p>미기록 · 별도의 공개 검증 기록이 없습니다. 아래 작업 결과와 구분해 확인하세요.</p>}
            <h4>발행 작업 결과</h4>
            {review.jobs.length ? <ul>{review.jobs.map(job => <li key={job.id}><strong>{job.type} · {resultLabels[job.status]}</strong><small>{job.importance === "required" ? "필수" : "후속"} 작업 · 재시도 {job.retryCount}회</small></li>)}</ul> : <p>이 버전의 발행 작업 기록이 없습니다.</p>}
          </details>
        </>}
      </section>}
    </div>
  </div>;
}
