"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const navItems = [
  { href: "/dashboard", label: "Bosh sahifa" },
  { href: "/books", label: "Kitoblar" },
  { href: "/readers", label: "Kitobxonlar" },
  { href: "/visits", label: "Qatnov" },
  { href: "/reports", label: "Hisobotlar" },
  { href: "/settings", label: "Sozlamalar" },
];

export function DashboardShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [language, setLanguage] = useState("uz");

  useEffect(() => {
    const syncLanguage = () => setLanguage(window.localStorage.getItem("app-language") || "uz");
    syncLanguage();
    window.addEventListener("app-language-change", syncLanguage);
    return () => window.removeEventListener("app-language-change", syncLanguage);
  }, []);

  const russian = language === "ru";
  const labels: Record<string, [string, string]> = {
    "/dashboard": ["Bosh sahifa", "Главная"],
    "/books": ["Kitoblar", "Книги"],
    "/readers": ["Kitobxonlar", "Читатели"],
    "/visits": ["Qatnov", "Посещения"],
    "/reports": ["Hisobotlar", "Отчёты"],
    "/settings": ["Sozlamalar", "Настройки"],
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-pill">S</div>
          <div>
            <h1>Smart Hisobot</h1>
            <small>Library dashboard</small>
          </div>
        </div>

        <nav className="nav-stack">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "nav-item active" : "nav-item"}
              >
                {russian ? labels[item.href][1] : item.label}
              </Link>
            );
          })}
        </nav>

        <div className="logout-box">
          <span>{russian ? "Пользователь: admin" : "Foydalanuvchi: admin"}</span>
          <button type="button" onClick={handleLogout} className="secondary-btn">
            {russian ? "Выйти" : "Chiqish"}
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="top-icon" aria-label="Open menu">
              ☰
            </button>
            <div className="search-box">
              <span>⌕</span>
              <input type="text" defaultValue="P. Kitob, muallif, ISBN, inventor rami yoki kitobxonini qidiring..." />
            </div>
          </div>

          <div className="topbar-right">
            <div className="date-pill">📅 17.09.2025</div>
            <div className="time-pill">14:10</div>
            <button type="button" className="top-icon" aria-label="Notifications">
              🔔
            </button>
            <div className="user-mini">
              <span className="avatar">A</span>
              <div>
                <strong>Admin</strong>
                <small>{russian ? "Сотрудник библиотеки" : "Kutubxona xodimi"}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="page-header">
          <h2>{russian && labels[pathname] ? labels[pathname][1] : title}</h2>
        </div>

        {children}
      </main>
    </div>
  );
}
