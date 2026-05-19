# TEMPAH — Project Blueprint

> Quick-start doc for AI assistants and new developers. Optimised for fast
> orientation in a fresh chat session. Read this first; jump to specific
> files only when you need detail.

**Live:** https://tempah.altrabird.click
**Repo:** https://github.com/Altrabird/SISTEM-TEMPAHAN-BILIK-KHAS-PERALATAN-ICT
**Stack:** React 19 + TypeScript + Vite 6 + Tailwind v4 + Supabase + PWA
**Owner:** SK Bandar Tawau (Malaysian primary school)

---

## 1. What this is

A booking system for school resources, two parallel flows:

- **Bilik Khas (Special rooms)** — lab, hall, panitia rooms. Booked with
  date + start/end time slots; conflict-checked so two teachers can't
  book the same slot.
- **Peralatan ICT (Equipment)** — laptops, PCs, LCD projectors. Loaned
  for a number of days (date range). Each physical unit ("asset") has a
  unique QR sticker; teacher scans → form auto-opens for that unit.

Profiles are first-class. Every teacher has a portfolio with
achievements, streak, stats. Admin lock-down, bulk actions, return
logging, printable reports all included.

---

## 2. Tech & deps

| Layer | Pick |
|-------|------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind v4 (`@tailwindcss/vite`), Inter font |
| Animation | `motion` (Framer Motion) |
| Icons | `lucide-react` |
| Backend | Supabase (Postgres + Storage + RLS) |
| QR | `qrcode` |
| PWA | `vite-plugin-pwa` + `@vite-pwa/assets-generator` |
| Hosting | Contabo VPS, Nginx + Certbot |

Source of truth: **Supabase**. localStorage is offline cache only.

---

## 3. File map

```
src/
├── App.tsx                    Layout shell, routing, top-level state
├── main.tsx                   Mount
├── types.ts                   Profile, Booking, Resource, Asset, Achievement
├── constants.ts               INITIAL_*, ROLE_LABELS, ADMIN_DEFAULTS, ACHIEVEMENTS
├── index.css                  Tailwind + safe-area-bottom
├── vite-env.d.ts              VITE_* env types
│
├── lib/
│   ├── supabase.ts            createClient, isSupabaseEnabled flag
│   ├── storage.ts             ALL Supabase CRUD + localStorage fallback
│   ├── achievements.ts        computePortfolioStats (KPIs + unlock logic)
│   ├── locks.ts               isResourceLocked, isAssetLocked, lockReasonOf
│   ├── visibility.ts          visibleFor(items, isAdmin), isHiddenFromUser
│   ├── dates.ts               todayLocalISO, addDaysLocalISO, daysBetween
│   ├── resources.ts           resolveResourceName — id → "Asset (Category)" / room / fallback
│   └── qr.ts                  loanUrl, bookUrl, generateQrDataUrl, openBulkQrSticker
│
├── views/
│   ├── DashboardView.tsx       Utama (hero + KPIs + today's bookings)
│   ├── PortfolioView.tsx       Profile, achievements gallery, charts
│   ├── BookingsView.tsx        Arkib Tempahan (table desktop / cards mobile)
│   ├── ResourceManagementView.tsx  Bilik / Peralatan grid (used twice)
│   ├── MyLoansView.tsx         Pemulangan (borrower self-return)
│   ├── ActiveLoansView.tsx     Pinjaman ICT (admin: all loans + filters)
│   ├── AdminView.tsx           Pentadbir (leaderboard + drill-down)
│   ├── ReportsView.tsx         Laporan (printable summary)
│   └── SettingsView.tsx        Tetapan (admin: profile editor, reset, backend)
│
└── components/
    ├── OnboardingModal.tsx     First-run profile picker (Cipta / Pilih / Admin)
    ├── BookingModal.tsx        Generic booking — 3 modes (Satu Hari / Julat Hari / Pukal) for rooms
    ├── LoanModal.tsx           Single-asset ICT loan (purpose + tempoh)
    ├── BulkLoanModal.tsx       Multi-asset ICT loan (2-step picker)
    ├── BulkAssetActionsModal.tsx  Admin: lock/status/delete in bulk
    ├── ReturnLoanModal.tsx     Mark loan as returned + condition notes
    ├── BulkReturnModal.tsx     Confirm batch return + shared notes
    ├── AssetListModal.tsx      Asset grid for a category (+ eye toggle on each unit)
    ├── AddAssetModal.tsx       Admin: register new unit (within existing category)
    ├── AddResourceModal.tsx    Admin: register NEW room or equipment category
    ├── EditAssetModal.tsx      Admin: full asset edit (incl. delete)
    ├── EditResourceModal.tsx   Admin: room/category edit (incl. lock + Zon Bahaya delete)
    ├── EditProfileModal.tsx    Self profile edit (avatar upload)
    ├── LockAssetModal.tsx      Quick lock/unlock with reason
    ├── QRCodeModal.tsx         Polymorphic QR + sticker (target = asset | room)
    ├── QRScannerModal.tsx      In-app camera scanner (html5-qrcode + manual entry)
    ├── ScannedActionSheet.tsx  Smart router — resolves scanned id → context actions
    ├── ScanFab.tsx             Mobile floating scan button (fixed, glowing halo)
    └── PWAUpdatePrompt.tsx     Auto-update banner

deploy/
├── nginx.conf                 ⚠ HTTP-only — Certbot adds HTTPS in place
├── deploy.sh                  Pull → build → atomic symlink swap → reload
└── README.md                  Setup + recovery (BM)

supabase/
├── schema.sql                 Idempotent — re-runnable
└── notify_setup.sql           Telegram trigger + cron + Vault setup

public/
├── favicon.ico                Generated — regenerate via `npm run icons`
└── pwa-*.png, maskable-*.png, apple-touch-icon-*.png  All from logo-source.png

logo-source.png                Brand source at REPO ROOT (not in public/) so
                               the 1.4MB original doesn't ship to clients.
                               `npm run icons` masks it + regenerates everything.

scripts/
├── prep-logo.mjs              Sharp: colour-key dark bg to alpha + circle mask
└── move-icons.mjs             Relocate generated icons to public/ after regen
```

---

## 4. Data model (Supabase)

| Table | Key columns | Notes |
|-------|-------------|-------|
| `profiles` | id, name, role, department, email, avatar_url, joined_at, last_active_at | role: guru/admin/pelajar/staf |
| `rooms` | id, name, capacity, image_url, description, locked_reason, **hidden** | RLS: SELECT/INSERT/UPDATE/DELETE all open |
| `equipment` | id, name, quantity, image_url, description, locked_reason, **hidden** | category-level; same RLS as rooms |
| `assets` | id, resource_id→equipment, name, serial_number, specifications, image_url, status, locked_reason, **hidden** | individual units |
| `bookings` | id, resource_id, resource_type, user_id, user_name, date, return_date, start_time, end_time, purpose, status, created_at, returned_at, returned_by_id, returned_by_name, return_notes, cancel_* | status: pending/confirmed/cancelled/returned |

**RLS**: open read + write everywhere (anon key). Internal school tool;
fine. For public deploy → switch to `auth.uid()` policies.

**Visibility vs Lock** (orthogonal admin controls on `rooms` + `equipment` + `assets`):
- `locked_reason` (text or null) — row visible to users, with reason
  shown; booking blocked.
- `hidden` (boolean) — row absent from users entirely; admin still sees
  it with a "Disorok" indicator. Use `lib/visibility.ts` `visibleFor()`
  to filter at every consumer boundary.

**Storage bucket `images`**: public read + anon write. Used for avatars,
room/asset photos.

---

## 5. Critical patterns (don't break these)

### Modal structure
```tsx
<AnimatePresence>{open && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
    <motion.div /* backdrop */ className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
    <motion.div /* CONTENT — must have `relative` */ className="relative bg-white rounded-2xl ...">
      ...
    </motion.div>
  </div>
)}</AnimatePresence>
```
**Without `relative` on content**, the absolute backdrop paints OVER it →
modal looks washed out. Bug fixed in commit `2e90314`.

### Date handling — ALWAYS use `lib/dates.ts`
```ts
import { todayLocalISO, addDaysLocalISO, daysBetween } from '../lib/dates';
```
Never `new Date().toISOString().split('T')[0]` — that returns UTC and
breaks for users east of GMT (e.g. Malaysia UTC+8). Bug fixed in `9a6ccaa`.

### Year-agnostic copy
No "2026" in user-facing strings. Use `new Date().getFullYear()` if
needed. Internal storage keys (`skbt_*_2026`) are OK.

### Storage layer
Always go through `src/lib/storage.ts`. Never call `supabase.from(...)`
in components. Helpers handle:
- localStorage fallback when Supabase is off
- Cloud writes that mirror to local cache
- Schema mapping (snake_case ↔ camelCase)

### Color system (Hadir@SKBT-inspired vibrancy)
- Brand blue: `from-blue-700 to-indigo-900` (sidebar / mobile header)
- KPI gradients: emerald, orange, blue, purple cards
- Status: emerald=available/returned, amber=locked/borrowed, rose=cancelled, blue=confirmed
- Section headers: small coloured icon badge + title + count pill

### Mobile rules
- Sidebar = drawer on mobile (hamburger), fixed on desktop
- Bottom nav (5 items) on mobile only
- Modals dock-to-bottom on `< sm`, centered on `>= sm`
- Tables → cards on mobile (`hidden md:block` for table, mobile cards above)
- Padding: `p-4` mobile, `p-8` desktop
- Touch targets ≥ 44px

---

## 6. Conventions

| Aspect | Convention |
|--------|------------|
| Language (UI) | Bahasa Malaysia |
| File names | PascalCase for components/views, camelCase for libs |
| State | Co-located in App.tsx; modals lifted via state, not Context |
| Network | Fire-and-forget `void syncXToCloud(x)` after local state update |
| Errors | Toast/alert for non-trivial; inline error block for forms |
| Supabase calls | Always non-blocking on UI mutation; cache-first reads |
| Admin-only routes | Check `profile?.role === 'admin'` AND show "Akses Terhad" card if direct URL |

---

## 7. Default credentials

```
Admin login: admin / admin
```
Override via `.env.local`:
```
VITE_ADMIN_ID=...
VITE_ADMIN_PASSWORD=...
```
Baked into JS bundle at build time. Change before public launch.

---

## 8. Deploy (current: manual)

From PowerShell:
```powershell
ssh root@tempah.altrabird.click "/opt/tempah/deploy/deploy.sh"
```

What it does (`deploy/deploy.sh`):
1. `git pull --rebase`
2. `npm ci`
3. `npm run build`
4. Copy `dist/*` → `/var/www/tempah/releases/<timestamp>/`
5. Atomic symlink swap → `/var/www/tempah/dist`
6. Prune to last 5 releases
7. `systemctl reload nginx` (graceful, doesn't affect other VPS apps)

**Never** copy `deploy/nginx.conf` over `/etc/nginx/sites-available/...`
after first Certbot run — it wipes the HTTPS block. Recovery:
```bash
certbot --nginx -d tempah.altrabird.click
```

---

## 9. Common pitfalls (fixed; don't reintroduce)

| Bug | Symptom | Fix in |
|-----|---------|--------|
| Modal backdrop on top of content | Modal looks transparent | Add `relative` to content div |
| UTC dates | "1 Hari" preset shows same date | Use `lib/dates.ts` |
| Conflict check includes 'returned' | Re-borrow blocked even after return | `isActiveBooking()` excludes both cancelled + returned |
| Native scrollbars on modals | Ugly grey bar on right | `.scrollbar-hide` utility class |
| nginx.conf overwrite | tempah.altrabird.click serves another site | Re-run certbot |
| LF/CRLF on Windows clone | git noise on every save | `.gitattributes` if it ever bothers |
| deploy.sh permission denied | Just `bash` it once | `git update-index --chmod=+x` already applied |
| Tailwind purge missing class | Style absent in build | Use full literal class names, no string interp |
| Bulk-update spamming Telegram | N triggers fire, N messages | Use RPC + `set_config('tempah.suppress_*_notify','on',true)`. Three flags exist: `suppress_loan_notify` (bulk_loan_assets), `suppress_return_notify` (bulk_return_loans), `suppress_booking_notify` (bulk_book_rooms). Add another when you build the next bulk-insert RPC |
| `.upsert()` silently dropping writes | Local state updates, cloud row stays NULL | RLS may have UPDATE but no INSERT. Use `.update().eq('id',...).select()` and treat 0 rows affected as an error |
| Bookings showing `HH:MM` vs `HH:MM:SS` side by side | Postgres `time` columns come back with seconds | `normalizeTime()` trim in `fetchBookingsFromCloud` |
| Dashboard / Portfolio etc. showing "N/A" for ICT loans | View searched only rooms + equipment categories; loans store asset id | Use `resolveResourceName()` from `lib/resources.ts` everywhere |
| html5-qrcode qrbox overlay off-centre | `aspectRatio` constraint + custom `qrbox` while CSS object-cover crops | Drop both — let camera use native aspect, use only the CSS purple corner brackets |
| BookingModal clipping on mobile | `p-8 overflow-hidden` with no height cap | `max-h-[92vh] flex flex-col` + sticky header + internal scroll (see BulkLoanModal pattern) |
| Logo source shipping to clients | `logo-source.png` placed in `public/` | Keep it at repo root — `move-icons.mjs` puts the generated copies in `public/` |
| Logo with black square background looks bad as install icon | OS adaptive mask crops a circle → exposes corners → launcher wraps in white circle | Mask to transparent first via `scripts/prep-logo.mjs` |
| New PWA icon not showing on phone home screen | OS caches the install icon; service worker can't replace it | Uninstall + reinstall the PWA. Browser tab favicon refreshes on hard reload, no uninstall needed |
| Hidden rooms / assets still appearing in pickers | View received the unfiltered `rooms` / `equipment` / `assets` instead of the visible-filtered versions | Pass `visibleRooms` / `visibleEquipment` / `visibleAssets` from App.tsx to every non-admin path (BookingModal, BulkLoanModal, AssetListModal, ResourceManagementView). Admin paths get the unfiltered list |
| Deleting an equipment category fails with FK error | Postgres won't drop a row that `assets.resource_id` still references | Cascade-delete child assets first, THEN the category. See `deleteResource` in App.tsx |
| Phantom card vanishes after refresh on cloud-insert failure | Optimistic local insert succeeded but cloud RLS rejected | `addResource` rolls back local state on failure + alerts the admin. Required `insert rooms` / `insert equipment` policies in place |

---

## 10. What's done (v1.9.0)

### Core booking flows
- ✅ Bilik Khas booking with time-slot conflict detection
- ✅ **NEW v1.9**: Bilik Khas booking has 3 modes — Satu Hari / Julat
  Hari (date range, one slot per day) / Pukal (free-form list of
  per-day slots). All-or-none conflict check, single Telegram digest.
- ✅ Peralatan ICT loan: single, bulk, QR-driven (date-range)
- ✅ Conflict check correctly ignores cancelled AND returned bookings
- ✅ Year-agnostic copy + local-timezone date math everywhere

### Inventory + lock + visibility (admin lifecycle)
- ✅ Per-asset Edit + Delete (admin only)
- ✅ Bulk asset actions (lock / unlock / status / **hide** / **show** / delete)
- ✅ Lock system 3 levels: room, equipment category, individual asset
- ✅ **NEW v1.8**: Hidden visibility flag — eye toggle on every card; non-admin can't see hidden rows in pickers, lists, or scan results
- ✅ **NEW v1.8**: Create new Bilik Khas + new Peralatan ICT category from the admin UI (was previously seed-only)
- ✅ **NEW v1.8**: Delete category from EditResourceModal "Zon Bahaya" with cascade-aware confirms (child assets get cleaned up automatically)
- ✅ Per-asset QR sticker + bulk sticker sheet (A4, 18-up)

### Profiles + portfolio
- ✅ Profile + portfolio (avatar upload, achievements, streak, charts)
- ✅ 13-achievement gallery (bronze/silver/gold/platinum)
- ✅ Onboarding (3 modes: Cipta Baru / Profil Sedia Ada / Admin login)
- ✅ Profile picker — load existing profile on new device

### Returns + cancellations
- ✅ Self-service return (borrower's own loans)
- ✅ Admin return on behalf of any borrower
- ✅ Bulk return — checkbox-select multiple → one Telegram digest
- ✅ Self-service cancel (own booking)
- ✅ Admin cancel any booking with optional reason
- ✅ Audit columns: returned_at/by + cancelled_at/by + reasons

### Admin views
- ✅ Pentadbir leaderboard with per-user drill-down to PortfolioView
- ✅ Pinjaman ICT view (all loans, filters: Aktif / Lewat / Pulang)
- ✅ Reports — KPIs, trend chart, top users/resources, printable A4
- ✅ Tetapan — profile editor, reset, backend status

### QR scan-driven flows (new v1.7)
- ✅ In-app QR scanner — html5-qrcode camera + manual-entry fallback
- ✅ Front/back camera toggle, scoped scan area with corner brackets
- ✅ Smart action sheet — context-aware actions for every resolved state:
  available asset → Pinjam, loan-to-me → Pulangkan, loan-to-others (admin)
  → Rekod Pemulangan, locked → reason + view, room → Tempah Bilik Ini
- ✅ Fixed glowing FAB (mobile) + desktop header pill — entry points
- ✅ First-visit instruction tooltip on the FAB, auto-dismisses
- ✅ Per-room QR code (Bilik Khas) — admin-only generate + print sticker
- ✅ Symmetric deep-links: `?loan=ast-X` (ICT) and `?book=room-X` (rooms)

### UI
- ✅ Card / List view toggle for Bilik Khas + Peralatan ICT
- ✅ Mobile-first: drawer + bottom nav, vibrant Hadir@SKBT-style
- ✅ Print-friendly: report, booking list, single slip, asset/room QR, bulk QR
- ✅ Hidden native scrollbars on modals + sidebar + main content
- ✅ PWA — installable, offline app shell, auto-update prompt
- ✅ Custom 3D-calendar-T brand logo across favicon, install icon,
  splash, sidebar chip, onboarding panel — all from one source
- ✅ Dashboard "Tempahan Hari Ini" shows return status pill + summary
  (Pulang TEPAT / AWAL X / LEWAT X hari) for returned loans

### Telegram notifications (8 paths)
- ✅ Instant: booking INSERT (rooms + ICT loans)
- ✅ Instant: return (with early / on-time / late label + notes)
- ✅ Instant: cancel (with admin attribution + optional reason)
- ✅ Bulk return: ONE consolidated digest via `bulk_return_loans()` RPC
  (per-row trigger suppressed via session config flag)
- ✅ Bulk loan: ONE consolidated digest via `bulk_loan_assets()` RPC
  (suppress flag `tempah.suppress_loan_notify`)
- ✅ **NEW v1.9**: Bulk room booking (Julat Hari / Pukal): ONE
  consolidated digest via `bulk_book_rooms()` RPC (suppress flag
  `tempah.suppress_booking_notify`)
- ✅ Daily 06:30 MY morning digest of today's rooms + multi-day loans
- ✅ Daily 08:00 MY overdue + due-tomorrow ICT reminder

Bot token + chat_id in Supabase Vault. Triggers live in DB so they
fire for any source (app, direct SQL, future clients). Failures are
logged but never block a booking save.

### Backend + ops
- ✅ Supabase as source of truth (rooms, equipment, assets, bookings, profiles)
- ✅ Production deploy on Contabo VPS with HTTPS (Certbot)
- ✅ Manual deploy from PowerShell: `ssh root@... "/opt/tempah/deploy/deploy.sh"`

---

## 11. Backlog (prioritised)

1. **Auth (Supabase Auth + magic link)** — only when going public outside school
2. **Auto-deploy via GitHub Actions** — kill the PowerShell ssh step
3. **Per-user Telegram opt-in** — borrowers link their own chat, get private DM
4. **Slot-based room calendar view** — visual week grid for room availability
5. **Year-end archive** — bulk-export bookings to PDF/CSV by year
6. **Receipt mode** — borrower types own loan slip number from physical paper for offline-first
7. **PWA push notifications** — when admin marks a return, notify borrower
8. **Bandwidth-saving image variants** — Supabase storage transformations or responsive `srcset`
9. **Bulk-add assets** — admin pastes a CSV / list to register 20 units at once
10. **Loan extension flow** — borrower requests extra days, admin approves

---

## 12. Quick commands

```bash
# Dev
npm run dev              # http://localhost:3000

# Build + typecheck
npm run lint             # tsc --noEmit
npm run build            # vite build → dist/
npm run icons            # mask logo-source.png → regen PWA icons → move to public/

# Verify production
curl -I https://tempah.altrabird.click
curl https://tempah.altrabird.click/manifest.webmanifest

# Inspect Supabase
# Use the Supabase MCP tool or dashboard SQL editor
```

---

## 13. Things you (Claude) should remember

- The user is the teacher/admin at SK Bandar Tawau, builds in spurts, prefers **action over planning** but appreciates clear summaries.
- They work on **Windows** (PowerShell), VPS is Linux.
- Their VPS has **OTHER APPS** (`hadir-skbt`, `edugames`, `lisa`, `ssb`, `tms`, `ollama`). Touch only `/opt/tempah` and `/var/www/tempah` and `/etc/nginx/sites-*/tempah.altrabird.click`.
- Supabase project ID: `wwixayxxmpametieyvlg` (use the MCP tool prefixed `mcp__c1315f15-...`).
- Default admin password is still `admin` — flag this if user is about to share publicly.
- After every shipping commit, give them a **single PowerShell command** they can copy-paste to deploy.
- Bahasa Malaysia for user-facing text + chat replies. Code + comments in English.
- Push commits to `main` directly — no PR workflow yet.
- Use the bug list (section 9) when something looks wrong; usually it's one of those.
- Telegram bot is `@TempahSKBT_bot` posting to group "Tempah@SKBT"
  (chat_id `-1003958937726`). Token + chat_id stored in Supabase Vault
  as `tg_bot_token` / `tg_chat_id`.
- For ANY change that mass-inserts or mass-updates rows AND has a
  per-row trigger, always use the suppress-config pattern — otherwise
  you spam the Telegram group. Three flags currently exist:
  `tempah.suppress_loan_notify`, `tempah.suppress_return_notify`,
  `tempah.suppress_booking_notify`. The pattern: RPC sets the flag
  with `set_config(..., true)` (session-local), trigger checks the
  flag and returns early. Reference RPCs: `bulk_loan_assets`,
  `bulk_return_loans`, `bulk_book_rooms`.
- Modals MUST have `relative` on the content motion.div — without
  it, the absolute backdrop paints over everything.
- Dates: never `toISOString().split('T')[0]` — always import from
  `lib/dates.ts`. UTC vs Asia/Kuala_Lumpur off-by-one bites otherwise.
- Resource names: never look up by `[...rooms, ...equipment]` alone.
  ICT loans store an asset id, not a category id. Use
  `resolveResourceName(id, rooms, equipment, assets)` from
  `lib/resources.ts` — it handles the asset → "Name (Category)"
  fallback so loans don't render as "N/A".
- Supabase RLS: `rooms` and `equipment` have UPDATE but no INSERT
  policy. So `.upsert()` on those tables silently fails (no error,
  zero rows affected). Use plain `.update().eq('id', ...).select()`
  for edits, and surface 0-rows-affected as an error.
- Logo regen: `npm run icons` reads `logo-source.png` at repo root
  (NOT in `public/`), masks → generates → moves to `public/`. To swap
  the logo, drop a new file at `logo-source.png` and run the command.
  A reusable skill at `~/.claude/skills/pwa-logo-swap/` captures this
  end-to-end workflow for any future Vite+PWA project.
- Visibility filter: when adding a new view that shows rooms/equipment/
  assets to non-admin users, ALWAYS pass `visibleRooms` /
  `visibleEquipment` / `visibleAssets` (memoised in App.tsx via
  `visibleFor()`) — NEVER the raw `rooms` / `equipment` / `assets`.
  Admin paths get the unfiltered list so they can see + toggle hidden
  rows. Same rule applies in `ScannedActionSheet` — use
  `isHiddenFromUser(item, isAdmin)` before exposing actions.
- Cascade-deletes: equipment categories have an FK from `assets`. If
  you ever add a new "delete category" entry point, mirror what
  `deleteResource` does in App.tsx — confirm with child count, delete
  child assets first, THEN the category. Skipping this gives a Postgres
  FK violation.
- New rooms/equipment/assets: `rooms`, `equipment`, AND `assets` now
  all have INSERT + DELETE RLS policies. If you ever add another
  resource-like table, add the matching policies BEFORE the UI ships,
  or `.upsert()` will silently 0-affect (we hit this with image_url
  before).
