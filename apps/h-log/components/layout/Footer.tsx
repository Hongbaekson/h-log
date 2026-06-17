export function Footer() {
  return (
    <footer className="border-t border-slate-800/80">
      <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-slate-500">
        <p>© {new Date().getFullYear()} 손홍백. All rights reserved.</p>
      </div>
    </footer>
  );
}
