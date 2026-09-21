"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

type VisitRow = { id: string; visitor_name: string; visit_date: string };
type LoanRow = {
  borrowed_at: string;
  books: { book_type: string; language: string; title: string } | { book_type: string; language: string; title: string }[] | null;
};

const getToday = () => new Date().toISOString().slice(0, 10);
const bookTypes = [
  "Badiiy adabiyotlar", "Umumiy bo'lim", "Falsafa fanlari. Psixologiya", "Diniy. Ilohiyot",
  "Ijtimoiy-siyosiy", "Tabiiy fanlar va aniq fanlar", "Amaliy fanlar", "San'at va sport",
  "Adabiyotshunoslik, tilshunoslik, filologiya", "Tarix, geografiya", "Gazetalar", "Jurnallar",
];
const languages = ["Kirilcha", "Lotincha", "Ruscha", "Inglizcha"];

export default function VisitsPage() {
  const [startDate, setStartDate] = useState(getToday);
  const [endDate, setEndDate] = useState(getToday);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatistics = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase sozlamalari topilmadi. .env.local faylini tekshiring.");
      setLoading(false);
      return;
    }
    if (startDate > endDate) {
      setError("Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const start = `${startDate}T00:00:00.000Z`;
    const end = `${endDate}T23:59:59.999Z`;
    const [visitsResult, loansResult] = await Promise.all([
      supabase.from("visits").select("id,visitor_name,visit_date").gte("visit_date", startDate).lte("visit_date", endDate),
      supabase.from("loans").select("borrowed_at,books(book_type,language,title)").gte("borrowed_at", start).lte("borrowed_at", end),
    ]);
    const queryError = visitsResult.error || loansResult.error;
    if (queryError) {
      setError(`Qatnov statistikasini yuklashda xatolik: ${queryError.message}`);
    } else {
      setVisits((visitsResult.data ?? []) as VisitRow[]);
      setLoans((loansResult.data ?? []) as LoanRow[]);
    }
    setLoading(false);
  }, [startDate, endDate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadStatistics(); }, [loadStatistics]);

  const booksByType = useMemo(() => {
    const counts = bookTypes.reduce<Record<string, number>>((result, type) => {
      result[type] = 0;
      return result;
    }, {});
    loans.reduce<Record<string, number>>((result, loan) => {
      const book = Array.isArray(loan.books) ? loan.books[0] : loan.books;
      const type = book?.book_type || "Turi ko'rsatilmagan";
      result[type] = (result[type] ?? 0) + 1;
      return result;
    }, counts);
    return counts;
  }, [loans]);

  const booksByLanguage = useMemo(() => {
    const counts = languages.reduce<Record<string, number>>((result, language) => {
      result[language] = 0;
      return result;
    }, {});
    loans.reduce<Record<string, number>>((result, loan) => {
      const book = Array.isArray(loan.books) ? loan.books[0] : loan.books;
      const language = book?.language || "Tili ko'rsatilmagan";
      result[language] = (result[language] ?? 0) + 1;
      return result;
    }, counts);
    return counts;
  }, [loans]);

  const uniqueVisitors = useMemo(() => new Set(visits.map((visit) => visit.visitor_name)).size, [visits]);
  const totalBooks = Object.values(booksByType).reduce((sum, count) => sum + count, 0);
  const invalidRange = startDate > endDate;

  return (
    <DashboardShell title="Qatnov statistikasi">
      <div className="panel-card visits-statistics">
        <div className="panel-header">
          <div>
            <h3>Kunlik qatnov va kitob olish statistikasi</h3>
            <p className="panel-subtitle">Qatnov qo&apos;shish shart emas — ma&apos;lumotlar bazadagi yozuvlardan avtomatik hisoblanadi.</p>
          </div>
          <div className="date-range-filter">
            <label className="date-filter">Boshlanish sanasi<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className="date-filter">Tugash sanasi<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          </div>
        </div>
        {error ? <p className="data-error" role="alert">{error}</p> : null}
        <div className="stats-grid visits-summary-grid">
          <div className="stat-card accent"><div className="stat-icon">👥</div><div className="stat-copy"><span>Kelgan odamlar</span><strong>{loading ? "..." : uniqueVisitors}</strong></div></div>
          <div className="stat-card violet"><div className="stat-icon">📚</div><div className="stat-copy"><span>Olingan kitoblar</span><strong>{loading ? "..." : totalBooks}</strong></div></div>
          <div className="stat-card orange"><div className="stat-icon">🗓️</div><div className="stat-copy"><span>Sana oralig&apos;i</span><strong>{invalidRange ? "Noto'g'ri" : `${startDate} — ${endDate}`}</strong></div></div>
        </div>
      </div>

      <div className="panel-card table-panel">
        <div className="panel-header"><h3>Kitob turi bo&apos;yicha olingan kitoblar</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Kitob turi</th><th>Olingan kitoblar soni</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={2} className="table-state">Yuklanmoqda...</td></tr> : Object.entries(booksByType).map(([type, count]) => <tr key={type}><td>{type}</td><td>{count} ta</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel-card table-panel">
        <div className="panel-header"><h3>Kitob tili bo&apos;yicha olingan kitoblar</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Kitob tili</th><th>Olingan kitoblar soni</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={2} className="table-state">Yuklanmoqda...</td></tr> : Object.entries(booksByLanguage).map(([language, count]) => <tr key={language}><td>{language}</td><td>{count} ta</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
