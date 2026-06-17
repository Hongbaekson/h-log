"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const storageKey = "h-log-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(storageKey, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const isLight = theme === "light";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const nextTheme = isLight ? "dark" : "light";

    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      aria-label={isLight ? "다크 모드로 변경" : "라이트 모드로 변경"}
      aria-pressed={!isLight}
      className="theme-toggle inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-xl border p-1 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      onClick={toggleTheme}
      title={isLight ? "다크 모드" : "라이트 모드"}
      type="button"
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-lg transition-colors duration-200 ${
          isLight ? "bg-amber-300 text-slate-950" : "text-slate-500"
        }`}
      >
        <Sun aria-hidden="true" size={15} strokeWidth={2} />
      </span>
      <span
        className={`grid h-7 w-7 place-items-center rounded-lg transition-colors duration-200 ${
          isLight ? "text-slate-500" : "bg-blue-500 text-white"
        }`}
      >
        <Moon aria-hidden="true" size={15} strokeWidth={2} />
      </span>
    </button>
  );
}
