-- Run this migration in the Supabase SQL Editor.
-- It adds branch isolation and branch management for the library.

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.profiles
  add column if not exists role text not null default 'admin';

alter table public.books add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.readers add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.visits add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.events add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.reports add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.loans add column if not exists branch_id uuid references public.branches(id) on delete restrict;

create index if not exists books_branch_id_idx on public.books(branch_id);
create index if not exists readers_branch_id_idx on public.readers(branch_id);
create index if not exists visits_branch_id_idx on public.visits(branch_id);
create index if not exists reports_branch_id_idx on public.reports(branch_id);
create index if not exists loans_branch_id_idx on public.loans(branch_id);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    true
  );
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select branch_id from public.profiles where id = auth.uid();
$$;

create or replace function public.assign_current_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and new.branch_id is null then
    new.branch_id := public.current_branch_id();
  end if;
  return new;
end;
$$;

drop trigger if exists set_books_branch on public.books;
create trigger set_books_branch before insert on public.books
for each row execute function public.assign_current_branch();
drop trigger if exists set_readers_branch on public.readers;
create trigger set_readers_branch before insert on public.readers
for each row execute function public.assign_current_branch();
drop trigger if exists set_visits_branch on public.visits;
create trigger set_visits_branch before insert on public.visits
for each row execute function public.assign_current_branch();
drop trigger if exists set_events_branch on public.events;
create trigger set_events_branch before insert on public.events
for each row execute function public.assign_current_branch();
drop trigger if exists set_reports_branch on public.reports;
create trigger set_reports_branch before insert on public.reports
for each row execute function public.assign_current_branch();
drop trigger if exists set_loans_branch on public.loans;
create trigger set_loans_branch before insert on public.loans
for each row execute function public.assign_current_branch();

alter table public.branches enable row level security;

drop policy if exists "Authenticated users can view branches" on public.branches;
drop policy if exists "Admins can manage branches" on public.branches;
create policy "Authenticated users can view branches" on public.branches
  for select to authenticated using (public.is_admin() or id = public.current_branch_id());
create policy "Admins can manage branches" on public.branches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

do $$
declare
  table_name text;
begin
  foreach table_name in array array['books', 'readers', 'visits', 'events', 'reports', 'loans']
  loop
    execute format('drop policy if exists "Authenticated users can manage %s" on public.%I', table_name, table_name);
    execute format('drop policy if exists "Authenticated users can view loans" on public.%I', table_name);
    execute format('drop policy if exists "Authenticated users can create loans" on public.%I', table_name);
    execute format('drop policy if exists "Authenticated users can return loans" on public.%I', table_name);
    execute format('drop policy if exists "Authenticated users can delete loans" on public.%I', table_name);
  end loop;
end $$;

create policy "Branch users can view books" on public.books for select to authenticated
  using (public.is_admin() or branch_id = public.current_branch_id() or (branch_id is null and public.current_branch_id() is null));
create policy "Branch users can insert books" on public.books for insert to authenticated
  with check (public.is_admin() or branch_id = public.current_branch_id());
create policy "Branch users can update books" on public.books for update to authenticated
  using (public.is_admin() or branch_id = public.current_branch_id())
  with check (public.is_admin() or branch_id = public.current_branch_id());
create policy "Branch users can delete books" on public.books for delete to authenticated
  using (public.is_admin() or branch_id = public.current_branch_id());

create policy "Branch users can manage readers" on public.readers for all to authenticated
  using (public.is_admin() or branch_id = public.current_branch_id() or (branch_id is null and public.current_branch_id() is null))
  with check (public.is_admin() or branch_id = public.current_branch_id());
create policy "Branch users can manage visits" on public.visits for all to authenticated
  using (public.is_admin() or branch_id = public.current_branch_id() or (branch_id is null and public.current_branch_id() is null))
  with check (public.is_admin() or branch_id = public.current_branch_id());
create policy "Branch users can manage events" on public.events for all to authenticated
  using (public.is_admin() or branch_id = public.current_branch_id() or (branch_id is null and public.current_branch_id() is null))
  with check (public.is_admin() or branch_id = public.current_branch_id());
create policy "Branch users can manage reports" on public.reports for all to authenticated
  using (public.is_admin() or branch_id = public.current_branch_id() or (branch_id is null and public.current_branch_id() is null))
  with check (public.is_admin() or branch_id = public.current_branch_id());
create policy "Branch users can manage loans" on public.loans for all to authenticated
  using (public.is_admin() or branch_id = public.current_branch_id() or (branch_id is null and public.current_branch_id() is null))
  with check (public.is_admin() or branch_id = public.current_branch_id());

notify pgrst, 'reload schema';
