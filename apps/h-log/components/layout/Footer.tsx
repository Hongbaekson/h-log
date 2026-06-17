export function Footer() {
  return (
    <footer className="border-t border-slate-800/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} 손홍백.</p>
        <p>Backend · AI Workflow · 자동화</p>
      </div>
    </footer>
  );
}
