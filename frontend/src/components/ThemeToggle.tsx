"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "onetask-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme: Theme = saved === "light" ? "light" : "dark";

    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  return (
    <button
      type="button"
      aria-label={theme === "light" ? "다크 모드로 변경" : "라이트 모드로 변경"}
      aria-pressed={theme === "light"}
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === "light" ? "다크 모드" : "라이트 모드"}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === "light" ? "☀" : "◐"}
      </span>
      <span className="theme-toggle__label">
        {theme === "light" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
