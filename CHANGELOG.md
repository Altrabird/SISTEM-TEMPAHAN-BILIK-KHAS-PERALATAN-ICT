# Changelog

Major milestones for the TEMPAH project.

## v1.7.0 — In-App QR Scanner, Room QR, New Brand Identity (current)

**Scan-driven booking is now a first-class flow on both sides — ICT
loans AND Bilik Khas. Brand identity refreshed with a new TEMPAH logo
applied across every install surface and in-app brand chip. Bulk loan
joins bulk return in emitting a single Telegram digest. Several
high-friction UI bugs ironed out.**

### In-app QR scanner (new)

| Piece | What it does |
|---|---|
| `QRScannerModal` | html5-qrcode camera view + front/back toggle + manual-entry fallback when permission denied or sticker damaged |
| `ScannedActionSheet` | After decode, resolves the id and shows context-aware actions — **Pinjam Sekarang** / **Pulangkan Sekarang** / **Rekod Pemulangan (Admin)** / **Tempah Bilik Ini** / lock warnings / "asset on loan to X" — so one tap = right place |
| `ScanFab` | Mobile-only floating button bottom-right, two pulsing halo rings + spring-in mount, first-visit instruction tooltip that auto-dismisses after 7s |
| Desktop scan button | Pill in the header bar next to "Tempahan Baru" |
| `parseScannedId` | Forgiving parser — accepts full URLs (`?loan=ast-X`, `?book=room-X`), bare ids, or raw typed text |

The action sheet has 7+ branches by resolved state (available asset,
loan-to-me, loan-to-others-as-admin, loan-to-others-as-user, locked,
damaged, room, unknown id) so the user is never asked "what do you
want to do?" when the answer is obvious from context.

A short detour to make the FAB draggable was rolled back — on
mid-range Android the per-frame React reconciliation made the button
stutter, and the fixed glowing version was a better trade-off than
a drag that stuck. Halo rings replaced "discoverable" with "obvious".

### Room QR codes (new)

`QRCodeModal` refactored to accept a discriminated `target` prop
(`asset | room`). Same UI shell, kind-specific labels and sticker
copy. Each Bilik Khas now has an admin-only QR button (next to the
edit pencil) that prints/downloads a sticker encoding
`?book=room-X` — scan from outside the app and the BookingModal opens
pre-filled with that room. Symmetric with the ICT asset flow.

Both `?loan=ast-X` and `?book=room-X` URL params are now consumed on
app boot, then stripped from the address bar so a refresh doesn't
re-trigger.

### Bulk loan single-message digest

Pinjaman Pukal was firing the per-row INSERT trigger N times,
flooding the Telegram group with one "Pinjaman ICT Baharu" per asset
(see screenshot the user shared mid-session). Now mirrors the bulk
return pattern:

- New `tempah.suppress_loan_notify` session-config flag honoured by
  `notify_booking_telegram()`
- New RPC `bulk_loan_assets(rows, by_user_id, by_user_name,
  start_date, return_date, start_time, end_time, purpose, created_at)`
  inserts all rows with the suppress flag set, then emits ONE
  "📦📦 Pinjaman Pukal ICT" digest listing every unit
- Frontend `submitBulkLoan` calls the new RPC in one round-trip
  instead of looping `syncBookingToCloud`

### Bulk loan period UI rework

User feedback: "1 Hari / 3 Hari / 1 Minggu / 2 Minggu / Pilih" was
cluttered and only let you set a return date. Simplified to **1 Hari
/ 1 Minggu / 1 Bulan / Pilih**, and "Pilih" now exposes both **Dari**
and **Hingga** date pickers with start-date validation that
auto-bumps the end when the start moves past it.

### Dashboard return status

A returned ICT loan showing on "Tempahan Hari Ini" used to look
identical to an active one — same blue accent, raw purpose text, no
"balik dah" cue. Now the card switches to emerald: green left
accent, time pill flips `MULA` → `PULANG`, a small **✓ Dipulangkan**
badge appears beside the resource name, and the sub-line replaces
the purpose with a status summary —
*"Pulang TEPAT pada masa · 2026-05-12 · oleh HARSIDI"* (or
AWAL X / LEWAT X hari, coloured amber when late).

### New brand identity

Full app-icon swap to a custom 3D-calendar-T logo:

- New `scripts/prep-logo.mjs` (sharp-based): colour-keys near-black
  background pixels to alpha=0, trims, pads to square, applies a
  circular SVG mask via `dest-in`. Idempotent.
- New `scripts/move-icons.mjs`: relocates generated icons from
  repo root → `public/` after each regen.
- `npm run icons` now chains prep → generate → move.
- Source `logo-source.png` lives at **repo root** (not in `public/`)
  so the 1.4MB original isn't shipped — only the compressed
  generated icons (3–60KB each) reach clients.
- Manifest `background_color` switched from `#0f172a` (slate-900) to
  `#172554` (blue-950) so the PWA splash blends with the logo's
  outer ring instead of fighting it.
- In-app sidebar brand chip + onboarding welcome panel both use
  `<img src="/pwa-192x192.png">` (already precached at 14KB) so the
  install icon and the in-app brand visually match.

### Critical bug fixes

- **N/A on Dashboard / Portfolio / Reports / Admin / Bookings** —
  every view that surfaced a booking's resource name was only
  searching rooms + equipment categories, but ICT loans store an
  asset id (`ast-X`) as resourceId. Returned "N/A" for every ICT
  loan. Fixed with a shared `resolveResourceName()` helper
  (rooms → equipment categories → assets `"Asset Name (Category)"` →
  raw id fallback). Applied to all 5 views via a memoized `nameOf`
  callback.
- **Image upload silently dropped to `image_url`** — `.upsert()`
  ran as `INSERT … ON CONFLICT DO UPDATE` and was silently filtered
  by RLS (rooms / equipment have UPDATE but no INSERT policy).
  Local state showed the new image; cloud row stayed `NULL`;
  picture vanished on next page load. Fixed by switching to
  `.update().eq('id', ...).select()`; 0-rows-affected now surfaces
  as an alert + console.error so a future regression can't hide.
- **`HH:MM:SS` vs `HH:MM` mismatch on bookings** — Postgres `time`
  columns came back from Supabase as `HH:MM:SS` while optimistic
  local state used `HH:MM`. Cards rendered both formats side by side
  on the same screen. Fixed with a `normalizeTime()` trimmer in
  `fetchBookingsFromCloud`.

### UI fixes

- BookingModal overflow on mobile — header was clipping past the top
  edge and the submit button was being pushed off the bottom.
  Restructured with `max-h-[92vh] flex flex-col` + sticky header +
  internal scroll, tightened mobile padding (`p-5` instead of `p-8`),
  `min-w-0` on grid children to prevent over-stretch.
- Action sheet buttons were left-aligned at content width inside
  `space-y-4` block layout (default `<button>` is `inline-block`).
  Added `w-full` to both `ActionButton` variants → buttons span the
  full sheet width edge-to-edge.

### Schema additions

- `public.bulk_loan_assets(jsonb, text, text, date, date, time, time, text, timestamptz)` RPC
- `tempah.suppress_loan_notify` session-config flag honoured by `notify_booking_telegram()`

### Files added

- `src/components/QRScannerModal.tsx`
- `src/components/ScannedActionSheet.tsx`
- `src/components/ScanFab.tsx`
- `src/lib/resources.ts` (`resolveResourceName`)
- `scripts/prep-logo.mjs`
- `scripts/move-icons.mjs`
- `logo-source.png` (repo root — source of truth for icon regen)

### Deps

- Added `html5-qrcode@^2.3.8` (~350KB gzipped; bundle now 1.3MB total)

---

## v1.6.0 — Telegram Notifications + Bulk Workflows

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
