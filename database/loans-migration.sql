-- Run this migration in the Supabase SQL Editor.
-- It is safe to run more than once.

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.readers(id) on delete restrict,
  book_id uuid not null references public.books(id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_date date,
  returned_at timestamptz,
  status text not null default 'borrowed'
    check (status in ('borrowed', 'returned')),
  created_at timestamptz not null default now(),
  constraint returned_loans_have_return_date check (
    (status = 'returned' and returned_at is not null)
    or (status = 'borrowed' and returned_at is null)
  )
);

create index if not exists loans_status_idx on public.loans(status);
create index if not exists loans_reader_id_idx on public.loans(reader_id);
create index if not exists loans_book_id_idx on public.loans(book_id);

alter table public.loans enable row level security;

drop policy if exists "Authenticated users can view loans" on public.loans;
drop policy if exists "Authenticated users can create loans" on public.loans;
drop policy if exists "Authenticated users can return loans" on public.loans;
drop policy if exists "Authenticated users can delete loans" on public.loans;

create policy "Authenticated users can view loans" on public.loans
  for select to authenticated using (true);

create policy "Authenticated users can create loans" on public.loans
  for insert to authenticated with check (true);

create policy "Authenticated users can return loans" on public.loans
  for update to authenticated
  using (true)
  with check (
    status in ('borrowed', 'returned')
    and (
      (status = 'returned' and returned_at is not null)
      or (status = 'borrowed' and returned_at is null)
    )
  );

create policy "Authenticated users can delete loans" on public.loans
  for delete to authenticated using (true);

-- Refresh PostgREST's schema cache after creating the table.
notify pgrst, 'reload schema';
