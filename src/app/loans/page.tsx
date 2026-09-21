"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSupabaseClient } from "@/lib/supabase";
import type { BookRow, Loan, ReaderRow } from "@/lib/library-types";
import { FormEvent, useCallback, useEffect, useState } from "react";

type LoanRow = {
  id: string;
  reader_id: string;
  book_id: string;
  borrowed_at: string;
  due_date: string | null;
  returned_at: string | null;
  status: "borrowed" | "returned";
  readers: { full_name: string } | { full_name: string }[] | null;
  books: { title: string; inventory_number: string } | { title: string; inventory_number: string }[] | null;
};
type SelectBook = Pick<BookRow, "id" | "title" | "author" | "quantity" | "inventory_number">;
type SelectReader = Pick<ReaderRow, "id" | "full_name">;

const getDefaultDueDate = () => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);
  return dueDate.toISOString().slice(0, 10);
};

const emptyForm = { readerId: "", bookId: "", dueDate: getDefaultDueDate() };

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [readers, setReaders] = useState<SelectReader[]>([]);
  const [books, setBooks] = useState<SelectBook[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [returning, setReturning] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase sozlamalari topilmadi. .env.local faylini tekshiring.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const [loansResult, readersResult, booksResult] = await Promise.all([
      supabase.from("loans").select("id,reader_id,book_id,borrowed_at,due_date,returned_at,status,readers(full_name),books(title,inventory_number)").order("borrowed_at", { ascending: false }),
      supabase.from("readers").select("id,full_name").order("full_name"),
      supabase.from("books").select("id,title,author,quantity,inventory_number").order("title"),
    ]);
    const queryError = loansResult.error || readersResult.error || booksResult.error;
    if (queryError) {
      const missingLoansTable = queryError.message.includes("public.loans") &&
        queryError.message.includes("schema cache");
      setError(missingLoansTable
        ? " loans jadvali Supabase bazasida topilmadi. database/loans-migration.sql faylini Supabase SQL Editor'da ishga tushiring, so'ng sahifani yangilang."
        : `Ma'lumotlarni yuklashda xatolik: ${queryError.message}`);
    } else {
      setLoans(((loansResult.data ?? []) as LoanRow[]).map((row) => ({
        id: row.id,
        readerId: row.reader_id,
        bookId: row.book_id,
        readerName: (Array.isArray(row.readers) ? row.readers[0]?.full_name : row.readers?.full_name) ?? "Noma'lum kitobxon",
        bookTitle: (Array.isArray(row.books) ? row.books[0]?.title : row.books?.title) ?? "Noma'lum kitob",
        inventoryNumber: (Array.isArray(row.books) ? row.books[0]?.inventory_number : row.books?.inventory_number) ?? "—",
        borrowedAt: row.borrowed_at,
        dueDate: row.due_date,
        returnedAt: row.returned_at,
        status: row.status,
      })));
      setReaders((readersResult.data ?? []) as SelectReader[]);
      setBooks((booksResult.data ?? []).map((book) => ({ ...(book as SelectBook), quantity: Number(book.quantity) })));
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);

  const closeDialog = () => { setDialogOpen(false); setEditingLoan(null); setForm({ ...emptyForm, dueDate: getDefaultDueDate() }); };

  function openCreateDialog() {
    setError("");
    setEditingLoan(null);
    setForm({ ...emptyForm, dueDate: getDefaultDueDate() });
    setDialogOpen(true);
  }

  function openEditDialog(loan: Loan) {
    setError("");
    setEditingLoan(loan);
    setForm({ readerId: loan.readerId, bookId: loan.bookId, dueDate: loan.dueDate ?? "" });
    setDialogOpen(true);
  }

  async function createLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    if (editingLoan) {
      setSaving(true); setError("");
      const { error: updateError } = await supabase.from("loans").update({ due_date: form.dueDate || null })
        .eq("id", editingLoan.id);
      if (updateError) setError(`Berilgan kitobni tahrirlashda xatolik: ${updateError.message}`);
      else { closeDialog(); await loadData(); }
      setSaving(false);
      return;
    }
    const book = books.find((item) => item.id === form.bookId);
    if (!form.readerId || !book) { setError("Kitobxon va kitobni tanlang."); return; }
    if (book.quantity < 1) { setError("Bu kitobning mavjud nusxasi qolmagan."); return; }
    setSaving(true); setError("");
    const { data: changedBook, error: bookError } = await supabase.from("books")
      .update({ quantity: book.quantity - 1, status: book.quantity - 1 > 0 ? "Mavjud" : "Mavjud emas" }).eq("id", book.id).eq("quantity", book.quantity).select("id").maybeSingle();
    if (bookError || !changedBook) {
      setError(bookError ? `Kitob sonini yangilashda xatolik: ${bookError.message}` : "Kitob nusxasi boshqa xodim tomonidan berib yuborilgan. Qaytadan urinib ko'ring.");
      setSaving(false); await loadData(); return;
    }

    const { error: loanError } = await supabase.from("loans").insert({
      reader_id: form.readerId, book_id: book.id, due_date: form.dueDate || null, status: "borrowed",
    });
    if (loanError) {
      await supabase.from("books").update({ quantity: book.quantity, status: "Mavjud" }).eq("id", book.id).eq("quantity", book.quantity - 1);
      setError(`Kitob berishni saqlashda xatolik: ${loanError.message}`);
    } else {
      closeDialog();
      await loadData();
    }
    setSaving(false);
  }

  async function deleteLoan(loan: Loan) {
    if (!window.confirm("Ushbu berilgan kitob yozuvini o'chirishni xohlaysizmi?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    setError("");
    const book = books.find((item) => item.id === loan.bookId);
    if (loan.status === "borrowed" && !book) {
      setError("Kitob topilmadi, yozuvni o'chirib bo'lmaydi.");
      return;
    }
    setReturning(loan.id);
    if (loan.status === "borrowed" && book) {
      const { data: changedBook, error: bookError } = await supabase.from("books")
      .update({ quantity: book.quantity + 1, status: "Mavjud" }).eq("id", book.id).eq("quantity", book.quantity).select("id").maybeSingle();
      if (bookError || !changedBook) {
        setError(bookError ? `Kitob sonini yangilashda xatolik: ${bookError.message}` : "Kitob soni o'zgargan. Qaytadan urinib ko'ring.");
        setReturning(null);
        await loadData();
        return;
      }
    }
    const { error: deleteError } = await supabase.from("loans").delete().eq("id", loan.id);
    if (deleteError) {
      if (loan.status === "borrowed" && book) {
        await supabase.from("books").update({ quantity: book.quantity, status: book.quantity > 0 ? "Mavjud" : "Mavjud emas" }).eq("id", book.id).eq("quantity", book.quantity + 1);
      }
      setError(`Berilgan kitobni o'chirishda xatolik: ${deleteError.message}`);
    } else {
      await loadData();
    }
    setReturning(null);
  }

  async function returnLoan(loan: Loan) {
    if (loan.status !== "borrowed") return;
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Supabase sozlamalari topilmadi."); return; }
    setReturning(loan.id); setError("");
    const book = books.find((item) => item.id === loan.bookId);
    if (!book) { setError("Kitob topilmadi, qaytarishni amalga oshirib bo'lmaydi."); setReturning(null); return; }
    const { data: changedBook, error: bookError } = await supabase.from("books")
    .update({ quantity: book.quantity + 1, status: "Mavjud" }).eq("id", book.id).eq("quantity", book.quantity).select("id").maybeSingle();
    if (bookError || !changedBook) {
      setError(bookError ? `Kitob sonini yangilashda xatolik: ${bookError.message}` : "Kitob soni o'zgargan. Qaytadan urinib ko'ring.");
      setReturning(null); await loadData(); return;
    }
    const { data: changedLoan, error: loanError } = await supabase.from("loans")
      .update({ status: "returned", returned_at: new Date().toISOString() })
      .eq("id", loan.id).eq("status", "borrowed").is("returned_at", null).select("id").maybeSingle();
    if (loanError || !changedLoan) {
      await supabase.from("books").update({ quantity: book.quantity, status: book.quantity > 0 ? "Mavjud" : "Mavjud emas" }).eq("id", book.id).eq("quantity", book.quantity + 1);
      setError(loanError ? `Qaytarishni saqlashda xatolik: ${loanError.message}` : "Bu kitob allaqachon qaytarilgan.");
    } else {
      await loadData();
    }
    setReturning(null);
  }

  return (
    <DashboardShell title="Berilgan kitoblar">
      <div className="panel-card table-panel">
        <div className="panel-header"><h3>Qarzga berilgan kitoblar</h3><button type="button" className="primary-btn" onClick={openCreateDialog}>+ Kitob berish</button></div>
        {error && <p className="data-error" role="alert">{error}</p>}
        <div className="table-wrap"><table><thead><tr><th>Kitobxon</th><th>Inventar raqami</th><th>Kitob</th><th>Berilgan sana</th><th>Qaytarish muddati</th><th>Holat</th><th>Amal</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={7} className="table-state">Yuklanmoqda...</td></tr> : loans.length === 0 ? <tr><td colSpan={7} className="table-state">Hozircha berilgan kitoblar yo&apos;q.</td></tr> : loans.map((loan) => (
            <tr key={loan.id}><td>{loan.readerName}</td><td>{loan.inventoryNumber}</td><td>{loan.bookTitle}</td><td>{new Date(loan.borrowedAt).toLocaleDateString("uz-UZ")}</td><td>{loan.dueDate ? new Date(`${loan.dueDate}T00:00:00`).toLocaleDateString("uz-UZ") : "—"}</td><td>{loan.status === "returned" ? "Qaytarilgan" : "Berilgan"}</td><td><div className="table-actions">{loan.status === "borrowed" ? <><button type="button" className="table-action edit-action" disabled={returning === loan.id} onClick={() => { void returnLoan(loan); }}>{returning === loan.id ? "Saqlanmoqda..." : "Qaytarish"}</button><button type="button" className="table-action edit-action" disabled={returning === loan.id} onClick={() => openEditDialog(loan)}>Tahrirlash</button></> : <button type="button" className="table-action edit-action" disabled={returning === loan.id} onClick={() => openEditDialog(loan)}>Ko&apos;rish/tahrirlash</button>}<button type="button" className="table-action delete-action" disabled={returning === loan.id} onClick={() => { void deleteLoan(loan); }}>O&apos;chirish</button></div></td></tr>
          ))}</tbody>
        </table></div>
      </div>
      {dialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}><form className="data-dialog" onSubmit={createLoan}>
        <h3>{editingLoan ? "Berilgan kitobni tahrirlash" : "Kitob berish"}</h3>
        {!editingLoan ? <><label>Kitobxon<select value={form.readerId} onChange={(event) => setForm({ ...form, readerId: event.target.value })} required><option value="">Tanlang...</option>{readers.map((reader) => <option key={reader.id} value={reader.id}>{reader.full_name}</option>)}</select></label>
        <label>Kitob<select value={form.bookId} onChange={(event) => setForm({ ...form, bookId: event.target.value })} required><option value="">Tanlang...</option>{books.map((book) => <option key={book.id} value={book.id} disabled={book.quantity < 1}>{book.inventory_number} — {book.title} — {book.author} ({book.quantity} dona)</option>)}</select></label></> : <p>{editingLoan.readerName} — {editingLoan.inventoryNumber} — {editingLoan.bookTitle}</p>}
        <label>Qaytarish muddati<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} min={new Date().toISOString().slice(0, 10)} /></label>
        <div className="dialog-actions"><button type="button" className="secondary-btn" onClick={closeDialog}>Bekor qilish</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Saqlanmoqda..." : editingLoan ? "Saqlash" : "Berish"}</button></div>
      </form></div>}
    </DashboardShell>
  );
}
