"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import type { Visit, VisitRow } from "@/lib/library-types";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ReaderOption = {
  id: string;
  full_name: string;
};

const blank = { visitorName: "", visitDate: new Date().toISOString().slice(0, 10), purpose: "", notes: "" };

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [readers, setReaders] = useState<ReaderOption[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadVisits = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi. .env.local faylini tekshiring."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data, error: queryError } = await supabase.from("visits").select("id,visitor_name,visit_date,purpose,notes").order("visit_date", { ascending: false });
    if (queryError) setError(`Qatnovlarni yuklashda xatolik: ${queryError.message}`);
    else setVisits((data as VisitRow[]).map((visit) => ({ id: visit.id, visitorName: visit.visitor_name, visitDate: visit.visit_date, purpose: visit.purpose, notes: visit.notes ?? "" })));
    setLoading(false);
  }, []);
  const loadReaders = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data, error: queryError } = await supabase
      .from("readers")
      .select("id,full_name")
      .order("full_name", { ascending: true });
    if (queryError) {
      setError(`Kitobxonlarni yuklashda xatolik: ${queryError.message}`);
    } else {
      setReaders((data ?? []) as ReaderOption[]);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadVisits(); }, [loadVisits]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadReaders(); }, [loadReaders]);
  const openCreate = () => { setEditing(null); setForm(blank); setDialogOpen(true); setError(""); };
  const openEdit = (visit: Visit) => { setEditing(visit); setForm({ visitorName: visit.visitorName, visitDate: visit.visitDate, purpose: visit.purpose, notes: visit.notes }); setDialogOpen(true); setError(""); };
  const close = () => { setDialogOpen(false); setEditing(null); };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    if (!form.visitorName.trim() || !form.visitDate || !form.purpose.trim()) { setError("F.I.Sh., sana va maqsad majburiy."); return; }
    if (!editing && !readers.some((reader) => reader.full_name === form.visitorName.trim())) {
      setError("Ro'yxatdan kitobxonni tanlang.");
      return;
    }
    setSaving(true); setError("");
    const payload = { visitor_name: form.visitorName.trim(), visit_date: form.visitDate, purpose: form.purpose.trim(), notes: form.notes.trim() || null };
    const result = editing ? await supabase.from("visits").update(payload).eq("id", editing.id) : await supabase.from("visits").insert(payload);
    if (result.error) setError(`Qatnovni saqlashda xatolik: ${result.error.message}`); else { close(); await loadVisits(); }
    setSaving(false);
  }
  async function remove(visit: Visit) {
    if (!window.confirm("Ushbu qatnovni o'chirishni xohlaysizmi?")) return;
    const supabase = getSupabaseClient(); if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    const { error: deleteError } = await supabase.from("visits").delete().eq("id", visit.id);
    if (deleteError) setError(`Qatnovni o'chirishda xatolik: ${deleteError.message}`); else await loadVisits();
  }
  return <DashboardShell title="Qatnov"><div className="panel-card table-panel"><div className="panel-header"><h3>Qatnovlar</h3><button type="button" className="primary-btn" onClick={openCreate}>+ Qatnov yozish</button></div>{error && <p className="data-error" role="alert">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Sana</th><th>F.I.Sh.</th><th>Maqsad</th><th>Qayd</th><th>Amallar</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="table-state">Yuklanmoqda...</td></tr> : visits.length === 0 ? <tr><td colSpan={5} className="table-state">Qatnovlar topilmadi.</td></tr> : visits.map((visit) => (<tr key={visit.id}><td>{visit.visitDate}</td><td>{visit.visitorName}</td><td>{visit.purpose}</td><td>{visit.notes}</td><td><button type="button" className="table-action edit-action" onClick={() => openEdit(visit)}>Tahrirlash</button><button type="button" className="table-action delete-action" onClick={() => { void remove(visit); }}>O&apos;chirish</button></td></tr>))}</tbody></table></div></div>{dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><form className="data-dialog" onSubmit={save}><h3>{editing ? "Qatnovni tahrirlash" : "Yangi qatnov"}</h3><label>F.I.Sh.<input list="reader-options" value={form.visitorName} onChange={(event) => setForm({ ...form, visitorName: event.target.value })} placeholder="Kitobxon nomini yozing yoki tanlang" required /><datalist id="reader-options">{readers.map((reader) => <option key={reader.id} value={reader.full_name} />)}{editing && !readers.some((reader) => reader.full_name === editing.visitorName) ? <option value={editing.visitorName} /> : null}</datalist></label><label>Sana<input type="date" value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} required /></label><label>Maqsad<input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required /></label><label>Qayd<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></label><div className="dialog-actions"><button type="button" className="secondary-btn" onClick={close}>Bekor qilish</button><button type="submit" className="primary-btn" disabled={saving || readers.length === 0}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button></div></form></div>}</DashboardShell>;
}
