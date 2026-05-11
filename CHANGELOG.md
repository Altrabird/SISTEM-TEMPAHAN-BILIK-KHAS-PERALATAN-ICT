# Changelog

Major milestones for the TEMPAH project.

## v1.5.0 — Telegram Notifications (current)

### Major
- Telegram bot integration ("Tempah@SKBT") posting to a group/channel
- Instant notification on every booking INSERT (rooms + ICT loans)
- Instant notification on every return (status → 'returned') with
  early / on-time / late label, recorder name, and condition notes
- Instant notification on every cancel (status → 'cancelled') with
  admin/self attribution + optional reason
- Daily 06:30 MY morning digest — today's room bookings + multi-day
  loans currently active (silent if nothing to remind)
- Daily 08:00 MY digest of overdue ICT loans + ESOK-due reminders
- Admin can cancel any booking (not only their own); cancellation
  attribution is recorded in cancelled_at, cancelled_by_id/name,
  cancel_reason columns
- Pemulangan Pukal: select-multiple in MyLoansView + single Supabase
  RPC call (bulk_return_loans) that updates all rows AND sends ONE
  consolidated Telegram digest. Per-row return trigger is suppressed
  during the bulk via tempah.suppress_return_notify session config.
- Pure SQL implementation — no edge functions needed:
  - `pg_net` for async HTTP from Postgres
  - `pg_cron` for daily schedule
  - Supabase Vault for encrypted bot-token + chat-id storage
  - `tg_send(text)` helper, `notify_booking_telegram()` trigger,
    `tg_remind_overdue_loans()` cron callback

### Notes
- Trigger fires server-side on the DB row, so it catches bookings made
  via the app, direct SQL, or any future client — single source of truth.
- Notifications fail silently (warning only) — never block a booking save.

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
