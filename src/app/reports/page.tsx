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
    ageDistribution?: Record<string, number>;
    genderDistribution?: Record<string, number>;
    specialtyDistribution?: Record<string, number>;
  };
};

type ReaderDemographic = {
  age: number | null;
  gender: "Erkak" | "Ayol" | null;
  institution_type: "Maktab" | "Texnikum" | "Universitet" | "Nafaqada" | "Oliy ma'lumotli xizmatchi" | "Boshqalar" | null;
};

const ageGroups = ["6–15 yosh", "16–30 yosh", "31–50 yosh", "51–59 yosh", "60 yosh va undan katta"];
const institutionTypes = ["Maktab", "Texnikum", "Universitet", "Nafaqada", "Oliy ma'lumotli xizmatchi", "Boshqalar"];

function countAgeGroups(ages: Array<number | null>) {
  const counts = Object.fromEntries(ageGroups.map((group) => [group, 0]));
  ages.forEach((age) => {
    const group = age === null ? null
      : age >= 6 && age <= 15 ? ageGroups[0]
        : age <= 30 ? ageGroups[1]
          : age <= 50 ? ageGroups[2]
            : age <= 59 ? ageGroups[3]
              : age >= 60 ? ageGroups[4] : null;
    if (group) counts[group] += 1;
  });
  return counts;
}

function countGenders(genders: Array<ReaderDemographic["gender"]>) {
  const counts = { Erkak: 0, Ayol: 0 };
  genders.forEach((gender) => {
    if (gender === "Erkak" || gender === "Ayol") counts[gender] += 1;
  });
  return counts;
}

function countInstitutionTypes(types: Array<ReaderDemographic["institution_type"]>) {
  const counts = Object.fromEntries(institutionTypes.map((type) => [type, 0]));
  types.forEach((type) => {
    if (type && type in counts) counts[type] += 1;
  });
  return counts;
}

function formatDistribution(distribution: Record<string, number> | undefined) {
  if (!distribution) return "Ma'lumot yo'q";
  return Object.entries(distribution)
    .map(([label, count]) => `${label}: ${count}`)
    .join("; ");
}

export default function ReportsPage() {
  const [summary, setSummary] = useState({ totalBooks: 0, totalReaders: 0, totalDebt: 0, totalVisits: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [title, setTitle] = useState("");
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [demographicError, setDemographicError] = useState("");
  const [demographics, setDemographics] = useState({
    age: {} as Record<string, number>,
    gender: {} as Record<string, number>,
    specialty: {} as Record<string, number>,
  });

  const loadReports = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase sozlamalari topilmadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const [books, readers, demographicReaders, loans, visits, savedReports] = await Promise.all([
      supabase.from("books").select("quantity"),
      supabase.from("readers").select("id"),
      supabase.from("readers").select("age,gender,institution_type"),
      supabase.from("loans").select("reader_id,due_date,status,returned_at"),
      supabase.from("visits").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id,title,report_type,report_date,data").order("created_at", { ascending: false }),
    ]);
    const queryError = books.error || readers.error || visits.error || savedReports.error || loans.error;
    if (queryError) {
      const missingReportsTable = queryError.message.includes("public.reports") &&
        queryError.message.includes("schema cache");
      setError(missingReportsTable
        ? "reports jadvali Supabase bazasida topilmadi. database/reports-migration.sql faylini Supabase SQL Editor'da ishga tushiring, so'ng sahifani yangilang."
        : `Hisobotlarni yuklashda xatolik: ${queryError.message}`);
    } else {
      setDemographicError("");
      if (demographicReaders.error) {
        const missingDemographicColumns = /column readers\.(age|gender|specialty) does not exist/i.test(demographicReaders.error.message);
        setDemographicError(missingDemographicColumns
          ? "Yosh, jins va mutaxassislik ustunlari bazada hali yaratilmagan. database/readers-demographics-migration.sql faylini Supabase SQL Editor'da ishga tushiring."
          : `Kitobxonlar demografiyasini yuklashda xatolik: ${demographicReaders.error.message}`);
        setDemographics({ age: {}, gender: {}, specialty: {} });
      } else {
        const readerDemographics = (demographicReaders.data ?? []) as ReaderDemographic[];
        setDemographics({
          age: countAgeGroups(readerDemographics.map((reader) => reader.age)),
          gender: countGenders(readerDemographics.map((reader) => reader.gender)),
          specialty: countInstitutionTypes(readerDemographics.map((reader) => reader.institution_type)),
        });
      }
      setSummary({
        totalBooks: books.data.reduce((sum, book) => sum + Number(book.quantity), 0),
        totalReaders: readers.data.length,
        totalDebt: (loans.data ?? []).filter((loan) => loan.status === "borrowed" && !loan.returned_at && loan.due_date && loan.due_date < new Date().toISOString().slice(0, 10)).length,
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
    const reportData = {
      ...summary,
      ageDistribution: demographics.age,
      genderDistribution: demographics.gender,
      specialtyDistribution: demographics.specialty,
    };
    const result = editingReport
      ? await supabase.from("reports").update({ title: title.trim(), data: reportData }).eq("id", editingReport.id)
      : await supabase.from("reports").insert({ title: title.trim(), report_type: "Umumiy", data: reportData });
    const saveError = result.error;
    if (saveError) {
      setError(`Hisobotni saqlashda xatolik: ${saveError.message}`);
    } else {
      setTitle("");
      setEditingReport(null);
      await loadReports();
    }
    setSaving(false);
  }

  function editReport(report: Report) {
    setEditingReport(report);
    setTitle(report.title);
    setError("");
  }

  function cancelEdit() {
    setEditingReport(null);
    setTitle("");
  }

  async function deleteReport(report: Report) {
    if (!window.confirm("Ushbu hisobotni o'chirishni xohlaysizmi?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    setError("");
    const { error: deleteError } = await supabase.from("reports").delete().eq("id", report.id);
    if (deleteError) setError(`Hisobotni o'chirishda xatolik: ${deleteError.message}`);
    else {
      if (editingReport?.id === report.id) cancelEdit();
      await loadReports();
    }
  }

  function exportExcel() {
    const rows = reports.map((report) => ({
      Nomi: report.title,
      Turi: report.report_type,
      Sana: report.report_date,
      Kitoblar: report.data.totalBooks,
      Kitobxonlar: report.data.totalReaders,
      "Qaytarilmagan kitoblar": report.data.totalDebt,
      Qatnovlar: report.data.totalVisits,
      "Yosh bo'yicha": formatDistribution(report.data.ageDistribution ?? demographics.age),
      "Jins bo'yicha": formatDistribution(report.data.genderDistribution ?? demographics.gender),
      "Mutaxassislik bo'yicha": formatDistribution(report.data.specialtyDistribution ?? demographics.specialty),
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobotlar");
    const demographicRows = [
      ...Object.entries(demographics.age).map(([Nomi, Soni]) => ({ Tur: "Yosh", Nomi, Soni })),
      ...Object.entries(demographics.gender).map(([Nomi, Soni]) => ({ Tur: "Jins", Nomi, Soni })),
      ...Object.entries(demographics.specialty).map(([Nomi, Soni]) => ({ Tur: "Mutaxassislik", Nomi, Soni })),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(demographicRows), "Kitobxonlar");
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
    pdf.text(`Qaytarilmagan kitoblar: ${summary.totalDebt} ta`, 20, 58);
    pdf.text(`Qatnovlar: ${summary.totalVisits}`, 20, 66);
    pdf.setFontSize(12);
    pdf.text("Kitobxonlar demografiyasi", 20, 78);
    let demographicY = 88;
    for (const [title, values] of [["Yosh", demographics.age], ["Jins", demographics.gender], ["Mutaxassislik", demographics.specialty]] as const) {
      pdf.text(`${title}:`, 20, demographicY);
      demographicY += 6;
      Object.entries(values).forEach(([label, count]) => {
        if (demographicY > 275) {
          pdf.addPage();
          demographicY = 20;
        }
        pdf.text(`${label}: ${count} ta`, 25, demographicY);
        demographicY += 5;
      });
      demographicY += 3;
    }
    pdf.setFontSize(14);
    pdf.text("Saqlangan hisobotlar", 20, demographicY + 4);
    pdf.setFontSize(10);

    let y = demographicY + 14;
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
            {editingReport ? <button type="button" className="secondary-btn" onClick={cancelEdit}>Bekor qilish</button> : null}
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saqlanmoqda..." : editingReport ? "Tahrirlashni saqlash" : "Saqlash"}</button>
          </form>
        </div>
        {error ? <p className="data-error" role="alert">{error}</p> : null}
        {demographicError ? <p className="data-error" role="alert">{demographicError}</p> : null}
        <ul className="report-list">
          <li>Umumiy kitoblar: {summary.totalBooks}</li>
          <li>Kitobxonlar: {summary.totalReaders}</li>
          <li>Qaytarilmagan kitoblar: {summary.totalDebt} ta</li>
          <li>Qatnovlar: {summary.totalVisits}</li>
        </ul>
      </div>
      <div className="demographic-report-grid">
        <div className="panel-card demographic-card">
          <h3>Yosh bo&apos;yicha kitobxonlar</h3>
          <ReportBreakdown data={demographics.age} />
        </div>
        <div className="panel-card demographic-card">
          <h3>Jins bo&apos;yicha kitobxonlar</h3>
          <ReportBreakdown data={demographics.gender} />
        </div>
        <div className="panel-card demographic-card">
          <h3>Mutaxassislik bo&apos;yicha kitobxonlar</h3>
          <ReportBreakdown data={demographics.specialty} />
        </div>
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
            <thead><tr><th>Nomi</th><th>Turi</th><th>Sana</th><th>Kitoblar</th><th>Kitobxonlar</th><th>Qatnovlar</th><th>Amallar</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="table-state">Yuklanmoqda...</td></tr> : reports.length === 0 ? <tr><td colSpan={7} className="table-state">Saqlangan hisobotlar yo&apos;q.</td></tr> : reports.map((report) => (
                <tr key={report.id}><td>{report.title}</td><td>{report.report_type}</td><td>{report.report_date}</td><td>{report.data.totalBooks}</td><td>{report.data.totalReaders}</td><td>{report.data.totalVisits}</td><td><div className="table-actions"><button type="button" className="table-action edit-action" onClick={() => editReport(report)}>Tahrirlash</button><button type="button" className="table-action delete-action" onClick={() => { void deleteReport(report); }}>O&apos;chirish</button></div></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

function ReportBreakdown({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return entries.length === 0
    ? <p className="table-state">Ma&apos;lumot yo&apos;q.</p>
    : <div className="breakdown-list">{entries.map(([label, count]) => <div className="breakdown-row" key={label}><span>{label}</span><strong>{count} ta</strong></div>)}</div>;
}
