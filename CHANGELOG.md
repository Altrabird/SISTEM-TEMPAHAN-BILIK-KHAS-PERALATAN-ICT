# Changelog

Major milestones for the TEMPAH project.

## v1.6.0 — Telegram Notifications + Bulk Workflows (current)

**The single largest milestone since v1.4.0. Five Telegram triggers,
two daily cron digests, bulk return, admin cancel, list view, and a
critical conflict-check bug fix — all live on tempah.altrabird.click.**

### Telegram notifications (5 events, all server-side)

| # | Event | Trigger | Format |
|---|-------|---------|--------|
| 1 | Tempahan/Pinjaman baru | INSERT on `bookings` | 🚪/💻 with date, time, purpose |
| 2 | Pemulangan tunggal | UPDATE status → returned | 📦 with awal/tepat/lewat label |
| 3 | Pemulangan PUKAL | RPC `bulk_return_loans()` | 📦📦 single digest with all units |
| 4 | Pembatalan | UPDATE status → cancelled | ❌ with cancelled_by + (admin) tag + reason |
| 5 | Morning digest | pg_cron 06:30 MY | 🌅 today's rooms + active multi-day loans |
| 6 | Overdue digest | pg_cron 08:00 MY | 📢 LEWAT + ESOK-due ICT loans |

Pure SQL implementation — `pg_net` for HTTP, `pg_cron` for schedule,
Supabase Vault for bot-token + chat-id. Triggers live in DB, so
notifications fire for any source (app, direct SQL, future clients).

Failure-mode safe: `EXCEPTION WHEN OTHERS` in every trigger, so a
Telegram outage will never block a booking save.

### Cancel workflow

- Admin can now cancel ANY booking (was: own only)
- Cancel button prompts for an optional reason
- New columns: `cancelled_at`, `cancelled_by_id`, `cancelled_by_name`, `cancel_reason`
- Cancel notification message tags admin cancellations with `(admin)`

### Bulk return workflow

- "Pilih untuk Pulangkan Pukal" mode in MyLoansView
- Checkbox per active loan + Pilih Semua / Buang Semua
- Single Supabase RPC `bulk_return_loans(ids, by_id, by_name, notes)`
  updates all rows AND emits ONE consolidated Telegram digest
- Per-row return trigger is bypassed via `tempah.suppress_return_notify`
  session config — no Telegram spam

### UI

- New card/list view toggle on Bilik Khas + Peralatan ICT (with
  localStorage persist per browser)
- List view is ~3-4x denser, ideal for fast scanning a long inventory

### Bug fixes

- **Critical**: `checkConflict` and `checkLoanConflict` were only
  excluding `cancelled` bookings. Returned bookings still blocked
  re-borrowing. Fixed via shared `isActiveBooking` helper that
  excludes both `cancelled` AND `returned`.
- Hide native scrollbar visuals on all 9+ scrollable modals + sidebar
  + main content (`.scrollbar-hide` utility)
- Bulk* modals were missing `relative` class — content rendered under
  the dim backdrop, looked transparent

### Schema additions

- `bookings.cancelled_at`, `cancelled_by_id`, `cancelled_by_name`, `cancel_reason`
- `public.tg_send(text)` — generic Telegram helper
- `public.notify_booking_telegram()` — INSERT trigger
- `public.notify_return_telegram()` — UPDATE → returned trigger (now
  honours suppress flag)
- `public.notify_cancel_telegram()` — UPDATE → cancelled trigger
- `public.bulk_return_loans()` — RPC for batch return + single digest
- `public.tg_remind_overdue_loans()` — cron callback (08:00 MY)
- `public.tg_morning_digest()` — cron callback (06:30 MY)

---

## v1.5.0 — Telegram Notifications (initial)

- Telegram bot integration ("Tempah@SKBT")
- Instant notification on every booking INSERT
- Instant notification on every return
- Daily 08:00 MY overdue + due-tomorrow ICT reminder
- Pure SQL via pg_net + pg_cron + Vault

---

## v1.4.0 — Pemulangan + PWA Edition

**Live on `tempah.altrabird.click`. First user-facing milestone.**

### Major
- Production deploy on Contabo VPS with HTTPS (Certbot)
- PWA: installable on Android / iOS, offline app shell, auto-update banner
- Vibrant UI refresh inspired by Hadir@SKBT (gradient sidebar, bold KPI cards)
- Mobile-first layout: drawer + bottom nav, modal sheets, no horizontal scroll
- Supabase set as source of truth across rooms, equipment, assets, bookings,
  profiles — localStorage demoted to offline cache
- Year-agnostic copy (no more "2026" hardcoded in user-facing strings)
- Local-timezone date helpers (`lib/dates.ts`) — fixes off-by-one bug in
  Malaysia (UTC+8)

### Features
- New "Pemulangan" sidebar item — borrower self-service return view with
  prominent Pulangkan buttons
- Borrower can self-mark ICT loans as returned (early return supported)
- Admin "Pinjaman ICT" full audit view (Aktif / Lewat / Pulang filters)
- Bulk QR sticker print (A4, 18-up) for all assets in a category
- Bulk asset actions modal (lock / unlock / status / delete)
- Per-asset Edit + Delete (admin only)
- Lock system at 3 levels: room, equipment category, individual asset
- QR-driven loan flow with `?loan=ast-X` deep-link
- Reports view with printable A4 layout
- Booking slip print (per-record popup)
- CSV export of bookings
- 13-achievement gallery (bronze/silver/gold/platinum)

### Fixes (notable)
- Modal `relative` class on Bulk* modals — content was painted under
  backdrop, looked transparent
- nginx.conf no longer overwrites Certbot's HTTPS block on deploy
- Local-timezone date math everywhere; "1 Hari" preset now correctly
  shows tomorrow as return date

### Tech
- React 19 + TS + Vite 6 + Tailwind v4 + Motion
- Supabase: 5 tables (profiles, rooms, equipment, assets, bookings)
- vite-plugin-pwa for SW + manifest

---

## v1.3.0 — Portfolio Edition

- Profile system with onboarding modal (3 modes)
- Achievement engine + portfolio view
- Streak tracking, monthly trend chart, favourite resource
- Avatar upload (gallery / camera)
- Admin role + restricted access to Settings + Reports
- Schema: profiles, locks (locked_reason on rooms/equipment/assets)
- Initial Supabase integration with localStorage fallback
- Profile picker — load existing profile on new device

---

## v1.2.0 — ICT loan flow

- Separated Bilik Khas (time-slot) from Peralatan ICT (date-range) flows
- LoanModal (single asset) + BulkLoanModal (multi-asset)
- QR generation per asset; QR scan auto-opens LoanModal
- Asset cloud sync, edit, delete
- Return logging with notes

---

## v1.1.0 — Admin features

- Admin nav (Pentadbir, Laporan)
- Leaderboard view of users by activity
- Comprehensive reports with KPIs and tables
- Print booking slips, list, and full report
- Bookings CSV export

---

## v1.0.0 — Initial release

- Bilik Khas booking with conflict check
- Equipment + asset inventory
- localStorage persistence
- Vite + React + Tailwind setup
