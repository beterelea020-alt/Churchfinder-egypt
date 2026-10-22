-- ChurchFinder Egypt: production-oriented initial schema.
-- Apply with `supabase db push` or paste into the Supabase SQL Editor.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null check (length(trim(name)) > 1),
  address text not null,
  neighborhood text,
  governorate text not null,
  denomination text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(point, 4326),
  image_url text,
  description text,
  phone text,
  website text,
  services text[] not null default '{}',
  facilities text[] not null default '{}',
  opening_hours jsonb not null default '{}'::jsonb,
  is_open boolean,
  service_notes text,
  verified boolean not null default false,
  is_published boolean not null default false,
  source_name text,
  source_url text,
  verified_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 1),
  category text not null default 'غير محدد',
  address text not null,
  governorate text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(point, 4326),
  image_url text,
  phone text,
  price_range text,
  opening_hours jsonb not null default '{}'::jsonb,
  verified boolean not null default false,
  is_published boolean not null default false,
  source_name text,
  source_url text,
  verified_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.church_services (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  title text not null,
  day_of_week smallint check (day_of_week between 0 and 6),
  starts_at time,
  ends_at time,
  notes text,
  is_verified boolean not null default false,
  is_published boolean not null default false,
  source_name text,
  source_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  church_id uuid references public.churches(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_one_target check (
    (church_id is not null and restaurant_id is null) or
    (church_id is null and restaurant_id is not null)
  )
);

create unique index if not exists favorites_user_church_unique
  on public.favorites(user_id, church_id) where church_id is not null;
create unique index if not exists favorites_user_restaurant_unique
  on public.favorites(user_id, restaurant_id) where restaurant_id is not null;
create index if not exists churches_published_governorate_idx on public.churches(is_published, governorate);
create index if not exists churches_location_gix on public.churches using gist(location);
create index if not exists restaurants_published_governorate_idx on public.restaurants(is_published, governorate);
create index if not exists restaurants_location_gix on public.restaurants using gist(location);
create index if not exists church_services_church_idx on public.church_services(church_id, is_published);

-- PostGIS-backed proximity APIs for scalable searches without exposing draft records.
create or replace function public.nearby_churches(p_lat double precision, p_lng double precision, p_radius_meters integer default 15000)
returns table (id uuid, distance_meters double precision)
language sql stable security invoker set search_path = public, extensions as $$
  select c.id, extensions.st_distance(c.location, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography) as distance_meters
  from public.churches c
  where c.is_published = true and c.location is not null
    and extensions.st_dwithin(c.location, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, greatest(p_radius_meters, 0))
  order by distance_meters asc;
$$;
create or replace function public.nearby_restaurants(p_lat double precision, p_lng double precision, p_radius_meters integer default 15000)
returns table (id uuid, distance_meters double precision)
language sql stable security invoker set search_path = public, extensions as $$
  select r.id, extensions.st_distance(r.location, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography) as distance_meters
  from public.restaurants r
  where r.is_published = true and r.location is not null
    and extensions.st_dwithin(r.location, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, greatest(p_radius_meters, 0))
  order by distance_meters asc;
$$;
grant execute on function public.nearby_churches(double precision, double precision, integer) to anon, authenticated;
grant execute on function public.nearby_restaurants(double precision, double precision, integer) to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_place_location()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  new.location := extensions.st_setsrid(extensions.st_makepoint(new.longitude, new.latitude), 4326)::extensions.geography;
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an administrator can change profile roles.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_profile_created on auth.users;
create trigger auth_user_profile_created after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update on public.profiles
for each row execute function public.guard_profile_role();
drop trigger if exists churches_updated_at on public.churches;
create trigger churches_updated_at before update on public.churches
for each row execute function public.set_updated_at();
drop trigger if exists churches_sync_location on public.churches;
create trigger churches_sync_location before insert or update of latitude, longitude on public.churches
for each row execute function public.sync_place_location();
drop trigger if exists restaurants_updated_at on public.restaurants;
create trigger restaurants_updated_at before update on public.restaurants
for each row execute function public.set_updated_at();
drop trigger if exists restaurants_sync_location on public.restaurants;
create trigger restaurants_sync_location before insert or update of latitude, longitude on public.restaurants
for each row execute function public.sync_place_location();
drop trigger if exists church_services_updated_at on public.church_services;
create trigger church_services_updated_at before update on public.church_services
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.churches enable row level security;
alter table public.restaurants enable row level security;
alter table public.church_services enable row level security;
alter table public.favorites enable row level security;

-- Profiles: each user can read/update only their own record; role changes are guarded by trigger.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Public users can read only published records. Unpublished records are administrator-only.
drop policy if exists "churches_public_read_published" on public.churches;
create policy "churches_public_read_published" on public.churches for select to anon, authenticated
using (is_published = true or public.is_admin());
drop policy if exists "churches_admin_insert" on public.churches;
create policy "churches_admin_insert" on public.churches for insert to authenticated
with check (public.is_admin());
drop policy if exists "churches_admin_update" on public.churches;
create policy "churches_admin_update" on public.churches for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "churches_admin_delete" on public.churches;
create policy "churches_admin_delete" on public.churches for delete to authenticated
using (public.is_admin());

drop policy if exists "restaurants_public_read_published" on public.restaurants;
create policy "restaurants_public_read_published" on public.restaurants for select to anon, authenticated
using (is_published = true or public.is_admin());
drop policy if exists "restaurants_admin_insert" on public.restaurants;
create policy "restaurants_admin_insert" on public.restaurants for insert to authenticated
with check (public.is_admin());
drop policy if exists "restaurants_admin_update" on public.restaurants;
create policy "restaurants_admin_update" on public.restaurants for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "restaurants_admin_delete" on public.restaurants;
create policy "restaurants_admin_delete" on public.restaurants for delete to authenticated
using (public.is_admin());

drop policy if exists "church_services_read_published" on public.church_services;
create policy "church_services_read_published" on public.church_services for select to anon, authenticated
using ((is_published = true and exists (select 1 from public.churches c where c.id = church_id and c.is_published = true)) or public.is_admin());
drop policy if exists "church_services_admin_insert" on public.church_services;
create policy "church_services_admin_insert" on public.church_services for insert to authenticated
with check (public.is_admin());
drop policy if exists "church_services_admin_update" on public.church_services;
create policy "church_services_admin_update" on public.church_services for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists "church_services_admin_delete" on public.church_services;
create policy "church_services_admin_delete" on public.church_services for delete to authenticated
using (public.is_admin());

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites for select to authenticated
using (user_id = auth.uid());
drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites for delete to authenticated
using (user_id = auth.uid());

-- Table access for PostgREST. RLS continues to enforce row-level restrictions.
grant select on public.churches, public.restaurants, public.church_services to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant insert, update, delete on public.churches, public.restaurants, public.church_services to authenticated;
