"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";

type DashboardReader = {
  id: string;
  full_name: string;
  class_name: string | null;
  debt: number;
};

type DashboardVisit = {
  id: string;
  visit_date: string;
  purpose: string;
};

export default function DashboardPage() {
  const [qrGenerated, setQrGenerated] = useState(false);
  const [stats, setStats] = useState({ totalBooks: 0, totalReaders: 0, debtors: 0, todayVisits: 0, totalDebt: 0 });
  const [readers, setReaders] = useState<DashboardReader[]>([]);
  const [visits, setVisits] = useState<DashboardVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase sozlamalari topilmadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const [booksResult, readersResult, visitsResult] = await Promise.all([
      supabase.from("books").select("id"),
      supabase.from("readers").select("id,full_name,class_name,debt").order("debt", { ascending: false }),
      supabase.from("visits").select("id,visit_date,purpose").order("visit_date", { ascending: false }),
    ]);
    const queryError = booksResult.error || readersResult.error || visitsResult.error;
    if (queryError) {
      setError(`Statistikalarni yuklashda xatolik: ${queryError.message}`);
    } else {
      const loadedReaders = (readersResult.data ?? []) as DashboardReader[];
      const loadedVisits = (visitsResult.data ?? []) as DashboardVisit[];
      const today = new Date().toISOString().slice(0, 10);
      setReaders(loadedReaders.slice(0, 5));
      setVisits(loadedVisits.slice(0, 5));
      setStats({
        totalBooks: booksResult.data?.length ?? 0,
        totalReaders: loadedReaders.length,
        debtors: loadedReaders.filter((reader) => Number(reader.debt) > 0).length,
        todayVisits: loadedVisits.filter((visit) => visit.visit_date === today).length,
        totalDebt: loadedReaders.reduce((sum, reader) => sum + Number(reader.debt), 0),
      });
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  return (
    <DashboardShell title="Bosh sahifa">
      <div className="hero-layout">
        <div className="hero-panel">
          <div className="hero-copy">
            <h1>BIBLIO SMART</h1>
            <p>Zamonaviy kutubxona boshqaruv tizimi</p>
            <blockquote>“Kitob — bilim kaliti, inson hayotini yorituvchi nur.”</blockquote>
          </div>
        </div>

        <div className="qr-side panel-card">
          <h3>QR kod</h3>
          <div className={qrGenerated ? "qr-box generated" : "qr-box"} aria-label="QR kod namunasi" />
          <button type="button" className="primary-btn qr-btn" onClick={() => setQrGenerated(true)}>
            {qrGenerated ? "QR tayyor" : "QR yaratish"}
          </button>
        </div>
      </div>

      {error ? <p className="data-error" role="alert">{error}</p> : null}
      <div className="stats-grid classic-grid">
        <div className="stat-card accent">
          <div className="stat-icon">👥</div>
          <div className="stat-copy">
            <span>Jami kitobxonlar</span>
            <strong>{loading ? "..." : stats.totalReaders}</strong>
          </div>
        </div>

        <div className="stat-card violet">
          <div className="stat-icon">📚</div>
          <div className="stat-copy">
            <span>Kitoblar</span>
            <strong>{loading ? "..." : stats.totalBooks}</strong>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-copy">
            <span>Qarzdorlar</span>
            <strong>{loading ? "..." : stats.debtors}</strong>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">🧾</div>
          <div className="stat-copy">
            <span>Bugungi qatnov</span>
            <strong>{loading ? "..." : stats.todayVisits}</strong>
          </div>
        </div>

        <div className="stat-card pink">
          <div className="stat-icon">💸</div>
          <div className="stat-copy">
            <span>Ummumiy qarz</span>
            <strong>{loading ? "..." : `${stats.totalDebt.toLocaleString()} so'm`}</strong>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="panel-card">
          <h3>Kitobxonlar statistikasi</h3>
          <div className="chart-box bar-chart">
            <div className="bars">
              <span style={{ height: "45%" }} />
              <span style={{ height: "72%" }} />
              <span style={{ height: "60%" }} />
              <span style={{ height: "85%" }} />
              <span style={{ height: "56%" }} />
            </div>
          </div>
          <div className="chart-labels">
            <span>7-10 yosh</span>
            <span>11-15 yosh</span>
            <span>16-20 yosh</span>
          </div>
        </div>

        <div className="panel-card">
          <h3>Ta&apos;lim muassasasi bo&apos;yicha</h3>
          <div className="donut-wrap">
            <div className="donut-graph" />
            <div className="donut-legend">
              <span><i className="dot blue" /> Maktab</span>
              <span><i className="dot orange" /> Texnikum</span>
              <span><i className="dot green" /> Universitet</span>
            </div>
          </div>
        </div>

        <div className="panel-card action-panel">
          <h3>Tezkor amal</h3>
          <Link href="/books" className="quick-btn green">Yangi kitob qo&apos;shish</Link>
          <Link href="/readers" className="quick-btn blue">Kitobxon qo&apos;shish</Link>
          <Link href="/visits" className="quick-btn purple">Qatnov yozish</Link>
          <Link href="/reports" className="quick-btn pink">Hisobot shakllantirish</Link>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="panel-card compact-card">
          <h3>Eng faol kitobxonlar</h3>
          <ul className="mini-list">
            {readers.map((reader) => (
              <li key={reader.id}>{reader.full_name} — {reader.class_name ?? "—"}</li>
            ))}
          </ul>
        </div>

        <div className="panel-card compact-card">
          <h3>Qatnovlar</h3>
          <ul className="mini-list">
            {visits.map((visit) => (
              <li key={visit.id}>{visit.visit_date} — {visit.purpose}</li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardShell>
  );
}
