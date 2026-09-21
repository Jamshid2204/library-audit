export type Book = {
  id: string;
  inventoryNumber: string;
  title: string;
  author: string;
  category: string;
  book_type: string;
  language: string;
  quantity: number;
  status: string;
};

export type Reader = {
  id: string;
  fullName: string;
  className: string;
  institutionType: "Maktab" | "Texnikum" | "Universitet";
  phone: string;
  debt: number;
};

export type Visit = {
  id: string;
  visitorName: string;
  visitDate: string;
  purpose: string;
  notes: string;
};

export type BookRow = {
  id: string;
  inventory_number: string;
  title: string;
  author: string;
  category: string;
  book_type: string;
  language: string;
  quantity: number;
  status: string;
};

export type ReaderRow = {
  id: string;
  full_name: string;
  class_name: string | null;
  institution_type: "Maktab" | "Texnikum" | "Universitet";
  phone: string | null;
  debt: number;
};

export type VisitRow = {
  id: string;
  visitor_name: string;
  visit_date: string;
  purpose: string;
  notes: string | null;
};

export type Loan = {
  id: string;
  readerId: string;
  bookId: string;
  readerName: string;
  bookTitle: string;
  inventoryNumber: string;
  borrowedAt: string;
  dueDate: string | null;
  returnedAt: string | null;
  status: "borrowed" | "returned";
};
