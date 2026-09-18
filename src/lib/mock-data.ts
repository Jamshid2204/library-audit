export type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  quantity: number;
  status: string;
};

export type Reader = {
  id: number;
  fullName: string;
  className: string;
  phone: string;
  debt: number;
};

export type Visit = {
  id: number;
  visitorName: string;
  visitDate: string;
  purpose: string;
  notes: string;
};

export const books: Book[] = [
  { id: 1, title: "Python asoslari", author: "Ali Valiyev", category: "Dasturlash", quantity: 8, status: "Mavjud" },
  { id: 2, title: "Oliy matematika", author: "Nargiza Karimova", category: "Fan", quantity: 5, status: "Mavjud" },
  { id: 3, title: "Adabiyot", author: "Sardor Otamurodov", category: "Badiiy", quantity: 10, status: "Mavjud" },
];

export const readers: Reader[] = [
  { id: 1, fullName: "Azizbek Nematov", className: "10-A", phone: "+998901234567", debt: 0 },
  { id: 2, fullName: "Mariam Rustamova", className: "9-B", phone: "+998903456789", debt: 10000 },
];

export const visits: Visit[] = [
  { id: 1, visitorName: "Azizbek Nematov", visitDate: "2025-01-15", purpose: "Kitob tanlash", notes: "Matematika kitobi olindi" },
  { id: 2, visitorName: "Mariam Rustamova", visitDate: "2025-01-16", purpose: "Ulanish", notes: "Adabiyot kitobi o'qildi" },
];

export const dashboardStats = {
  totalBooks: books.length,
  totalReaders: readers.length,
  totalDebt: readers.reduce((sum, reader) => sum + reader.debt, 0),
  todayVisits: visits.length,
};
