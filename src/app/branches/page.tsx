"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Branch = { id: string; name: string; created_at: string };
type BranchForm = { name: string; email: string; password: string };

const emptyForm: BranchForm = { name: "", email: "", password: "" };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadBranches = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); setLoading(false); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase.from("branches").select("id,name,created_at").order("name");
    if (queryError) setError(`Filiallarni yuklashda xatolik: ${queryError.message}`);
    else setBranches((data ?? []) as Branch[]);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadBranches(); }, [loadBranches]);

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setError("Filial nomi, email va kamida 6 belgili vaqtinchalik parolni kiriting.");
      return;
    }
    setSaving(true); setError("");
    const { data: branch, error: branchError } = await supabase.from("branches").insert({ name: form.name.trim() }).select("id").single();
    if (branchError || !branch) {
      setError(`Filialni saqlashda xatolik: ${branchError?.message ?? "Noma'lum xatolik"}`);
      setSaving(false);
      return;
    }
    const response = await fetch("/api/branches/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: branch.id, email: form.email, password: form.password }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      await supabase.from("branches").delete().eq("id", branch.id);
      setError(result.error ?? "Filial foydalanuvchisi yaratilmadi.");
    } else {
      setForm(emptyForm);
      await loadBranches();
    }
    setSaving(false);
  }

  async function deleteBranch(branch: Branch) {
    if (!window.confirm("Filialni o'chirishni xohlaysizmi? Filialdagi ma'lumotlar ham o'chishi mumkin.")) return;
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    const { error: deleteError } = await supabase.from("branches").delete().eq("id", branch.id);
    if (deleteError) setError(`Filialni o'chirishda xatolik: ${deleteError.message}`);
    else await loadBranches();
  }

  return (
    <DashboardShell title="Filiallar">
      <div className="settings-grid">
        <form className="panel-card" onSubmit={createBranch}>
          <h3>Yangi filial va login</h3>
          <label>Filial nomi<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Filial login emaili<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Vaqtinchalik parol<input type="password" minLength={6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
          <button type="submit" className="primary-btn" disabled={saving}>{saving ? "Yaratilmoqda..." : "Filial yaratish"}</button>
        </form>
        <div className="panel-card">
          <h3>Filiallar</h3>
          {error ? <p className="data-error" role="alert">{error}</p> : null}
          {loading ? <p>Yuklanmoqda...</p> : branches.length === 0 ? <p>Filiallar topilmadi.</p> : <div className="compact-list">{branches.map((branch) => <div className="compact-list-item" key={branch.id}><strong>{branch.name}</strong><button type="button" className="table-action delete-action" onClick={() => { void deleteBranch(branch); }}>O&apos;chirish</button></div>)}</div>}
        </div>
      </div>
    </DashboardShell>
  );
}
