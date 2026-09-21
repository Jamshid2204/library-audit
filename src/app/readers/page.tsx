"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import type { Reader, ReaderRow } from "@/lib/library-types";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ReaderForm = {
  fullName: string;
  institutionType: Reader["institutionType"];
  phone: string;
  email: string;
  address: string;
  age: string;
  gender: Reader["gender"];
  specialty: string;
};

const blank: ReaderForm = { fullName: "", institutionType: "Maktab", phone: "", email: "", address: "", age: "", gender: null, specialty: "" };
const institutionTypes: Reader["institutionType"][] = [
  "Maktab",
  "Texnikum",
  "Universitet",
  "Nafaqada",
  "Oliy ma'lumotli xizmatchi",
  "Boshqalar",
];

type ActiveLoan = {
  reader_id: string;
  due_date: string | null;
  status: "borrowed" | "returned";
  returned_at: string | null;
};

function getOverdueCounts(loans: ActiveLoan[]) {
  const today = new Date().toISOString().slice(0, 10);
  return loans.reduce<Record<string, number>>((counts, loan) => {
    if (loan.status === "borrowed" && !loan.returned_at && loan.due_date && loan.due_date < today) {
      counts[loan.reader_id] = (counts[loan.reader_id] ?? 0) + 1;
    }
    return counts;
  }, {});
}

export default function ReadersPage() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Reader | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadReaders = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi. .env.local faylini tekshiring."); setLoading(false); return; }
    setLoading(true); setError("");
    const [readersResult, loansResult] = await Promise.all([
      supabase.from("readers").select("id,full_name,institution_type,phone,email,address,age,gender,specialty").order("created_at", { ascending: false }),
      supabase.from("loans").select("reader_id,due_date,status,returned_at"),
    ]);
    const queryError = readersResult.error || loansResult.error;
    if (queryError) setError(`Kitobxonlarni yuklashda xatolik: ${queryError.message}`);
    else {
      const overdueCounts = getOverdueCounts((loansResult.data ?? []) as ActiveLoan[]);
      setReaders((readersResult.data as ReaderRow[]).map((reader) => ({
        id: reader.id,
        fullName: reader.full_name,
        institutionType: reader.institution_type,
        phone: reader.phone ?? "",
        email: reader.email ?? "",
        address: reader.address ?? "",
        age: reader.age === null ? null : Number(reader.age),
        gender: reader.gender,
        specialty: reader.specialty ?? "",
        debt: overdueCounts[reader.id] ?? 0,
      })));
    }
    setLoading(false);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadReaders(); }, [loadReaders]);
  const openCreate = () => { setEditing(null); setForm(blank); setDialogOpen(true); setError(""); };
  const openEdit = (reader: Reader) => { setEditing(reader); setForm({ fullName: reader.fullName, institutionType: reader.institutionType, phone: reader.phone, email: reader.email, address: reader.address, age: reader.age === null ? "" : String(reader.age), gender: reader.gender, specialty: reader.specialty }); setDialogOpen(true); setError(""); };
  const close = () => { setDialogOpen(false); setEditing(null); };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    if (!form.fullName.trim()) { setError("F.I.Sh. majburiy."); return; }
    setSaving(true); setError("");
    const parsedAge = form.age.trim() ? Number(form.age) : null;
    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120)) { setError("Yosh 0 dan 120 gacha bo'lgan butun son bo'lishi kerak."); return; }
    const payload = { full_name: form.fullName.trim(), institution_type: form.institutionType, phone: form.phone.trim() || null, email: form.email.trim() || null, address: form.address.trim() || null, age: parsedAge, gender: form.gender || null, specialty: form.specialty.trim() || null };
    const result = editing ? await supabase.from("readers").update(payload).eq("id", editing.id) : await supabase.from("readers").insert(payload);
    if (result.error) setError(`Kitobxonni saqlashda xatolik: ${result.error.message}`); else { close(); await loadReaders(); }
    setSaving(false);
  }
  async function remove(reader: Reader) {
    if (!window.confirm("Ushbu kitobxonni o'chirishni xohlaysizmi?")) return;
    const supabase = getSupabaseClient(); if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    const { error: deleteError } = await supabase.from("readers").delete().eq("id", reader.id);
    if (deleteError) setError(`Kitobxonni o'chirishda xatolik: ${deleteError.message}`); else await loadReaders();
  }
  return <DashboardShell title="Kitobxonlar"><div className="panel-card table-panel"><div className="panel-header"><h3>Kitobxonlar</h3><button type="button" className="primary-btn" onClick={openCreate}>+ Kitobxon qo&apos;shish</button></div>{error && <p className="data-error" role="alert">{error}</p>}<div className="table-wrap"><table><thead><tr><th>F.I.Sh.</th><th>Muassasa</th><th>Yosh</th><th>Jins</th><th>Mutaxassislik</th><th>Telefon</th><th>Email</th><th>Manzil</th><th>Qarz (kitob)</th><th>Amallar</th></tr></thead><tbody>{loading ? <tr><td colSpan={10} className="table-state">Yuklanmoqda...</td></tr> : readers.length === 0 ? <tr><td colSpan={10} className="table-state">Kitobxonlar topilmadi.</td></tr> : readers.map((reader) => (<tr key={reader.id}><td>{reader.fullName}</td><td>{reader.institutionType}</td><td>{reader.age ?? "—"}</td><td>{reader.gender ?? "—"}</td><td>{reader.specialty || "—"}</td><td>{reader.phone}</td><td>{reader.email}</td><td>{reader.address}</td><td>{reader.debt} ta</td><td><button type="button" className="table-action edit-action" onClick={() => openEdit(reader)}>Tahrirlash</button><button type="button" className="table-action delete-action" onClick={() => { void remove(reader); }}>O&apos;chirish</button></td></tr>))}</tbody></table></div></div>{dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><form className="data-dialog" onSubmit={save}><h3>{editing ? "Kitobxonni tahrirlash" : "Yangi kitobxon"}</h3><label>F.I.Sh.<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label>Ta&apos;lim muassasasi<select value={form.institutionType} onChange={(e) => setForm({ ...form, institutionType: e.target.value as Reader["institutionType"] })}>{institutionTypes.map((institutionType) => <option key={institutionType} value={institutionType}>{institutionType}</option>)}</select></label><label>Yosh<input type="number" min="0" max="120" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label><label>Jins<select value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: (e.target.value || null) as Reader["gender"] })}><option value="">Tanlanmagan</option><option value="Erkak">Erkak</option><option value="Ayol">Ayol</option></select></label><label>Mutaxassisligi<input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Masalan: o'qituvchi, shifokor" /></label><label>Telefon<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Manzil<textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} /></label><div className="dialog-actions"><button type="button" className="secondary-btn" onClick={close}>Bekor qilish</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button></div></form></div>}</DashboardShell>;
}
