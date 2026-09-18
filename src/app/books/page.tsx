"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import type { Book, BookRow } from "@/lib/library-types";
import { FormEvent, useCallback, useEffect, useState } from "react";

const emptyBook = { title: "", author: "", category: "Umumiy", quantity: "0", status: "Mavjud" };

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [form, setForm] = useState(emptyBook);
  const [editing, setEditing] = useState<Book | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadBooks = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi. .env.local faylini tekshiring."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data, error: queryError } = await supabase.from("books").select("id,title,author,category,quantity,status").order("created_at", { ascending: false });
    if (queryError) setError(`Kitoblarni yuklashda xatolik: ${queryError.message}`);
    else setBooks((data as BookRow[]).map((book) => ({ ...book, quantity: Number(book.quantity) })));
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadBooks(); }, [loadBooks]);

  const openCreate = () => { setEditing(null); setForm(emptyBook); setDialogOpen(true); setError(""); };
  const openEdit = (book: Book) => { setEditing(book); setForm({ ...book, quantity: String(book.quantity) }); setDialogOpen(true); setError(""); };
  const closeForm = () => { setEditing(null); setDialogOpen(false); setForm(emptyBook); };

  async function saveBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    if (!form.title.trim() || !form.author.trim()) { setError("Nom va muallif majburiy."); return; }
    setSaving(true); setError("");
    const payload = { title: form.title.trim(), author: form.author.trim(), category: form.category.trim() || "Umumiy", quantity: Math.max(0, Number(form.quantity) || 0), status: form.status.trim() || "Mavjud" };
    const result = editing
      ? await supabase.from("books").update(payload).eq("id", editing.id)
      : await supabase.from("books").insert(payload);
    if (result.error) setError(`Kitobni saqlashda xatolik: ${result.error.message}`);
    else { closeForm(); await loadBooks(); }
    setSaving(false);
  }

  async function deleteBook(book: Book) {
    if (!window.confirm("Ushbu kitobni o'chirishni xohlaysizmi?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    setError("");
    const { error: deleteError } = await supabase.from("books").delete().eq("id", book.id);
    if (deleteError) setError(`Kitobni o'chirishda xatolik: ${deleteError.message}`);
    else await loadBooks();
  }

  return <DashboardShell title="Kitoblar">
    <div className="panel-card table-panel">
      <div className="panel-header"><h3>Kitoblar ro&apos;yxati</h3><button type="button" className="primary-btn" onClick={openCreate}>Yangi kitob</button></div>
      {error && <p className="data-error" role="alert">{error}</p>}
      <div className="table-wrap"><table><thead><tr><th>Nom</th><th>Muallif</th><th>Kategoriya</th><th>Soni</th><th>Holat</th><th>Amallar</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={6} className="table-state">Yuklanmoqda...</td></tr> : books.length === 0 ? <tr><td colSpan={6} className="table-state">Kitoblar topilmadi.</td></tr> : books.map((book) => (<tr key={book.id}><td>{book.title}</td><td>{book.author}</td><td>{book.category}</td><td>{book.quantity}</td><td>{book.status}</td><td><button type="button" className="table-action edit-action" onClick={() => openEdit(book)}>Tahrirlash</button><button type="button" className="table-action delete-action" onClick={() => { void deleteBook(book); }}>O&apos;chirish</button></td></tr>))}</tbody>
      </table></div>
    </div>
    {dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><form className="data-dialog" onSubmit={saveBook}><h3>{editing ? "Kitobni tahrirlash" : "Yangi kitob"}</h3><label>Nom<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label><label>Muallif<input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required /></label><label>Kategoriya<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>Soni<input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label><label>Holat<input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} /></label><div className="dialog-actions"><button type="button" className="secondary-btn" onClick={closeForm}>Bekor qilish</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button></div></form></div>}
  </DashboardShell>;
}
