export default function BlogPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Blog</p>
      <h1 className="mt-4 text-4xl font-bold text-white">개발하며 배운 것들</h1>
      <p className="mt-5 leading-8 text-slate-300">
        글 목록, 태그 필터, 검색은 블로그 단위에서 구현합니다.
      </p>
    </section>
  );
}
