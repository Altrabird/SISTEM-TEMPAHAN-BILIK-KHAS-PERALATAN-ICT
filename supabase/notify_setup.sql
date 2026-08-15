-- =============================================================================
-- Telegram notification setup (idempotent — safe to re-run)
--
-- Pure SQL implementation — no Edge Functions needed. Uses:
--   - pg_net   → async HTTP POST from Postgres
--   - pg_cron  → daily scheduled job
--   - Vault    → encrypted bot token + chat id
--
-- Two notifications:
--   1. After-INSERT trigger on bookings → instant Telegram message
--   2. Daily cron at 08:00 MY → digest of overdue + due-tomorrow loans
--
-- v1.9.4: every send now passes through `tg_should_send(event_key)`, which
-- reads the admin-editable `public.notification_settings` row. Default is
-- working days only (Isnin–Jumaat, Asia/Kuala_Lumpur). Weekend bookings
-- still save normally — only the Telegram message is suppressed.
--
-- BEFORE running, replace the placeholder secrets near the top with your
-- own bot token and chat_id.
-- =============================================================================

create extension if not exists pg_net  with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Store secrets in Vault (replace placeholders below)
--
--     SAFETY: while the values below are still the placeholders, this
--     block does NOTHING. Re-running this file to pick up a later change
--     (as you're meant to — it's idempotent) must never clobber working
--     Vault secrets with 'REPLACE_WITH_YOUR_...', which would silently
--     break every notification: tg_send would happily POST to
--     api.telegram.org/botREPLACE_WITH_YOUR_BOT_TOKEN and fail.
--
--     To seed or rotate the secrets, paste the real values below and run.
-- ---------------------------------------------------------------------------
do $$
declare
  bot_token_value text := 'REPLACE_WITH_YOUR_BOT_TOKEN';
  chat_id_value   text := 'REPLACE_WITH_YOUR_CHAT_ID';   -- group ids are negative
begin
  if bot_token_value = 'REPLACE_WITH_YOUR_BOT_TOKEN' then
    raise notice 'tg_bot_token: placeholder unchanged — existing Vault secret left alone';
  elsif exists (select 1 from vault.decrypted_secrets where name = 'tg_bot_token') then
    update vault.secrets set secret = bot_token_value
      where id = (select id from vault.decrypted_secrets where name = 'tg_bot_token' limit 1);
  else
    perform vault.create_secret(bot_token_value, 'tg_bot_token', 'Telegram bot token');
  end if;

  if chat_id_value = 'REPLACE_WITH_YOUR_CHAT_ID' then
    raise notice 'tg_chat_id: placeholder unchanged — existing Vault secret left alone';
  elsif exists (select 1 from vault.decrypted_secrets where name = 'tg_chat_id') then
    update vault.secrets set secret = chat_id_value
      where id = (select id from vault.decrypted_secrets where name = 'tg_chat_id' limit 1);
  else
    perform vault.create_secret(chat_id_value, 'tg_chat_id', 'Telegram chat id');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1b. Admin-controlled notification settings (single row, id = 'telegram')
--
--     `active_days` holds ISO day-of-week numbers evaluated in
--     Asia/Kuala_Lumpur: 1 = Isnin … 5 = Jumaat, 6 = Sabtu, 7 = Ahad.
--     Default {1,2,3,4,5} = hari bekerja sahaja.
-- ---------------------------------------------------------------------------
create table if not exists public.notification_settings (
  id                    text primary key default 'telegram'
                          check (id = 'telegram'),
  enabled               boolean    not null default true,
  active_days           smallint[] not null default '{1,2,3,4,5}',
  notify_new_booking    boolean    not null default true,
  notify_return         boolean    not null default true,
  notify_cancel         boolean    not null default true,
  notify_daily_reminder boolean    not null default true,
  notify_morning_digest boolean    not null default true,
  updated_at            timestamptz not null default now(),
  updated_by            text
);

-- Defensive alters so re-running this file on an older deployment picks up
-- any column added later (same pattern as schema.sql).
alter table public.notification_settings add column if not exists enabled               boolean    not null default true;
alter table public.notification_settings add column if not exists active_days           smallint[] not null default '{1,2,3,4,5}';
alter table public.notification_settings add column if not exists notify_new_booking    boolean    not null default true;
alter table public.notification_settings add column if not exists notify_return         boolean    not null default true;
alter table public.notification_settings add column if not exists notify_cancel         boolean    not null default true;
alter table public.notification_settings add column if not exists notify_daily_reminder boolean    not null default true;
alter table public.notification_settings add column if not exists notify_morning_digest boolean    not null default true;
alter table public.notification_settings add column if not exists updated_at            timestamptz not null default now();
alter table public.notification_settings add column if not exists updated_by            text;

insert into public.notification_settings (id) values ('telegram')
on conflict (id) do nothing;

alter table public.notification_settings enable row level security;

drop policy if exists "read notification settings"   on public.notification_settings;
drop policy if exists "update notification settings" on public.notification_settings;

-- Same development-friendly posture as the rest of the schema (see
-- schema.sql §6): open read/update on the anon key. The app itself only
-- surfaces the editor inside the admin-gated Tetapan view.
create policy "read notification settings"
  on public.notification_settings for select using (true);
create policy "update notification settings"
  on public.notification_settings for update using (true);

-- ---------------------------------------------------------------------------
-- 1c. Gate: should we send this event right now?
--
--     Returns false when the master switch is off, when today is not an
--     active day, or when this particular event type is muted. Fails OPEN
--     (returns true) if the settings row is missing, so a botched migration
--     never silently kills every notification.
--
--     event_key: 'booking_new' | 'loan_return' | 'booking_cancel'
--                | 'reminder_overdue' | 'digest_morning'
--                | 'manual'  → bypasses every check (smoke tests)
--                | 'other'   → master + day check only (legacy callers)
-- ---------------------------------------------------------------------------
create or replace function public.tg_should_send(event_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  s public.notification_settings%rowtype;
  today_dow smallint;
begin
  if event_key = 'manual' then
    return true;
  end if;

  select * into s from public.notification_settings where id = 'telegram';
  if not found then
    return true;  -- fail open
  end if;

  if not s.enabled then
    return false;
  end if;

  today_dow := extract(isodow from (now() at time zone 'Asia/Kuala_Lumpur'))::smallint;
  if array_length(s.active_days, 1) is null or not (today_dow = any(s.active_days)) then
    return false;
  end if;

  return case event_key
    when 'booking_new'      then s.notify_new_booking
    when 'loan_return'      then s.notify_return
    when 'booking_cancel'   then s.notify_cancel
    when 'reminder_overdue' then s.notify_daily_reminder
    when 'digest_morning'   then s.notify_morning_digest
    else true
  end;
end;
$$;

grant execute on function public.tg_should_send(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helper: send a message to Telegram
--
--     The old single-argument signature is dropped first: keeping it
--     alongside the new one (whose second parameter has a default) would
--     make `tg_send('x')` ambiguous. plpgsql bodies aren't dependency
--     tracked, so existing callers such as `bulk_book_rooms` keep working
--     and resolve to the new function with event_key = 'other'.
-- ---------------------------------------------------------------------------
drop function if exists public.tg_send(text);

create or replace function public.tg_send(message text, event_key text default 'other')
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  bot_token text;
  chat_id text;
  request_id bigint;
begin
  if not public.tg_should_send(event_key) then
    return null;  -- muted by admin settings (off day / disabled event)
  end if;

  select decrypted_secret into bot_token from vault.decrypted_secrets where name = 'tg_bot_token' limit 1;
  select decrypted_secret into chat_id   from vault.decrypted_secrets where name = 'tg_chat_id'   limit 1;
  if bot_token is null or chat_id is null then
    raise warning 'tg_send: vault secrets missing';
    return null;
  end if;

  select net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'chat_id', chat_id,
      'text', message,
      'parse_mode', 'HTML',
      'disable_web_page_preview', true
    ),
    timeout_milliseconds := 8000
  ) into request_id;
  return request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Trigger: notify on every booking INSERT
-- ---------------------------------------------------------------------------
create or replace function public.notify_booking_telegram()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  resource_name text;
  category_name text;
  serial_no text;
  has_access_note boolean := false;
  borrower_email text;
  access_line text := '';
  msg text;
  icon text;
  heading text;
  date_line text;
  is_loan boolean := (new.resource_type = 'equipment');
  suppress text;
begin
  -- Bulk loan uses a session-local config to bypass per-row notifications.
  -- The bulk_loan_assets RPC sets this and emits ONE consolidated digest.
  suppress := current_setting('tempah.suppress_loan_notify', true);
  if suppress = 'on' then
    return new;
  end if;

  -- Bulk-book-rooms suppression flag (rooms-only digest)
  suppress := current_setting('tempah.suppress_booking_notify', true);
  if suppress = 'on' then
    return new;
  end if;

  if is_loan then
    select a.name, a.serial_number, e.name,
           (a.access_note is not null and length(trim(a.access_note)) > 0)
      into resource_name, serial_no, category_name, has_access_note
      from public.assets a
      left join public.equipment e on e.id = a.resource_id
      where a.id = new.resource_id;

    if resource_name is null then
      resource_name := new.resource_id;
    elsif category_name is not null then
      resource_name := resource_name || ' (' || category_name || ')';
    end if;

    -- v1.9.2: don't reveal access_note in Telegram. Build an indicator line
    -- that confirms the password was emailed (or warns if email missing).
    if has_access_note then
      select email into borrower_email
        from public.profiles
        where id = new.user_id;
      if borrower_email is not null and length(trim(borrower_email)) > 0 then
        access_line := E'\n🔐 Nota akses dihantar ke email peminjam';
      else
        access_line := E'\n⚠️ Unit ada Nota Akses tetapi peminjam tiada email — sila set email di profil';
      end if;
    end if;
  else
    select name into resource_name from public.rooms where id = new.resource_id;
    resource_name := coalesce(resource_name, new.resource_id);
  end if;

  icon    := case when is_loan then '💻' else '🚪' end;
  heading := case when is_loan then 'Pinjaman ICT Baharu' else 'Tempahan Bilik Baharu' end;

  if is_loan and new.return_date is not null and new.return_date <> new.date then
    date_line := '📅 Pinjam: <b>' || new.date::text || '</b> → Kembali: <b>' || new.return_date::text || '</b>';
  else
    date_line := '📅 <b>' || new.date::text || '</b>  ⏰ ' || new.start_time::text || ' – ' || new.end_time::text;
  end if;

  msg :=
       icon || ' <b>' || heading || '</b>' || E'\n\n'
    || '🏷 ' || resource_name
    || coalesce(E'\n   <code>' || serial_no || '</code>', '')
    || E'\n' || date_line
    || E'\n👤 <b>' || new.user_name || '</b>'
    || coalesce(E'\n📝 <i>' || new.purpose || '</i>', '')
    || access_line
    || E'\n\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg, 'booking_new');
  return new;
exception when others then
  raise warning 'notify_booking_telegram failed: %', sqlerrm;
  return new;  -- never block the booking save
end;
$$;

drop trigger if exists trg_notify_booking_telegram on public.bookings;
create trigger trg_notify_booking_telegram
after insert on public.bookings
for each row
execute function public.notify_booking_telegram();

-- ---------------------------------------------------------------------------
-- 3b. Trigger: notify when a loan is marked as returned
--     (fires on status transition INTO 'returned')
-- ---------------------------------------------------------------------------
create or replace function public.notify_return_telegram()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  resource_name text;
  category_name text;
  serial_no text;
  msg text;
  expected_return date;
  return_day date;
  diff_days int;
  status_label text;
  status_emoji text;
  recorder text;
  suppress text;
begin
  if not (new.status = 'returned' and (old.status is distinct from 'returned')) then
    return new;
  end if;

  -- Bulk return uses a session-local config to bypass per-row notifications
  suppress := current_setting('tempah.suppress_return_notify', true);
  if suppress = 'on' then
    return new;
  end if;

  if new.resource_type = 'equipment' then
    select a.name, a.serial_number, e.name
      into resource_name, serial_no, category_name
      from public.assets a
      left join public.equipment e on e.id = a.resource_id
      where a.id = new.resource_id;
    if resource_name is null then
      resource_name := new.resource_id;
    elsif category_name is not null then
      resource_name := resource_name || ' (' || category_name || ')';
    end if;
  else
    select name into resource_name from public.rooms where id = new.resource_id;
    resource_name := coalesce(resource_name, new.resource_id);
  end if;

  expected_return := coalesce(new.return_date, new.date);
  return_day := coalesce(
    (new.returned_at at time zone 'Asia/Kuala_Lumpur')::date,
    (now() at time zone 'Asia/Kuala_Lumpur')::date
  );
  diff_days := return_day - expected_return;

  if diff_days < 0 then
    status_emoji := '🌟';
    status_label := 'Pulang AWAL ' || abs(diff_days) || ' hari';
  elsif diff_days = 0 then
    status_emoji := '✅';
    status_label := 'Pulang TEPAT pada masa';
  else
    status_emoji := '⚠️';
    status_label := 'Pulang LEWAT ' || diff_days || ' hari';
  end if;

  recorder := coalesce(new.returned_by_name, 'pengguna');

  msg :=
       '📦 <b>Pemulangan ICT</b>' || E'\n\n'
    || '🏷 ' || resource_name
    || coalesce(E'\n   <code>' || serial_no || '</code>', '')
    || E'\n👤 Peminjam: <b>' || new.user_name || '</b>'
    || E'\n📅 Patut kembali: ' || expected_return::text
    || E'\n📥 Direkod oleh: <b>' || recorder || '</b>'
    || E'\n' || status_emoji || ' ' || status_label
    || coalesce(E'\n📝 Nota: <i>' || new.return_notes || '</i>', '')
    || E'\n\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg, 'loan_return');
  return new;
exception when others then
  raise warning 'notify_return_telegram failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_notify_return_telegram on public.bookings;
create trigger trg_notify_return_telegram
after update of status on public.bookings
for each row
when (new.status = 'returned' and old.status is distinct from 'returned')
execute function public.notify_return_telegram();

-- ---------------------------------------------------------------------------
-- 3b'. Bulk return RPC — update N bookings + send ONE Telegram digest.
--      Suppresses the per-row return trigger via session config flag.
-- ---------------------------------------------------------------------------
create or replace function public.bulk_return_loans(
  loan_ids text[],
  by_id text,
  by_name text,
  notes text default null
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  count_updated int;
  lines text;
  msg text;
  ts timestamptz := now();
  today_my date := (ts at time zone 'Asia/Kuala_Lumpur')::date;
begin
  perform set_config('tempah.suppress_return_notify', 'on', true);

  update public.bookings
  set
    status = 'returned',
    returned_at = ts,
    returned_by_id = by_id,
    returned_by_name = by_name,
    return_notes = nullif(notes, '')
  where id = any(loan_ids)
    and status = 'confirmed';
  get diagnostics count_updated = row_count;

  if count_updated = 0 then
    return 0;
  end if;

  with returned as (
    select b.id, b.user_name, coalesce(b.return_date, b.date) as ret,
           a.name as asset_name, a.serial_number, e.name as cat_name
    from public.bookings b
    left join public.assets a on a.id = b.resource_id
    left join public.equipment e on e.id = a.resource_id
    where b.id = any(loan_ids)
      and b.status = 'returned'
      and b.returned_at = ts
  )
  select string_agg(
    '• <b>' || coalesce(asset_name, 'unit') || '</b>'
    || coalesce(' <i>(' || cat_name || ')</i>', '')
    || coalesce(E'\n  <code>' || serial_number || '</code>', '')
    || E'\n  Peminjam: ' || user_name
    || ' · patut kembali ' || ret::text
    || (case when (today_my - ret) < 0 then ' (awal ' || abs(today_my - ret) || 'h)'
             when (today_my - ret) = 0 then ' (tepat)'
             else ' (lewat ' || (today_my - ret) || 'h)' end),
    E'\n\n'
    order by asset_name
  )
  into lines
  from returned;

  msg := '📦📦 <b>Pemulangan Pukal ICT</b>' || E'\n'
      || '<i>' || count_updated || ' unit dipulangkan oleh ' || by_name
      || ' pada ' || today_my::text || '</i>' || E'\n\n'
      || lines
      || coalesce(E'\n\n📝 Nota: <i>' || notes || '</i>', '')
      || E'\n\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg, 'loan_return');
  return count_updated;
end;
$$;

grant execute on function public.bulk_return_loans(text[], text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3b''. Bulk loan RPC — insert N bookings + send ONE Telegram digest.
--       Suppresses the per-row insert trigger via session config flag.
--       `rows` is a jsonb array of { id, resource_id } pairs.
-- ---------------------------------------------------------------------------
create or replace function public.bulk_loan_assets(
  rows jsonb,
  by_user_id text,
  by_user_name text,
  start_date date,
  return_date date,
  start_time time,
  end_time time,
  purpose text,
  created_at timestamptz default now()
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  count_inserted int := 0;
  count_with_note int := 0;
  borrower_email text;
  lines text;
  access_summary text := '';
  msg text;
  total_days int;
  total_label text;
begin
  if rows is null or jsonb_array_length(rows) = 0 then
    return 0;
  end if;

  perform set_config('tempah.suppress_loan_notify', 'on', true);

  insert into public.bookings (
    id, resource_id, resource_type, user_id, user_name,
    date, return_date, start_time, end_time,
    purpose, status, created_at
  )
  select
    (r->>'id'),
    (r->>'resource_id'),
    'equipment',
    by_user_id,
    by_user_name,
    start_date,
    return_date,
    start_time,
    end_time,
    purpose,
    'confirmed',
    created_at
  from jsonb_array_elements(rows) as r;
  get diagnostics count_inserted = row_count;

  if count_inserted = 0 then
    return 0;
  end if;

  total_days := greatest(1, (return_date - start_date));
  total_label := total_days || ' hari × ' || count_inserted || ' unit';

  -- v1.9.2: don't reveal access_note in Telegram. Mark per-unit if it has
  -- a note, and roll up the count so admins know how many emails went out.
  with inserted as (
    select b.id, a.name as asset_name, a.serial_number, e.name as cat_name,
           a.access_note
    from public.bookings b
    left join public.assets a on a.id = b.resource_id
    left join public.equipment e on e.id = a.resource_id
    where b.id in (select r->>'id' from jsonb_array_elements(rows) as r)
      and b.created_at = bulk_loan_assets.created_at
  )
  select string_agg(
           '• <b>' || coalesce(asset_name, 'unit') || '</b>'
           || coalesce(' <i>(' || cat_name || ')</i>', '')
           || coalesce(E'\n  <code>' || serial_number || '</code>', '')
           || (case when access_note is not null and length(trim(access_note)) > 0
                    then E'\n  🔐 ada nota akses' else '' end),
           E'\n'
           order by asset_name
         ),
         count(*) filter (where access_note is not null and length(trim(access_note)) > 0)
    into lines, count_with_note
    from inserted;

  if count_with_note > 0 then
    select email into borrower_email from public.profiles where id = by_user_id;
    if borrower_email is not null and length(trim(borrower_email)) > 0 then
      access_summary := E'\n🔐 ' || count_with_note || ' unit ada nota akses — dihantar ke email peminjam';
    else
      access_summary := E'\n⚠️ ' || count_with_note || ' unit ada nota akses tetapi peminjam tiada email — sila set email di profil';
    end if;
  end if;

  msg := '📦📦 <b>Pinjaman Pukal ICT</b>' || E'\n'
      || '<i>' || count_inserted || ' unit dipinjam oleh ' || by_user_name || '</i>' || E'\n'
      || '📅 Pinjam: <b>' || start_date::text || '</b> → Kembali: <b>' || return_date::text || '</b>'
      || ' <i>(' || total_label || ')</i>' || E'\n'
      || coalesce(E'📝 <i>' || purpose || '</i>' || E'\n', '')
      || E'\n' || lines
      || access_summary
      || E'\n\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg, 'booking_new');
  return count_inserted;
end;
$$;

grant execute on function public.bulk_loan_assets(jsonb, text, text, date, date, time, time, text, timestamptz) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3b'''. Bulk room booking RPC — insert N room bookings + send ONE digest.
--        Backs the BookingModal "Julat Hari" and "Pukal" modes. Suppresses
--        the per-row insert trigger via `tempah.suppress_booking_notify`.
--
--        Unlike bulk_loan_assets, every slot carries its own date and time
--        window, so `rows` is a jsonb array of
--        { id, resource_id, date, start_time, end_time, created_at }.
--
--        Recovered from the deployed database in v1.9.4 — this function
--        shipped in v1.9 but was never committed, so a rebuild from
--        supabase/ alone produced a system where bulk room booking failed
--        at runtime. Kept byte-faithful to production apart from formatting.
-- ---------------------------------------------------------------------------
create or replace function public.bulk_book_rooms(
  rows jsonb,
  by_user_id text,
  by_user_name text,
  purpose text default null
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  count_inserted int := 0;
  lines text;
  msg text;
  total_slots int;
begin
  if rows is null or jsonb_array_length(rows) = 0 then
    return 0;
  end if;

  perform set_config('tempah.suppress_booking_notify', 'on', true);

  -- Each row provides its own id, resource_id, date, start_time, end_time.
  -- created_at falls back to now() per row.
  insert into public.bookings (
    id, resource_id, resource_type, user_id, user_name,
    date, start_time, end_time,
    purpose, status, created_at
  )
  select
    (r->>'id'),
    (r->>'resource_id'),
    'room',
    by_user_id,
    by_user_name,
    (r->>'date')::date,
    (r->>'start_time')::time,
    (r->>'end_time')::time,
    purpose,
    'confirmed',
    coalesce((r->>'created_at')::timestamptz, now())
  from jsonb_array_elements(rows) as r;
  get diagnostics count_inserted = row_count;

  if count_inserted = 0 then
    return 0;
  end if;

  total_slots := count_inserted;

  -- Build the per-slot digest (sorted by date, then start_time).
  -- NB: the inner subquery's `r` (jsonb_array_elements) shadows the outer
  -- `rooms r` join alias. Postgres resolves it to the innermost scope, which
  -- is what we want here — left as-is to match the deployed definition.
  with inserted as (
    select b.date, b.start_time, b.end_time,
           coalesce(r.name, b.resource_id) as resource_name
    from public.bookings b
    left join public.rooms r on r.id = b.resource_id
    where b.id in (select r->>'id' from jsonb_array_elements(rows) as r)
  )
  select string_agg(
    '• <b>' || resource_name || '</b>'
    || E'\n  📅 ' || date::text
    || '  ⏰ ' || start_time::text || ' – ' || end_time::text,
    E'\n\n'
    order by date, start_time
  )
  into lines
  from inserted;

  msg := '🚪🚪 <b>Tempahan Bilik Pukal</b>' || E'\n'
      || '<i>' || total_slots || ' slot ditempah oleh ' || by_user_name || '</i>' || E'\n'
      || coalesce(E'📝 <i>' || purpose || '</i>' || E'\n', '')
      || E'\n' || lines
      || E'\n\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg, 'booking_new');
  return count_inserted;
end;
$$;

grant execute on function public.bulk_book_rooms(jsonb, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3c. Trigger: notify when status transitions INTO 'cancelled'
-- ---------------------------------------------------------------------------
create or replace function public.notify_cancel_telegram()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  resource_name text;
  category_name text;
  serial_no text;
  msg text;
  is_loan boolean := (new.resource_type = 'equipment');
  date_line text;
  canceller text;
  by_admin boolean;
begin
  if not (new.status = 'cancelled' and (old.status is distinct from 'cancelled')) then
    return new;
  end if;

  if is_loan then
    select a.name, a.serial_number, e.name
      into resource_name, serial_no, category_name
      from public.assets a
      left join public.equipment e on e.id = a.resource_id
      where a.id = new.resource_id;
    if resource_name is null then
      resource_name := new.resource_id;
    elsif category_name is not null then
      resource_name := resource_name || ' (' || category_name || ')';
    end if;
  else
    select name into resource_name from public.rooms where id = new.resource_id;
    resource_name := coalesce(resource_name, new.resource_id);
  end if;

  if is_loan and new.return_date is not null and new.return_date <> new.date then
    date_line := '📅 Pinjam: ' || new.date::text || ' → Kembali: ' || new.return_date::text;
  else
    date_line := '📅 ' || new.date::text || '  ⏰ ' || new.start_time::text || ' – ' || new.end_time::text;
  end if;

  canceller := coalesce(new.cancelled_by_name, 'pengguna');
  by_admin := new.cancelled_by_id is not null and new.cancelled_by_id <> new.user_id;

  msg :=
       '❌ <b>' || (case when is_loan then 'Pinjaman Dibatalkan' else 'Tempahan Dibatalkan' end) || '</b>' || E'\n\n'
    || '🏷 ' || resource_name
    || coalesce(E'\n   <code>' || serial_no || '</code>', '')
    || E'\n' || date_line
    || E'\n👤 Pemohon asal: <b>' || new.user_name || '</b>'
    || E'\n✋ Dibatalkan oleh: <b>' || canceller || '</b>'
       || (case when by_admin then ' <i>(admin)</i>' else '' end)
    || coalesce(E'\n📝 Sebab: <i>' || new.cancel_reason || '</i>', '')
    || E'\n\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg, 'booking_cancel');
  return new;
exception when others then
  raise warning 'notify_cancel_telegram failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_notify_cancel_telegram on public.bookings;
create trigger trg_notify_cancel_telegram
after update of status on public.bookings
for each row
when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
execute function public.notify_cancel_telegram();

-- ---------------------------------------------------------------------------
-- 4. Daily reminder — overdue + due-tomorrow ICT loans
-- ---------------------------------------------------------------------------
create or replace function public.tg_remind_overdue_loans()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  today_my date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  tomorrow_my date := today_my + interval '1 day';
  overdue_count int;
  due_count int;
  overdue_lines text;
  due_lines text;
  msg text;
begin
  with active as (
    select b.*, a.name as asset_name, a.serial_number
    from public.bookings b
    left join public.assets a on a.id = b.resource_id
    where b.resource_type = 'equipment'
      and b.status = 'confirmed'
  ),
  overdue as (
    select * from active where coalesce(return_date, date) < today_my
  ),
  due as (
    select * from active where coalesce(return_date, date) = tomorrow_my
  )
  select
    (select count(*) from overdue),
    (select count(*) from due),
    (select string_agg(
      '• ' || coalesce(asset_name, resource_id) || ' (' || coalesce(serial_number, '—') || ')'
      || ' — <b>' || user_name || '</b>'
      || ' — lewat <b>' || (today_my - coalesce(return_date, date)) || '</b> hari',
      E'\n'
      order by coalesce(return_date, date)
    ) from overdue),
    (select string_agg(
      '• ' || coalesce(asset_name, resource_id) || ' (' || coalesce(serial_number, '—') || ')'
      || ' — <b>' || user_name || '</b>',
      E'\n'
      order by user_name
    ) from due)
  into overdue_count, due_count, overdue_lines, due_lines;

  if overdue_count = 0 and due_count = 0 then
    return; -- nothing to remind
  end if;

  msg := '📢 <b>Peringatan Pinjaman ICT</b>' || E'\n'
      || '<i>Tarikh: ' || today_my::text || '</i>' || E'\n';

  if overdue_count > 0 then
    msg := msg || E'\n🚨 <b>LEWAT — belum dipulangkan (' || overdue_count || ')</b>' || E'\n' || overdue_lines || E'\n';
  end if;

  if due_count > 0 then
    msg := msg || E'\n⏰ <b>Patut dipulangkan ESOK (' || due_count || ')</b>' || E'\n' || due_lines || E'\n';
  end if;

  msg := msg || E'\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg, 'reminder_overdue');
end;
$$;

-- Schedule daily at 00:00 UTC = 08:00 Asia/Kuala_Lumpur
-- The cron fires every day; `tg_should_send` drops the message on days
-- the admin has switched off (weekends by default).
do $$
begin
  perform cron.unschedule('tempah_remind_overdue_daily');
exception when others then null;
end $$;

select cron.schedule(
  'tempah_remind_overdue_daily',
  '0 0 * * *',
  $cron$ select public.tg_remind_overdue_loans(); $cron$
);

-- ---------------------------------------------------------------------------
-- 5. Morning digest — list TODAY's active room bookings + multi-day loans
--    Runs at 22:30 UTC = 06:30 Asia/Kuala_Lumpur every day. Silent if nothing.
-- ---------------------------------------------------------------------------
create or replace function public.tg_morning_digest()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  today_my date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  rooms_today_count int;
  loans_today_count int;
  rooms_lines text;
  loans_lines text;
  msg text;
begin
  with rooms_today as (
    select b.user_name, b.start_time, b.end_time, b.purpose,
           coalesce(r.name, b.resource_id) as resource_name
    from public.bookings b
    left join public.rooms r on r.id = b.resource_id
    where b.resource_type = 'room'
      and b.status = 'confirmed'
      and b.date = today_my
  )
  select count(*),
         string_agg(
           '• <b>' || resource_name || '</b> — ' || user_name
           || ' — ' || start_time::text || '–' || end_time::text
           || coalesce(' <i>(' || purpose || ')</i>', ''),
           E'\n'
           order by start_time
         )
    into rooms_today_count, rooms_lines
    from rooms_today;

  with loans_active as (
    select b.user_name, b.date, coalesce(b.return_date, b.date) as ret, b.purpose,
           a.name as asset_name, a.serial_number,
           coalesce(b.return_date, b.date) - today_my as days_left
    from public.bookings b
    left join public.assets a on a.id = b.resource_id
    where b.resource_type = 'equipment'
      and b.status = 'confirmed'
      and b.date <= today_my
      and coalesce(b.return_date, b.date) >= today_my
      and coalesce(b.return_date, b.date) > b.date  -- multi-day only
  )
  select count(*),
         string_agg(
           '• <b>' || coalesce(asset_name, 'unit') || '</b>'
           || ' — ' || user_name
           || ' — pulang ' || ret::text
           || (case when days_left = 0 then ' <b>(HARI INI)</b>'
                    when days_left = 1 then ' (esok)'
                    else ' (' || days_left || ' hari lagi)' end),
           E'\n'
           order by ret
         )
    into loans_today_count, loans_lines
    from loans_active;

  if rooms_today_count = 0 and loans_today_count = 0 then
    return;
  end if;

  msg := '🌅 <b>Selamat Pagi!</b>' || E'\n'
      || '<i>Aktiviti hari ini: ' || today_my::text || '</i>' || E'\n';

  if rooms_today_count > 0 then
    msg := msg || E'\n🚪 <b>BILIK YANG DITEMPAH (' || rooms_today_count || ')</b>'
                || E'\n' || rooms_lines || E'\n';
  end if;

  if loans_today_count > 0 then
    msg := msg || E'\n💻 <b>PERALATAN ICT DALAM PINJAMAN (' || loans_today_count || ')</b>'
                || E'\n' || loans_lines || E'\n';
  end if;

  msg := msg || E'\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg, 'digest_morning');
end;
$$;

do $$
begin
  perform cron.unschedule('tempah_morning_digest_daily');
exception when others then null;
end $$;

select cron.schedule(
  'tempah_morning_digest_daily',
  '30 22 * * *',     -- 06:30 Asia/Kuala_Lumpur (UTC+8)
  $cron$ select public.tg_morning_digest(); $cron$
);

-- ---------------------------------------------------------------------------
-- Manual smoke tests (uncomment to run):
-- ---------------------------------------------------------------------------
-- Bypasses the settings gate — works even on a muted day:
-- select public.tg_send('🧪 Manual test from SQL editor', 'manual');
--
-- Respects the gate — use this to verify the working-day rule:
-- select public.tg_should_send('booking_new');
-- select public.tg_remind_overdue_loans();
--
-- Inspect / edit settings by hand (the admin UI writes the same row):
-- select * from public.notification_settings;
-- update public.notification_settings
--    set active_days = '{1,2,3,4,5}'   -- Isnin–Jumaat
--  where id = 'telegram';
