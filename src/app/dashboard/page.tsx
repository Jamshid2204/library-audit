"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";

type DashboardReader = {
  id: string;
  full_name: string;
  class_name: string | null;
  institution_type: "Maktab" | "Texnikum" | "Universitet";
  debt: number;
};

type DashboardLoan = {
  reader_id: string;
  due_date: string | null;
  status: "borrowed" | "returned";
  returned_at: string | null;
};

type DashboardVisit = {
  id: string;
  visit_date: string;
  purpose: string;
};

export default function DashboardPage() {
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrText, setQrText] = useState("t.me/gurlan_takm");
  const [qrImage, setQrImage] = useState("");
  const [stats, setStats] = useState({ totalBooks: 0, totalReaders: 0, debtors: 0, todayVisits: 0, totalDebt: 0 });
  const [readers, setReaders] = useState<DashboardReader[]>([]);
  const [visits, setVisits] = useState<DashboardVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classDistribution, setClassDistribution] = useState([0, 0, 0]);
  const [institutionDistribution, setInstitutionDistribution] = useState([0, 0, 0]);

  const loadDashboard = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase sozlamalari topilmadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const [booksResult, readersResult, visitsResult, loansResult] = await Promise.all([
      supabase.from("books").select("id"),
      supabase.from("readers").select("id,full_name,class_name,institution_type").order("full_name"),
      supabase.from("visits").select("id,visit_date,purpose").order("visit_date", { ascending: false }),
      supabase.from("loans").select("reader_id,due_date,status,returned_at"),
    ]);
    const queryError = booksResult.error || readersResult.error || visitsResult.error || loansResult.error;
    if (queryError) {
      setError(`Statistikalarni yuklashda xatolik: ${queryError.message}`);
    } else {
      const loadedReaders = (readersResult.data ?? []) as DashboardReader[];
      const today = new Date().toISOString().slice(0, 10);
      const overdueCounts = (loansResult.data ?? []).reduce<Record<string, number>>((counts, loan) => {
        const overdueLoan = loan as DashboardLoan;
        if (overdueLoan.status === "borrowed" && !overdueLoan.returned_at && overdueLoan.due_date && overdueLoan.due_date < today) {
          counts[overdueLoan.reader_id] = (counts[overdueLoan.reader_id] ?? 0) + 1;
        }
        return counts;
      }, {});
      const readersWithDebt = loadedReaders.map((reader) => ({ ...reader, debt: overdueCounts[reader.id] ?? 0 }));
      const loadedVisits = (visitsResult.data ?? []) as DashboardVisit[];
      setReaders(readersWithDebt.slice(0, 5));
      setVisits(loadedVisits.slice(0, 5));
      const classCounts = [0, 0, 0];
      const institutionCounts = [0, 0, 0];
      loadedReaders.forEach((reader) => {
        const classNumber = Number.parseInt(reader.class_name ?? "", 10);
        if (classNumber >= 1 && classNumber <= 4) classCounts[0] += 1;
        else if (classNumber >= 5 && classNumber <= 9) classCounts[1] += 1;
        else if (classNumber >= 10) classCounts[2] += 1;
        const institutionIndex = ["Maktab", "Texnikum", "Universitet"].indexOf(reader.institution_type);
        if (institutionIndex >= 0) institutionCounts[institutionIndex] += 1;
      });
      setClassDistribution(classCounts);
      setInstitutionDistribution(institutionCounts);
      setStats({
        totalBooks: booksResult.data?.length ?? 0,
        totalReaders: loadedReaders.length,
        debtors: Object.values(overdueCounts).filter((count) => count > 0).length,
        todayVisits: loadedVisits.filter((visit) => visit.visit_date === today).length,
        totalDebt: Object.values(overdueCounts).reduce((sum, count) => sum + count, 0),
      });
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    void (async () => {
      const image = await QRCode.toDataURL("t.me/gurlan_takm", {
        width: 220,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setQrImage(image);
      setQrGenerated(true);
    })();
  }, []);

  async function generateQr() {
    const value = qrText.trim();
    if (!value) return;
    const image = await QRCode.toDataURL(value, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    setQrImage(image);
    setQrGenerated(true);
  }

  function downloadQr() {
    if (!qrImage) return;
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = "smart-hisobot-qr.png";
    link.click();
  }

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
          <input
            className="qr-input"
            value={qrText}
            onChange={(event) => {
              setQrText(event.target.value);
              setQrGenerated(false);
            }}
            placeholder="Matn yoki havola yozing"
            aria-label="QR kod matni"
          />
          {qrImage ? <img className="qr-image" src={qrImage} alt="Yaratilgan QR kod" /> : <div className="qr-box" aria-label="QR kod namunasi" />}
          <button type="button" className="primary-btn qr-btn" onClick={() => { void generateQr(); }} disabled={!qrText.trim()}>
            {qrGenerated ? "QR yangilash" : "QR yaratish"}
          </button>
          {qrImage ? <button type="button" className="secondary-btn qr-btn" onClick={downloadQr}>PNG yuklab olish</button> : null}
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
            <span>Qaytarilmagan kitoblar</span>
            <strong>{loading ? "..." : `${stats.totalDebt} ta`}</strong>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="panel-card">
          <h3>Kitobxonlar statistikasi</h3>
          <div className="chart-box bar-chart">
            <div className="bars">
              {classDistribution.map((count, index) => {
                const max = Math.max(...classDistribution, 1);
                return <span key={index} style={{ height: `${Math.max((count / max) * 100, count ? 8 : 2)}%` }} title={`${count} kitobxon`} />;
              })}
            </div>
          </div>
          <div className="chart-labels">
            <span>1-4 sinf</span>
            <span>5-9 sinf</span>
            <span>10-11 sinf</span>
          </div>
        </div>

        <div className="panel-card">
          <h3>Ta&apos;lim muassasasi bo&apos;yicha</h3>
          <div className="donut-wrap">
            <div className="donut-graph-wrap">
              <div
                className="donut-graph"
                style={{
                  background: (() => {
                    const total = Math.max(institutionDistribution.reduce((sum, count) => sum + count, 0), 1);
                    const schoolEnd = institutionDistribution[0] / total * 100;
                    const collegeEnd = (institutionDistribution[0] + institutionDistribution[1]) / total * 100;
                    return `conic-gradient(#0d83ea 0 ${schoolEnd}%, #f39c12 ${schoolEnd}% ${collegeEnd}%, #2ecb8b ${collegeEnd}% 100%)`;
                  })(),
                }}
              />
              <div className="donut-center">
                <strong>{loading ? "..." : stats.totalReaders.toLocaleString()}</strong>
                <span>Jami</span>
              </div>
            </div>
            <div className="donut-legend">
              <span><i className="dot blue" /> Maktab ({institutionDistribution[0]})</span>
              <span><i className="dot orange" /> Texnikum ({institutionDistribution[1]})</span>
              <span><i className="dot green" /> Universitet ({institutionDistribution[2]})</span>
            </div>
          </div>
        </div>

        <div className="panel-card action-panel">
          <h3>Tezkor amal</h3>
          <Link href="/books" className="quick-btn green">Yangi kitob qo&apos;shish</Link>
          <Link href="/readers" className="quick-btn blue">Kitobxon qo&apos;shish</Link>
          <Link href="/loans" className="quick-btn orange">Kitob berish yoki qaytarish</Link>
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
