# Changelog

Major milestones for the TEMPAH project.

## v1.9.2 — Nota Akses ke Email Peminjam (current)

**Pivot keselamatan: kata laluan tidak lagi muncul di Telegram group
chat atau di mana-mana skrin app. Sebaliknya, Nota Akses dihantar
terus ke email peribadi peminjam melalui Gmail SMTP, dengan logik
"first time = auto, repeat = opt-in" supaya inbox tidak di-spam.**

### Mengapa

v1.9.1 letak nota akses di mesej Telegram dan kad pinjaman in-app.
Telegram group dilihat oleh semua admin + bot — kebocoran password
yang nyata. Kad in-app pula muncul di senarai pinjaman peminjam yang
dilihat oleh sesiapa yang pinjam peranti mereka (tab terbuka, dll.).
Email peribadi adalah saluran 1-ke-1 yang lebih sesuai untuk
maklumat sulit.

### Aliran baru

| Senario | Tindakan |
|---|---|
| Pinjam unit baharu yang ada Nota Akses | Email auto-dihantar (tiada toggle) |
| Pinjam unit yang sama untuk kali ke-2+ | Toggle opt-in muncul di modal — default OFF |
| Profil tiada email | Submit di-block; butang "Set Email Saya" buka EditProfileModal |
| Hilang email asal? | Butang "Hantar Semula" pada kad pinjaman aktif di Pinjaman Saya |
| Admin / Telegram | Lihat indikator "🔐 Nota akses dihantar ke email peminjam" sahaja — tiada kebocoran |

### Infrastruktur

- **Supabase Edge Function**: `send-password-email` (Deno + `denomailer`)
  - Server-side lookup dari `loanId` → bookings → assets → profiles
    (service-role bypass RLS supaya frontend tidak perlu kongsi
    access_note dalam request body)
  - SMTP via `smtp.gmail.com:465` TLS implicit
  - HTML email berformat (gradient header, monospace credentials block,
    branded footer) + plain-text fallback
- **Env secrets** (set via Supabase Dashboard → Edge Functions → Manage secrets):
  - `GMAIL_USER` — e.g. `tempah.skbt@gmail.com`
  - `GMAIL_APP_PASSWORD` — 16-aksara App Password dari Google
- **Auto-injected**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Perubahan SQL

| Objek | Perubahan |
|---|---|
| `public.notify_booking_telegram()` | Buang `🔐 Nota Akses: <code>...</code>` line. Tambah indikator `🔐 Nota akses dihantar ke email peminjam` (atau ⚠️ warning bila peminjam tiada email). |
| `public.bulk_loan_assets()` | Per-unit line jadi `🔐 ada nota akses` (tanpa nilai). Tambah summary `🔐 N unit ada nota akses — dihantar ke email peminjam`. |

Migration name: `drop_access_note_from_telegram_v1_9_2`. Backward compat:
lajur `assets.access_note` kekal — hanya jalan keluarnya yang berubah.

### Files baharu/diubah

- `supabase/functions/send-password-email/index.ts` — **NEW** Edge Function
- `src/lib/loanEmail.ts` — **NEW** `isFirstBorrowOfAsset()` + `shouldAutoSendPassword()` helpers
- `src/lib/storage.ts` — **NEW** `sendLoanPasswordEmail(loanId, mode)` wrapper untuk `supabase.functions.invoke`
- `src/components/LoanModal.tsx` — 3-mode email gating: auto-banner (first), opt-in toggle (repeat), hard-block + "Set Email Saya" (no email)
- `src/components/BulkLoanModal.tsx` — sama logic per-asset; auto-send untuk first-time subset, opt-in checkbox untuk repeat subset
- `src/views/MyLoansView.tsx` — buang `AccessNoteBlock`, ganti `ResendPasswordEmailButton` (blue card dengan "Hantar Semula")
- `src/views/ActiveLoansView.tsx` — buang inline nota akses, ganti `🔐 Nota akses → email peminjam` indicator
- `src/components/AddAssetModal.tsx` & `EditAssetModal.tsx` — helper text dikemaskini supaya admin tahu nota tidak ke Telegram lagi
- `src/App.tsx` — `submitLoan` + `submitBulkLoan` trigger `sendLoanPasswordEmail` selepas insert berjaya (dengan 600-800ms delay untuk pastikan row landed)
- `supabase/notify_setup.sql` — reference file mirror SQL deployed

### Setup untuk admin (sekali sahaja)

1. Buat Gmail account khas, cth: `tempah.skbt@gmail.com`
2. Enable 2FA di Google Account → Security
3. Generate App Password 16-aksara di [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Di Supabase Dashboard → project → Edge Functions → Manage secrets:
   - `GMAIL_USER` = `tempah.skbt@gmail.com`
   - `GMAIL_APP_PASSWORD` = `xxxx xxxx xxxx xxxx` (16-aksara, tanpa ruang OK)
5. Selesai — pinjam aset yang ada nota akses, email auto sampai

---

## v1.9.1 — Nota Akses per-Aset

**Setiap unit ICT kini boleh mempunyai "Nota Akses" admin-only — kata
laluan laptop, PIN aplikasi, atau apa-apa info akses kongsi. Bila aset
itu dipinjam, nota dihantar serta-merta ke Telegram dan dipaparkan
pada kad pinjaman peminjam dengan butang "Salin" sekali tap.**

### Kenapa

Sekolah biasa kongsi password untuk laptop pelajar (cth: `pelajar /
skbt2026`). Sebelum ini, admin terpaksa beritahu peminjam secara
manual setiap kali. Sekarang, nota disimpan sekali pada aset itu dan
auto-disampaikan setiap pinjaman.

### Lokasi UI

- **Admin (sahaja yang boleh edit)**:
  - `AddAssetModal` & `EditAssetModal` — kotak amber "Nota Akses
    (pilihan)" di atas bahagian Kunci, dengan placeholder & helper
    text yang jelas.
  - `ActiveLoansView` — baris admin tunjuk nota inline (truncated)
    sebagai rujukan.
- **Peminjam (auto)**:
  - `MyLoansView` — kad pinjaman aktif kini ada banner amber dengan
    nota + butang "Salin" yang panggil `navigator.clipboard.writeText`
    + flash "Salin!" 1.5 saat.
  - Telegram notification — baris `🔐 Nota Akses: <code>...</code>`
    dilampirkan pada mesej "Pinjaman ICT Baharu" dan setiap unit dalam
    digest "Pinjaman Pukal ICT".

### Privacy / RLS

Lajur `assets.access_note` adalah `text` biasa, tidak disorok di
peringkat database (RLS sedia ada `read all assets` membaca semua
kolum). Penyembunyian dilakukan di UI:

- Borrower nampak nota hanya jika `booking.userId === profile.id` dan
  pinjaman masih `status !== 'returned'`.
- Admin nampak di modal edit + admin table.
- Pengguna lain langsung tidak ada lokasi untuk lihat — kad aset awam
  & senarai pilihan **tidak** baca medan `accessNote`.

Jika sekolah perlukan privacy lebih ketat (cth: encrypt at rest),
ini adalah pivot point untuk migrate ke pgsodium / Vault — tetapi
tidak dilakukan dalam v1.9.1 sebab use case adalah password kongsi
yang **memang** sengaja dikongsi dengan peminjam.

### Perubahan SQL

| Objek | Perubahan |
|---|---|
| `public.assets` | `+ access_note text` (nullable) |
| `public.notify_booking_telegram()` | SELECT lampiran `access_note` + baris `🔐 Nota Akses` bila is_loan & note ada. Juga tambah suppress check untuk `tempah.suppress_booking_notify` (housekeeping — sebelum ini hanya `suppress_loan_notify` di sini). |
| `public.bulk_loan_assets()` | Per-unit lines dalam digest kini ada baris `🔐 <code>...</code>` bila aset itu ada nota. |

Migration name: `add_access_note_to_assets_and_notify` (idempotent).
File reference: `supabase/schema.sql` + `supabase/notify_setup.sql`.

### Files

- `src/types.ts` — Asset gets `accessNote?: string`
- `src/lib/storage.ts` — `rowToAsset()` + `upsertAssetToCloud()`
  round-trip `access_note`
- `src/components/AddAssetModal.tsx` & `EditAssetModal.tsx` — amber
  textarea card with `KeyRound` icon
- `src/views/MyLoansView.tsx` — `<AccessNoteBlock>` inline component
  with copy-to-clipboard
- `src/views/ActiveLoansView.tsx` — admin row tunjuk nota truncated

---

## v1.9.0 — Range + Bulk Room Booking

**The Borang Tempahan form now has three modes. The teacher can book a
single slot (existing behaviour), a contiguous range of days
(Julat Hari), or a free-form list of independent slots (Pukal) — all in
one submission with an all-or-none conflict guarantee and ONE
consolidated Telegram digest per batch.**

### Three booking modes

The mode selector appears below the resource picker, but only when the
selected resource is a **room**. Equipment loans go through the
dedicated LoanModal / BulkLoanModal flows (different semantics: a loan
is one booking spanning many days; a room booking is one row per slot).

| Mode | UI | Output | Best for |
|---|---|---|---|
| **Satu Hari** | Date + Waktu Mula + Waktu Tamat | 1 booking | One-off bookings — unchanged |
| **Julat Hari** | Dari + Hingga + Waktu Mula + Waktu Tamat | N bookings (one per day, all same time) | Exam week, multi-day workshop |
| **Pukal** | List of `{date, startTime, endTime}` rows + "Tambah Slot" | N bookings (each independent) | Weekly recurring class, split-week schedule |

Range mode caps at 60 days to prevent year-long fat-finger submissions.
Range UI shows a live "N hari × 1 slot = N tempahan" preview.

### All-or-none conflict checking

For range + bulk modes, every candidate slot is conflict-checked against:
1. Existing bookings — would two teachers compete for the same time?
2. Other candidates in the same submission — did the user accidentally
   add two overlapping rows?

If anything fails, the **whole batch is rejected** with a listing of
the offending slots — nothing partial gets saved. The error message
shows up to 5 conflicts inline + a "…dan N lagi" overflow.

### Telegram doesn't get spammed

A 7-day range booking would have fired 7 individual "🚪 Tempahan Bilik
Baharu" messages with the old per-row trigger. Now:

- New session-config flag `tempah.suppress_booking_notify` honoured by
  `notify_booking_telegram()` alongside the existing
  `suppress_loan_notify` flag from v1.6
- New RPC `bulk_book_rooms(rows jsonb, by_user_id, by_user_name,
  purpose)` inserts all rows with the suppress flag set, then emits
  ONE consolidated **"🚪🚪 Tempahan Bilik Pukal"** digest listing
  every slot (sorted by date, then start time)
- Same pattern as `bulk_loan_assets` (v1.7) and `bulk_return_loans`
  (v1.6) — the suppress-flag convention is now a project standard

### Optimistic UI with rollback

Frontend conflict-check happens BEFORE the cloud round-trip so the
user gets instant feedback. After validation, the candidate rows are
inserted into local React state first, then the cloud RPC fires. If
the RPC fails (e.g. network drop), we roll back the local insert AND
surface the error — no phantom bookings hanging around.

### Schema additions

- `public.bulk_book_rooms(jsonb, text, text, text)` RPC
- `tempah.suppress_booking_notify` session-config flag honoured by
  `notify_booking_telegram()`

### Files added / changed

- `src/components/BookingModal.tsx` — full rewrite, 3-mode tabs +
  conditional date/time blocks + slot list editor
- `src/lib/storage.ts` — new `bulkBookRoomsInCloud()` helper
- `src/App.tsx` — new `submitBulkBookings()` handler wired to
  `onSubmitMany` prop

---

## v1.8.0 — Admin Lifecycle: Visibility, Create + Delete Categories

**Admin now has full lifecycle control over rooms and equipment categories
— previously they could only edit pre-seeded rows. New visibility axis
sits alongside lock; users can be shown the row + reason (lock) OR not
shown at all (hidden). All flows wired through one consistent set of
RLS policies + storage helpers.**

### Visibility (hidden flag)

A third state on every Resource and Asset, distinct from lock:

| Control | What user sees | Use case |
|---|---|---|
| **Lock** (existing) | Row visible + amber badge with reason | "Cannot book — being repaired" |
| **Hidden** (NEW) | Row absent from picker / card / scan | "Take offline during exam season"; "Stage new gear before announcing"; "Retire old unit" |

- Schema: `rooms.hidden`, `equipment.hidden`, `assets.hidden` boolean columns
- New `src/lib/visibility.ts` with `visibleFor(items, isAdmin)` filter
- Eye / EyeOff toggle on every card + list row in ResourceManagementView
  and AssetListModal — admin-only
- Admin sees hidden cards with slate-dashed border, ~75% opacity, red
  **"Disorok"** ribbon. Non-admin doesn't see them at all
- ScannedActionSheet handles hidden case for non-admin: shows generic
  "Tidak Tersedia" — no name leak, no booking buttons
- All consumer paths (BookingModal dropdown, BulkLoanModal asset picker,
  AssetListModal, both ResourceManagementViews) now receive
  `visibleRooms` / `visibleEquipment` / `visibleAssets` from App.tsx
- Bulk hide/show added to BulkAssetActionsModal as 2 of 6 grid actions
  (rose-pink + teal-emerald gradients), with explainer panels

### Create category

Previously rooms + equipment were seeded via migrations only — the UI
button labelled "Tambah Alatan" actually opened add-individual-unit
flow inside an existing category, which was confusing.

- New `AddResourceModal` mirrors EditResourceModal layout but pre-allocates
  a unique id (`<prefix>-<timestamp>-<rand>`) so image uploads can use
  it as the storage filename and never collide with seeded ids
- New `insertResourceInCloud(resource)` helper in storage.ts
- New `addResource(r)` handler in App.tsx — optimistic local insert,
  rollback + alert on cloud failure
- "+ Tambah Bilik" button on Bilik Khas page (didn't exist before)
- "+ Tambah Alatan" → "+ Tambah Kategori" on Peralatan ICT page
- RLS opened: new `insert rooms` + `insert equipment` policies

### Delete category

- New `deleteResourceInCloud(resource)` helper
- New `deleteResource(r)` handler with cascade-aware confirms:
  - **Equipment with N child assets** → warns "Memadam kategori akan
    PADAM SEMUA N unit tersebut juga", deletes child rows first (FK
    `assets_resource_id_fkey` would block otherwise), then the category
  - **Empty equipment category** → simple confirm
  - **Room** → confirms with note that historical bookings will fall
    back to raw-id rendering via `resolveResourceName`
- Returns `boolean` so EditResourceModal knows whether to close
- Optimistic local removal happens AFTER cloud delete succeeds (different
  from add/edit) — failed deletes are recoverable, no flash-remove
- New "Zon Bahaya" section at the bottom of EditResourceModal with
  rose-bordered "Padam Bilik / Kategori Ini" button + spinner
- RLS opened: new `delete rooms` + `delete equipment` policies

### Schema additions

- `rooms.hidden boolean not null default false`
- `equipment.hidden boolean not null default false`
- `assets.hidden boolean not null default false`
- Policies: `insert rooms`, `insert equipment`, `delete rooms`, `delete equipment`

### Files added

- `src/lib/visibility.ts` — `visibleFor()` + `isHiddenFromUser()`
- `src/components/AddResourceModal.tsx` — admin create flow

---

## v1.7.0 — In-App QR Scanner, Room QR, New Brand Identity

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
