-- Run this migration in the Supabase SQL Editor.
-- It is safe to run more than once.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  report_type text not null default 'Umumiy',
  report_date date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "Authenticated users can manage reports" on public.reports;

create policy "Authenticated users can manage reports" on public.reports
  for all to authenticated using (true) with check (true);

-- Refresh PostgREST's schema cache after creating the table.
notify pgrst, 'reload schema';
