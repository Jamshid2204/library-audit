-- Run this migration in the Supabase SQL Editor.
-- Existing rows receive a generated inventory number.

alter table public.books
  add column if not exists inventory_number text;

update public.books
set inventory_number = 'INV-' || left(replace(id::text, '-', ''), 8)
where inventory_number is null or btrim(inventory_number) = '';

alter table public.books
  alter column inventory_number set not null;

create unique index if not exists books_inventory_number_idx
  on public.books(inventory_number);

update public.books
set status = case when quantity > 0 then 'Mavjud' else 'Mavjud emas' end;

notify pgrst, 'reload schema';
