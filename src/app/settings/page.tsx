"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { DashboardShell } from "@/components/dashboard-shell";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [language, setLanguage] = useState("uz");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("app-language") || "uz";
    const savedDarkMode = window.localStorage.getItem("dark-mode") === "true";
    setLanguage(savedLanguage);
    setDarkMode(savedDarkMode);
    document.documentElement.lang = savedLanguage;
    document.documentElement.classList.toggle("dark-mode", savedDarkMode);
  }, []);

  const changeLanguage = (value: string) => {
    setLanguage(value);
    window.localStorage.setItem("app-language", value);
    document.documentElement.lang = value;
    window.dispatchEvent(new Event("app-language-change"));
  };

  const changeDarkMode = (value: boolean) => {
    setDarkMode(value);
    window.localStorage.setItem("dark-mode", String(value));
    document.documentElement.classList.toggle("dark-mode", value);
  };

  return (
    <DashboardShell title={language === "ru" ? "Настройки" : "Sozlamalar"}>
      <div className="settings-panel panel-card">
        <h3>{language === "ru" ? "Настройки приложения" : "Sozlamalar"}</h3>
        <p>
          {language === "ru"
            ? "Настройте язык и внешний вид приложения."
            : "Ilova server sozlamalaridan foydalanadi. Supabase ulanish ma'lumotlari foydalanuvchi interfeysida ko'rsatilmaydi."}
        </p>
        <div className="settings-options">
          <label>
            <span>{language === "ru" ? "Язык интерфейса" : "Interfeys tili"}</span>
            <select value={language} onChange={(event) => changeLanguage(event.target.value)}>
              <option value="uz">O&apos;zbekcha</option>
              <option value="ru">Русский</option>
            </select>
          </label>
          <label className="settings-checkbox">
            <input type="checkbox" checked={darkMode} onChange={(event) => changeDarkMode(event.target.checked)} />
            <span>{language === "ru" ? "Тёмный режим" : "Tun rejimi"}</span>
          </label>
        </div>
      </div>
    </DashboardShell>
  );
}
