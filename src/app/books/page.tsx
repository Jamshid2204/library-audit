"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import type { Book, BookRow } from "@/lib/library-types";
import { FormEvent, useCallback, useEffect, useState } from "react";

const bookTypes = [
  "Badiiy adabiyotlar", "Umumiy bo'lim", "Falsafa fanlari. Psixologiya", "Diniy. Ilohiyot",
  "Ijtimoiy-siyosiy", "Tabiiy fanlar va aniq fanlar", "Amaliy fanlar", "San'at va sport",
  "Adabiyotshunoslik, tilshunoslik, filologiya", "Tarix, geografiya", "Gazetalar", "Jurnallar",
];
const languages = ["Kirilcha", "Lotincha", "Ruscha", "Inglizcha"];
const emptyBook = { inventory_number: "", title: "", author: "", category: "Umumiy", book_type: "Umumiy bo'lim", language: "Lotincha", quantity: "0", status: "Mavjud" };
const quantityStatus = (quantity: string) => (Math.max(0, Number(quantity) || 0) > 0 ? "Mavjud" : "Mavjud emas");

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
    const { data, error: queryError } = await supabase.from("books").select("id,inventory_number,title,author,category,book_type,language,quantity,status").order("created_at", { ascending: false });
    if (queryError) setError(`Kitoblarni yuklashda xatolik: ${queryError.message}`);
    else setBooks((data as BookRow[]).map((book) => ({
      id: book.id,
      inventoryNumber: book.inventory_number,
      title: book.title,
      author: book.author,
      category: book.category,
      book_type: book.book_type,
      language: book.language,
      quantity: Number(book.quantity),
      status: book.status,
    })));
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadBooks(); }, [loadBooks]);

  const openCreate = () => { setEditing(null); setForm(emptyBook); setDialogOpen(true); setError(""); };
  const openEdit = (book: Book) => { setEditing(book); setForm({ inventory_number: book.inventoryNumber, title: book.title, author: book.author, category: book.category, book_type: book.book_type, language: book.language, quantity: String(book.quantity), status: book.status }); setDialogOpen(true); setError(""); };
  const closeForm = () => { setEditing(null); setDialogOpen(false); setForm(emptyBook); };

  async function saveBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    if (!form.title.trim() || !form.author.trim()) { setError("Nom va muallif majburiy."); return; }
    setSaving(true); setError("");
    if (!form.inventory_number.trim()) { setError("Inventar raqami majburiy."); return; }
    const quantity = Math.max(0, Number(form.quantity) || 0);
    const payload = { inventory_number: form.inventory_number.trim(), title: form.title.trim(), author: form.author.trim(), category: form.book_type, book_type: form.book_type, language: form.language, quantity, status: quantity > 0 ? "Mavjud" : "Mavjud emas" };
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
      <div className="table-wrap"><table><thead><tr><th>Inventar raqami</th><th>Nom</th><th>Muallif</th><th>Turi</th><th>Tili</th><th>Soni</th><th>Holat</th><th>Amallar</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={8} className="table-state">Yuklanmoqda...</td></tr> : books.length === 0 ? <tr><td colSpan={8} className="table-state">Kitoblar topilmadi.</td></tr> : books.map((book) => (<tr key={book.id}><td>{book.inventoryNumber}</td><td>{book.title}</td><td>{book.author}</td><td>{book.book_type}</td><td>{book.language}</td><td>{book.quantity}</td><td>{book.status}</td><td><button type="button" className="table-action edit-action" onClick={() => openEdit(book)}>Tahrirlash</button><button type="button" className="table-action delete-action" onClick={() => { void deleteBook(book); }}>O&apos;chirish</button></td></tr>))}</tbody>
      </table></div>
    </div>
    {dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><form className="data-dialog" onSubmit={saveBook}><h3>{editing ? "Kitobni tahrirlash" : "Yangi kitob"}</h3><label>Inventar raqami<input value={form.inventory_number} onChange={(e) => setForm({ ...form, inventory_number: e.target.value })} required /></label><label>Nom<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label><label>Muallif<input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required /></label><label>Turi<select value={form.book_type} onChange={(e) => setForm({ ...form, book_type: e.target.value })}>{bookTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label>Tili<select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>{languages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label><label>Soni<input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label><label>Holat<input value={quantityStatus(form.quantity)} readOnly /></label><div className="dialog-actions"><button type="button" className="secondary-btn" onClick={closeForm}>Bekor qilish</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button></div></form></div>}
  </DashboardShell>;
}
