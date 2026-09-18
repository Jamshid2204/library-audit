"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Report = {
  id: string;
  title: string;
  report_type: string;
  report_date: string;
  data: {
    totalBooks: number;
    totalReaders: number;
    totalDebt: number;
    totalVisits: number;
  };
};

export default function ReportsPage() {
  const [summary, setSummary] = useState({ totalBooks: 0, totalReaders: 0, totalDebt: 0, totalVisits: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase sozlamalari topilmadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const [books, readers, visits, savedReports] = await Promise.all([
      supabase.from("books").select("quantity"),
      supabase.from("readers").select("debt"),
      supabase.from("visits").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id,title,report_type,report_date,data").order("created_at", { ascending: false }),
    ]);
    const queryError = books.error || readers.error || visits.error || savedReports.error;
    if (queryError) {
      setError(`Hisobotlarni yuklashda xatolik: ${queryError.message}`);
    } else {
      setSummary({
        totalBooks: books.data.reduce((sum, book) => sum + Number(book.quantity), 0),
        totalReaders: readers.data.length,
        totalDebt: readers.data.reduce((sum, reader) => sum + Number(reader.debt), 0),
        totalVisits: visits.count ?? 0,
      });
      setReports((savedReports.data ?? []) as Report[]);
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadReports(); }, [loadReports]);

  async function saveReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase sozlamalari topilmadi.");
      return;
    }
    if (!title.trim()) {
      setError("Hisobot nomini kiriting.");
      return;
    }

    setSaving(true);
    setError("");
    const { error: saveError } = await supabase.from("reports").insert({
      title: title.trim(),
      report_type: "Umumiy",
      data: summary,
    });
    if (saveError) {
      setError(`Hisobotni saqlashda xatolik: ${saveError.message}`);
    } else {
      setTitle("");
      await loadReports();
    }
    setSaving(false);
  }

  function exportExcel() {
    const rows = reports.map((report) => ({
      Nomi: report.title,
      Turi: report.report_type,
      Sana: report.report_date,
      Kitoblar: report.data.totalBooks,
      Kitobxonlar: report.data.totalReaders,
      "Umumiy qarz": report.data.totalDebt,
      Qatnovlar: report.data.totalVisits,
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobotlar");
    XLSX.writeFile(workbook, "hisobotlar.xlsx");
  }

  function exportPdf() {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("Smart Hisobot", 20, 20);
    pdf.setFontSize(12);
    pdf.text("Umumiy hisobot", 20, 30);
    pdf.text(`Kitoblar: ${summary.totalBooks}`, 20, 42);
    pdf.text(`Kitobxonlar: ${summary.totalReaders}`, 20, 50);
    pdf.text(`Umumiy qarz: ${summary.totalDebt.toLocaleString()} so'm`, 20, 58);
    pdf.text(`Qatnovlar: ${summary.totalVisits}`, 20, 66);
    pdf.setFontSize(14);
    pdf.text("Saqlangan hisobotlar", 20, 82);
    pdf.setFontSize(10);

    let y = 92;
    reports.forEach((report) => {
      if (y > 275) {
        pdf.addPage();
        pdf.setFontSize(10);
        y = 20;
      }
      pdf.text(`${report.title} | ${report.report_date} | ${report.report_type}`, 20, y);
      pdf.text(
        `Kitoblar: ${report.data.totalBooks} | Kitobxonlar: ${report.data.totalReaders} | Qatnovlar: ${report.data.totalVisits}`,
        20,
        y + 8,
      );
      y += 24;
    });
    pdf.save("hisobotlar.pdf");
  }

  return (
    <DashboardShell title="Hisobotlar">
      <div className="summary-card full-card">
        <div className="panel-header">
          <h3>Umumiy hisobot</h3>
          <form className="report-save-form" onSubmit={saveReport}>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Hisobot nomi" />
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
          </form>
        </div>
        {error ? <p className="data-error" role="alert">{error}</p> : null}
        <ul className="report-list">
          <li>Umumiy kitoblar: {summary.totalBooks}</li>
          <li>Kitobxonlar: {summary.totalReaders}</li>
          <li>Umumiy qarz: {summary.totalDebt.toLocaleString()} so&apos;m</li>
          <li>Qatnovlar: {summary.totalVisits}</li>
        </ul>
      </div>
      <div className="panel-card table-panel">
        <div className="panel-header">
          <h3>Saqlangan hisobotlar</h3>
          <div className="report-export-actions">
            <button type="button" className="secondary-btn" onClick={exportExcel} disabled={reports.length === 0}>Excel yuklash</button>
            <button type="button" className="secondary-btn" onClick={exportPdf} disabled={reports.length === 0}>PDF yuklash</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nomi</th><th>Turi</th><th>Sana</th><th>Kitoblar</th><th>Kitobxonlar</th><th>Qatnovlar</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="table-state">Yuklanmoqda...</td></tr> : reports.length === 0 ? <tr><td colSpan={6} className="table-state">Saqlangan hisobotlar yo&apos;q.</td></tr> : reports.map((report) => (
                <tr key={report.id}><td>{report.title}</td><td>{report.report_type}</td><td>{report.report_date}</td><td>{report.data.totalBooks}</td><td>{report.data.totalReaders}</td><td>{report.data.totalVisits}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
