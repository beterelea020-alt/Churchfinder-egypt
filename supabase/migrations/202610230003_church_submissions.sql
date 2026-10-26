-- ChurchFinder: phase 3 — users suggest missing churches; admin reviews and publishes.
create table if not exists public.church_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  address text,
  governorate text,
  neighborhood text,
  denomination text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  phone text,
  services text,
  schedule_text text,
  description text,
  image_url text,
  submitter_name text,
  submitter_phone text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists church_submissions_status_idx on public.church_submissions(status, created_at desc);
drop trigger if exists church_submissions_updated_at on public.church_submissions;
create trigger church_submissions_updated_at before update on public.church_submissions for each row execute function public.set_updated_at();

alter table public.church_submissions enable row level security;
drop policy if exists "subs_select" on public.church_submissions;
create policy "subs_select" on public.church_submissions for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "subs_insert" on public.church_submissions;
create policy "subs_insert" on public.church_submissions for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "subs_admin_update" on public.church_submissions;
create policy "subs_admin_update" on public.church_submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "subs_admin_delete" on public.church_submissions;
create policy "subs_admin_delete" on public.church_submissions for delete to authenticated using (public.is_admin());
grant select, insert, update, delete on public.church_submissions to authenticated;

-- users may upload photos into submissions/<their-uid>/
drop policy if exists "images_user_upload_submissions" on storage.objects;
create policy "images_user_upload_submissions" on storage.objects for insert to authenticated
with check (bucket_id = 'images' and (storage.foldername(name))[1] = 'submissions' and (storage.foldername(name))[2] = auth.uid()::text);
