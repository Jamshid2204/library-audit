export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  quantity: number;
  status: string;
};

export type Reader = {
  id: string;
  fullName: string;
  className: string;
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
  title: string;
  author: string;
  category: string;
  quantity: number;
  status: string;
};

export type ReaderRow = {
  id: string;
  full_name: string;
  class_name: string | null;
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
