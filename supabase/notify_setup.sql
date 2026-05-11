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
-- BEFORE running, replace the placeholder secrets near the top with your
-- own bot token and chat_id.
-- =============================================================================

create extension if not exists pg_net  with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Store secrets in Vault (replace placeholders below)
-- ---------------------------------------------------------------------------
do $$
declare
  bot_token_value text := 'REPLACE_WITH_YOUR_BOT_TOKEN';
  chat_id_value   text := 'REPLACE_WITH_YOUR_CHAT_ID';   -- group ids are negative
begin
  if exists (select 1 from vault.decrypted_secrets where name = 'tg_bot_token') then
    update vault.secrets set secret = bot_token_value
      where id = (select id from vault.decrypted_secrets where name = 'tg_bot_token' limit 1);
  else
    perform vault.create_secret(bot_token_value, 'tg_bot_token', 'Telegram bot token');
  end if;

  if exists (select 1 from vault.decrypted_secrets where name = 'tg_chat_id') then
    update vault.secrets set secret = chat_id_value
      where id = (select id from vault.decrypted_secrets where name = 'tg_chat_id' limit 1);
  else
    perform vault.create_secret(chat_id_value, 'tg_chat_id', 'Telegram chat id');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Helper: send a message to Telegram
-- ---------------------------------------------------------------------------
create or replace function public.tg_send(message text)
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
  msg text;
  icon text;
  heading text;
  date_line text;
  is_loan boolean := (new.resource_type = 'equipment');
begin
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
    || E'\n\n🔗 https://tempah.altrabird.click';

  perform public.tg_send(msg);
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

  perform public.tg_send(msg);
end;
$$;

-- Schedule daily at 00:00 UTC = 08:00 Asia/Kuala_Lumpur
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
-- Manual smoke tests (uncomment to run):
-- ---------------------------------------------------------------------------
-- select public.tg_send('🧪 Manual test from SQL editor');
-- select public.tg_remind_overdue_loans();
