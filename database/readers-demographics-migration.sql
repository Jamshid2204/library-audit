-- Run this migration in the Supabase SQL Editor.

alter table public.readers
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists specialty text;

alter table public.readers
  drop constraint if exists readers_age_check,
  drop constraint if exists readers_gender_check;

alter table public.readers
  add constraint readers_age_check check (age is null or age between 0 and 120),
  add constraint readers_gender_check check (gender is null or gender in ('Erkak', 'Ayol'));

notify pgrst, 'reload schema';
