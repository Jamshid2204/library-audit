-- Run this migration in the Supabase SQL Editor.

alter table public.readers
  add column if not exists email text,
  add column if not exists address text;

notify pgrst, 'reload schema';
