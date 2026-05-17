
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- NOTES
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  subject text default 'General',
  original_text text default '',
  clean_notes text default '',
  summary text default '',
  flashcards jsonb default '[]'::jsonb,
  quiz jsonb default '[]'::jsonb,
  file_url text,
  file_path text,
  status text not null default 'processing', -- processing | ready | failed
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_idx on public.notes(user_id, created_at desc);

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- STORAGE BUCKET (private)
insert into storage.buckets (id, name, public)
values ('notes-files', 'notes-files', false)
on conflict (id) do nothing;

-- Storage policies: users can only access files under their own uid folder (first path segment)
create policy "notes_files_select_own" on storage.objects for select
  using (bucket_id = 'notes-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "notes_files_insert_own" on storage.objects for insert
  with check (bucket_id = 'notes-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "notes_files_update_own" on storage.objects for update
  using (bucket_id = 'notes-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "notes_files_delete_own" on storage.objects for delete
  using (bucket_id = 'notes-files' and auth.uid()::text = (storage.foldername(name))[1]);
