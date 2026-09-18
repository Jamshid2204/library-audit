"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password || password.length < 6) {
      setError("Email va kamida 6 belgidan iborat parol kiriting.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Autentifikatsiya xizmati sozlanmagan.");
      return;
    }

    const result = isRegister
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (isRegister && !result.data.session) {
      setError("Hisob yaratildi. Email manzilingizni tasdiqlang, keyin kiring.");
      return;
    }

    setError("");
    router.replace("/dashboard");
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand">
            <span className="brand-mark">S</span>
            <div>
              <h2>Smart Hisobot</h2>
              <small>Biblio dashboard</small>
            </div>
          </div>
        </div>

        <div className="auth-toggle" aria-label="Authentication mode switcher">
          <button
            type="button"
            className={isRegister ? "auth-tab" : "auth-tab active"}
            onClick={() => setIsRegister(false)}
          >
            Kirish
          </button>
          <button
            type="button"
            className={isRegister ? "auth-tab active" : "auth-tab"}
            onClick={() => setIsRegister(true)}
          >
            Ro'yxatdan o'tish
          </button>
        </div>

        <form className={isRegister ? "auth-form hidden" : "auth-form active"} onSubmit={handleSubmit}>
          <h3>Kirish</h3>
          <label>
            <span>Email</span>
            <input name="email" type="email" placeholder="admin@example.com" required />
          </label>
          <label>
            <span>Parol</span>
            <input name="password" type="password" placeholder="Kamida 6 ta belgi" minLength={6} required />
          </label>
          <button type="submit" className="primary-btn">
            Kirish
          </button>
        </form>

        <form className={isRegister ? "auth-form active" : "auth-form hidden"} onSubmit={handleSubmit}>
          <h3>Ro'yxatdan o'tish</h3>
          <label>
            <span>Email</span>
            <input name="email" type="email" placeholder="yangi@example.com" required />
          </label>
          <label>
            <span>Parol</span>
            <input name="password" type="password" placeholder="Kamida 6 ta belgi" minLength={6} required />
          </label>
          <button type="submit" className="primary-btn">
            Ro'yxatdan o'tish
          </button>
        </form>

        {error ? <div className="auth-message error">{error}</div> : null}

        <div className="auth-footer">
          <Link href="/">Bosh sahifaga qaytish</Link>
        </div>
      </div>
    </div>
  );
}
