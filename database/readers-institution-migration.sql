alter table public.readers
  add column if not exists institution_type text not null default 'Maktab';

alter table public.readers
  drop constraint if exists readers_institution_type_check;

alter table public.readers
  add constraint readers_institution_type_check
  check (institution_type in ('Maktab', 'Texnikum', 'Universitet', 'Nafaqada', 'Oliy ma''lumotli xizmatchi', 'Boshqalar'));

notify pgrst, 'reload schema';
