"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import type { Reader, ReaderRow } from "@/lib/library-types";
import { FormEvent, useCallback, useEffect, useState } from "react";

const blank = { fullName: "", className: "", phone: "", debt: "0" };

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
    const { data, error: queryError } = await supabase.from("readers").select("id,full_name,class_name,phone,debt").order("created_at", { ascending: false });
    if (queryError) setError(`Kitobxonlarni yuklashda xatolik: ${queryError.message}`);
    else setReaders((data as ReaderRow[]).map((reader) => ({ id: reader.id, fullName: reader.full_name, className: reader.class_name ?? "", phone: reader.phone ?? "", debt: Number(reader.debt) })));
    setLoading(false);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadReaders(); }, [loadReaders]);
  const openCreate = () => { setEditing(null); setForm(blank); setDialogOpen(true); setError(""); };
  const openEdit = (reader: Reader) => { setEditing(reader); setForm({ fullName: reader.fullName, className: reader.className, phone: reader.phone, debt: String(reader.debt) }); setDialogOpen(true); setError(""); };
  const close = () => { setDialogOpen(false); setEditing(null); };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    if (!form.fullName.trim()) { setError("F.I.Sh. majburiy."); return; }
    setSaving(true); setError("");
    const payload = { full_name: form.fullName.trim(), class_name: form.className.trim() || null, phone: form.phone.trim() || null, debt: Number(form.debt) || 0 };
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
  return <DashboardShell title="Kitobxonlar"><div className="panel-card table-panel"><div className="panel-header"><h3>Kitobxonlar</h3><button type="button" className="primary-btn" onClick={openCreate}>+ Kitobxon qo&apos;shish</button></div>{error && <p className="data-error" role="alert">{error}</p>}<div className="table-wrap"><table><thead><tr><th>F.I.Sh.</th><th>Sinf</th><th>Telefon</th><th>Qarz</th><th>Amallar</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="table-state">Yuklanmoqda...</td></tr> : readers.length === 0 ? <tr><td colSpan={5} className="table-state">Kitobxonlar topilmadi.</td></tr> : readers.map((reader) => (<tr key={reader.id}><td>{reader.fullName}</td><td>{reader.className}</td><td>{reader.phone}</td><td>{reader.debt.toLocaleString()} so&apos;m</td><td><button type="button" className="table-action edit-action" onClick={() => openEdit(reader)}>Tahrirlash</button><button type="button" className="table-action delete-action" onClick={() => { void remove(reader); }}>O&apos;chirish</button></td></tr>))}</tbody></table></div></div>{dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><form className="data-dialog" onSubmit={save}><h3>{editing ? "Kitobxonni tahrirlash" : "Yangi kitobxon"}</h3><label>F.I.Sh.<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label>Sinf<input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} /></label><label>Telefon<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Qarz<input type="number" min="0" value={form.debt} onChange={(e) => setForm({ ...form, debt: e.target.value })} /></label><div className="dialog-actions"><button type="button" className="secondary-btn" onClick={close}>Bekor qilish</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button></div></form></div>}</DashboardShell>;
}
