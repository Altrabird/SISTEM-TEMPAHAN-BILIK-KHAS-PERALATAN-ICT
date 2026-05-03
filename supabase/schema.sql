-- SKBT Booking System 2026 — Supabase schema
-- Run in the Supabase SQL Editor (Project → SQL → New query) and click RUN.

-- =========================================================================
-- 1. PROFILES
-- =========================================================================
create table if not exists public.profiles (
  id text primary key,
  name text not null,
  email text,
  role text not null default 'guru',
  department text,
  avatar_url text,
  bio text,
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- =========================================================================
-- 2. ROOMS
-- =========================================================================
create table if not exists public.rooms (
  id text primary key,
  name text not null,
  description text,
  image_url text,
  locked_reason text,
  capacity integer
);
alter table public.rooms add column if not exists image_url text;
alter table public.rooms add column if not exists locked_reason text;

-- =========================================================================
-- 3. EQUIPMENT
-- =========================================================================
create table if not exists public.equipment (
  id text primary key,
  name text not null,
  description text,
  image_url text,
  locked_reason text,
  quantity integer
);
alter table public.equipment add column if not exists image_url text;
alter table public.equipment add column if not exists locked_reason text;

-- =========================================================================
-- 4. ASSETS (specific units of equipment)
-- =========================================================================
create table if not exists public.assets (
  id text primary key,
  resource_id text not null references public.equipment(id) on delete cascade,
  name text not null,
  serial_number text not null,
  specifications text,
  image_url text,
  locked_reason text,
  status text not null default 'available'
    check (status in ('available', 'borrowed', 'maintenance'))
);
alter table public.assets add column if not exists locked_reason text;

create index if not exists assets_resource_id_idx on public.assets (resource_id);
create index if not exists assets_status_idx on public.assets (status);

-- =========================================================================
-- 5. BOOKINGS
-- =========================================================================
create table if not exists public.bookings (
  id text primary key,
  resource_id text not null,
  resource_type text not null check (resource_type in ('room', 'equipment')),
  user_id text not null,
  user_name text not null,
  date date not null,
  return_date date,
  start_time time not null,
  end_time time not null,
  purpose text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  returned_at      timestamptz,
  returned_by_id   text,
  returned_by_name text,
  return_notes     text
);
alter table public.bookings add column if not exists return_date      date;
alter table public.bookings add column if not exists returned_at      timestamptz;
alter table public.bookings add column if not exists returned_by_id   text;
alter table public.bookings add column if not exists returned_by_name text;
alter table public.bookings add column if not exists return_notes     text;

-- Status enum (handle migration from old 3-value enum to new 4-value enum)
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add  constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'returned'));

create index if not exists bookings_user_id_idx          on public.bookings (user_id);
create index if not exists bookings_date_idx             on public.bookings (date);
create index if not exists bookings_resource_idx         on public.bookings (resource_id, date);
create index if not exists bookings_resource_range_idx   on public.bookings (resource_id, date, return_date);
create index if not exists bookings_returned_idx         on public.bookings (returned_at);

-- =========================================================================
-- 6. ROW LEVEL SECURITY (development-friendly defaults)
-- For production, replace the open policies with auth-aware policies that
-- restrict updates/deletes to the row's owner via auth.uid().
-- =========================================================================
alter table public.profiles  enable row level security;
alter table public.rooms     enable row level security;
alter table public.equipment enable row level security;
alter table public.assets    enable row level security;
alter table public.bookings  enable row level security;

-- Postgres doesn't support `create policy if not exists`, so drop-then-create.
drop policy if exists "read all profiles"  on public.profiles;
drop policy if exists "read all rooms"     on public.rooms;
drop policy if exists "read all equipment" on public.equipment;
drop policy if exists "read all assets"    on public.assets;
drop policy if exists "read all bookings"  on public.bookings;
drop policy if exists "insert profiles"    on public.profiles;
drop policy if exists "update profiles"    on public.profiles;
drop policy if exists "insert bookings"    on public.bookings;
drop policy if exists "update bookings"    on public.bookings;
drop policy if exists "insert assets"      on public.assets;
drop policy if exists "update assets"      on public.assets;
drop policy if exists "update rooms"       on public.rooms;
drop policy if exists "update equipment"   on public.equipment;

-- Open read for everyone (good for an internal school tool)
create policy "read all profiles"  on public.profiles  for select using (true);
create policy "read all rooms"     on public.rooms     for select using (true);
create policy "read all equipment" on public.equipment for select using (true);
create policy "read all assets"    on public.assets    for select using (true);
create policy "read all bookings"  on public.bookings  for select using (true);

-- Open write for everyone (anon key). Tighten with auth.uid() once you add Supabase Auth.
create policy "insert profiles"  on public.profiles  for insert with check (true);
create policy "update profiles"  on public.profiles  for update using (true);

create policy "insert bookings"  on public.bookings  for insert with check (true);
create policy "update bookings"  on public.bookings  for update using (true);

create policy "insert assets"    on public.assets    for insert with check (true);
create policy "update assets"    on public.assets    for update using (true);

create policy "update rooms"     on public.rooms     for update using (true);
create policy "update equipment" on public.equipment for update using (true);

-- =========================================================================
-- 7. SEED DATA (optional — matches src/constants.ts)
-- =========================================================================
insert into public.rooms (id, name, capacity) values
  ('room-1',  'Makmal Komputer 1 (bawah)', 40),
  ('room-2',  'Makmal Komputer 2 (atas)',  40),
  ('room-3',  'Bilik Akses',               20),
  ('room-4',  'Bilik Panitia Bahasa',      15),
  ('room-5',  'Bilik Panitia Matematik',   15),
  ('room-6',  'Bengkel RBT 1',             30),
  ('room-7',  'Bengkel RBT 2',             30),
  ('room-8',  'Bilik Panitia Muzik',       25),
  ('room-9',  'Bilik Sains',               40),
  ('room-10', 'Bilik Gerakan SKBT',        50)
on conflict (id) do nothing;

insert into public.equipment (id, name, quantity) values
  ('eq-1', 'PC',                  20),
  ('eq-2', 'Laptop Murid',        21),
  ('eq-3', 'Laptop Guru Fasa 1',   7),
  ('eq-4', 'Laptop Guru Fasa 2',   6),
  ('eq-5', 'LCD',                 10),
  ('eq-6', 'Pencetak',             5)
on conflict (id) do nothing;

insert into public.assets (id, resource_id, name, serial_number, specifications, image_url, status) values
  ('ast-1', 'eq-1', 'PC 01',     'SKBT-PC-2026-001', 'HP EliteDesk, Intel i5, 8GB RAM, 256GB SSD', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&auto=format&fit=crop&q=60', 'available'),
  ('ast-2', 'eq-1', 'PC 02',     'SKBT-PC-2026-002', 'HP EliteDesk, Intel i5, 8GB RAM, 256GB SSD', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&auto=format&fit=crop&q=60', 'available'),
  ('ast-3', 'eq-2', 'LAPTOP 01', 'SKBT-LP-2026-001', 'Dell Latitude, Intel i7, 16GB RAM, 512GB SSD', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&auto=format&fit=crop&q=60', 'available')
on conflict (id) do nothing;
