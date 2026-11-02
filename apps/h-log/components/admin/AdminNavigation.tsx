"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Brain, FileText, FlaskConical, History, LayoutDashboard, ListTodo, WandSparkles } from "lucide-react";

const items = [
  { label: "개요", href: "/admin", icon: LayoutDashboard },
  { label: "블로그", href: "/admin/posts", icon: BookOpen },
  { label: "자동 작성", href: "/admin/automation", icon: WandSparkles },
  { label: "작업", href: "/admin/jobs", icon: ListTodo },
  { label: "변경 이력", href: "/admin/audit", icon: History },
  { label: "Second Brain", href: "/admin/brain", icon: Brain },
  { label: "이력서 PDF", href: "/admin/resume", icon: FileText },
  { label: "실험실", href: "/admin/lab/queue", icon: FlaskConical },
  { label: "모니터링", href: "/admin/monitoring", icon: Activity },
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="admin-navigation">
      <ul>
        {items.map(({ label, href, icon: Icon }) => (
          <li key={href}>
            <Link href={href} prefetch={false} aria-current={(href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/")) ? "page" : undefined}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
