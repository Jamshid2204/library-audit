create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  inventory_number text unique not null,
  title text not null,
  author text not null,
  category text not null default 'Umumiy',
  book_type text not null default 'Umumiy bo''lim'
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
    )),
  language text not null default 'Lotincha'
    check (language in ('Kirilcha', 'Lotincha', 'Ruscha', 'Inglizcha')),
  quantity integer not null default 0,
  status text not null default 'Mavjud',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.readers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  institution_type text not null default 'Maktab'
    check (institution_type in ('Maktab', 'Texnikum', 'Universitet', 'Nafaqada', 'Oliy ma''lumotli xizmatchi', 'Boshqalar')),
  phone text,
  email text,
  address text,
  age integer check (age is null or age between 0 and 120),
  gender text check (gender is null or gender in ('Erkak', 'Ayol')),
  specialty text,
  debt numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  visit_date date not null,
  purpose text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  report_type text not null default 'Umumiy',
  report_date date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.readers(id) on delete restrict,
  book_id uuid not null references public.books(id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_date date,
  returned_at timestamptz,
  status text not null default 'borrowed' check (status in ('borrowed', 'returned')),
  created_at timestamptz not null default now(),
  constraint returned_loans_have_return_date check (
    (status = 'returned' and returned_at is not null) or
    (status = 'borrowed' and returned_at is null)
  )
);

create index if not exists loans_status_idx on public.loans(status);
create index if not exists loans_reader_id_idx on public.loans(reader_id);
create index if not exists loans_book_id_idx on public.loans(book_id);

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.readers enable row level security;
alter table public.visits enable row level security;
alter table public.events enable row level security;
alter table public.reports enable row level security;
alter table public.loans enable row level security;

create policy "Authenticated users can view profiles" on public.profiles
  for select to authenticated using (true);

create policy "Users can manage their profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Authenticated users can manage books" on public.books
  for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage readers" on public.readers
  for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage visits" on public.visits
  for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage events" on public.events
  for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage reports" on public.reports
  for all to authenticated using (true) with check (true);

create policy "Authenticated users can view loans" on public.loans
  for select to authenticated using (true);

create policy "Authenticated users can create loans" on public.loans
  for insert to authenticated with check (true);

create policy "Authenticated users can return loans" on public.loans
  for update to authenticated
  using (true)
  with check (
    status in ('borrowed', 'returned')
    and ((status = 'returned' and returned_at is not null) or (status = 'borrowed' and returned_at is null))
  );

create policy "Authenticated users can delete loans" on public.loans
  for delete to authenticated using (true);
