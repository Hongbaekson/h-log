export function Footer() {
  return (
    <footer className="site-footer">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm sm:px-5">
        <p className="footer-signature">h-log<span>개발과 고민의 기록.</span></p>
        <p>© {new Date().getFullYear()} 손홍백. All rights reserved.</p>
      </div>
    </footer>
  );
}
