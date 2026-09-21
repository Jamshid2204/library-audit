alter table public.books
  add column if not exists book_type text not null default 'Umumiy bo''lim';

alter table public.books
  add column if not exists language text not null default 'Lotincha';

alter table public.books
  drop constraint if exists books_book_type_check;

alter table public.books
  add constraint books_book_type_check
  check (book_type in (
    'Badiiy adabiyotlar',
    'Umumiy bo''lim',
    'Falsafa fanlari. Psixologiya',
    'Diniy. Ilohiyot',
    'Ijtimoiy-siyosiy',
    'Tabiiy fanlar va aniq fanlar',
    'Amaliy fanlar',
    'San''at va sport',
    'Adabiyotshunoslik, tilshunoslik, filologiya',
    'Tarix, geografiya',
    'Gazetalar',
    'Jurnallar'
  ));

alter table public.books
  drop constraint if exists books_language_check;

alter table public.books
  add constraint books_language_check
  check (language in ('Kirilcha', 'Lotincha', 'Ruscha', 'Inglizcha'));

notify pgrst, 'reload schema';
