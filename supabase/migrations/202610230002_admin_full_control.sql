-- ChurchFinder: phase 2 — user profile fields, events (اجتماعات), help requests (مساعدات), images storage, full admin control.
-- Run AFTER 202610230001_initial_schema.sql (paste in Supabase SQL Editor).

-- 1) Profile fields: phone, avatar, bio, city
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists city text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Church rating shown on cards (set by admin)
alter table public.churches add column if not exists rating numeric(2,1) check (rating between 0 and 5);
alter table public.restaurants add column if not exists rating numeric(2,1) check (rating between 0 and 5);

-- 3) Events / meetings at churches (اجتماعات وفعاليات)
create table if not exists public.church_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete cascade,
  title text not null,
  kind text not null default 'اجتماع',
  description text,
  starts_on date,
  starts_at time,
  location_note text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists church_events_church_idx on public.church_events(church_id, is_published);

-- 4) Help requests (مساعدات) — posted by admin, or sent by users to admin
create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  details text,
  category text not null default 'أخرى',
  contact_phone text,
  status text not null default 'open' check (status in ('open','in_progress','done')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists help_requests_status_idx on public.help_requests(status, is_published);

drop trigger if exists church_events_updated_at on public.church_events;
create trigger church_events_updated_at before update on public.church_events for each row execute function public.set_updated_at();
drop trigger if exists help_requests_updated_at on public.help_requests;
create trigger help_requests_updated_at before update on public.help_requests for each row execute function public.set_updated_at();

alter table public.church_events enable row level security;
alter table public.help_requests enable row level security;

drop policy if exists "events_read" on public.church_events;
create policy "events_read" on public.church_events for select to anon, authenticated using (is_published = true or public.is_admin());
drop policy if exists "events_admin_all" on public.church_events;
create policy "events_admin_all" on public.church_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Help requests: public sees only published; a user sees their own; users can send a request (unpublished until admin approves); admin does everything
drop policy if exists "help_read" on public.help_requests;
create policy "help_read" on public.help_requests for select to anon, authenticated
using (is_published = true or user_id = auth.uid() or public.is_admin());
drop policy if exists "help_user_insert" on public.help_requests;
create policy "help_user_insert" on public.help_requests for insert to authenticated
with check ((user_id = auth.uid() and is_published = false) or public.is_admin());
drop policy if exists "help_admin_update" on public.help_requests;
create policy "help_admin_update" on public.help_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "help_admin_delete" on public.help_requests;
create policy "help_admin_delete" on public.help_requests for delete to authenticated using (public.is_admin() or user_id = auth.uid());

grant select on public.church_events, public.help_requests to anon, authenticated;
grant insert, update, delete on public.church_events, public.help_requests to authenticated;

-- 5) Admin can edit/delete any profile (e.g. promote another admin, remove a user)
drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles for delete to authenticated using (public.is_admin());
grant delete on public.profiles to authenticated;

-- 6) Images bucket (church photos + user avatars)
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do nothing;
drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'images');
drop policy if exists "images_user_upload_own" on storage.objects;
create policy "images_user_upload_own" on storage.objects for insert to authenticated
with check (bucket_id = 'images' and ((storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text or public.is_admin()));
drop policy if exists "images_user_update_own" on storage.objects;
create policy "images_user_update_own" on storage.objects for update to authenticated
using (bucket_id = 'images' and ((storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text or public.is_admin()));
drop policy if exists "images_admin_delete" on storage.objects;
create policy "images_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'images' and public.is_admin());
