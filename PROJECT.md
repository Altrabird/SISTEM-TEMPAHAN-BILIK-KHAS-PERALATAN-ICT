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
│   ├── dates.ts               todayLocalISO, addDaysLocalISO, daysBetween
│   └── qr.ts                  loanUrl, generateQrDataUrl, openBulkQrSticker
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
    ├── BookingModal.tsx        Generic booking (rooms primarily)
    ├── LoanModal.tsx           Single-asset ICT loan (purpose + tempoh)
    ├── BulkLoanModal.tsx       Multi-asset ICT loan (2-step picker)
    ├── BulkAssetActionsModal.tsx  Admin: lock/status/delete in bulk
    ├── ReturnLoanModal.tsx     Mark loan as returned + condition notes
    ├── AssetListModal.tsx      Asset grid for a category
    ├── AddAssetModal.tsx       Admin: register new unit
    ├── EditAssetModal.tsx      Admin: full asset edit (incl. delete)
    ├── EditResourceModal.tsx   Admin: room/category edit (incl. lock)
    ├── EditProfileModal.tsx    Self profile edit (avatar upload)
    ├── LockAssetModal.tsx      Quick lock/unlock with reason
    ├── QRCodeModal.tsx         Per-asset QR + sticker print
    └── PWAUpdatePrompt.tsx     Auto-update banner

deploy/
├── nginx.conf                 ⚠ HTTP-only — Certbot adds HTTPS in place
├── deploy.sh                  Pull → build → atomic symlink swap → reload
└── README.md                  Setup + recovery (BM)

supabase/
├── schema.sql                 Idempotent — re-runnable
└── notify_setup.sql           Telegram trigger + cron + Vault setup

public/
├── logo.svg                   Single source for PWA icons
├── favicon.ico
└── pwa-*.png, maskable-*.png, apple-touch-icon-*.png
```

---

## 4. Data model (Supabase)

| Table | Key columns | Notes |
|-------|-------------|-------|
| `profiles` | id, name, role, department, email, avatar_url, joined_at, last_active_at | role: guru/admin/pelajar/staf |
| `rooms` | id, name, capacity, image_url, description, locked_reason | RLS open |
| `equipment` | id, name, quantity, image_url, description, locked_reason | category-level |
| `assets` | id, resource_id→equipment, name, serial_number, specifications, image_url, status, locked_reason | individual units |
| `bookings` | id, resource_id, resource_type, user_id, user_name, date, return_date, start_time, end_time, purpose, status, created_at, returned_at, returned_by_id, returned_by_name, return_notes | status: pending/confirmed/cancelled/returned |

**RLS**: open read + write everywhere (anon key). Internal school tool;
fine. For public deploy → switch to `auth.uid()` policies.

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
| nginx.conf overwrite | tempah.altrabird.click serves another site | Re-run certbot |
| LF/CRLF on Windows clone | git noise on every save | `.gitattributes` if it ever bothers |
| deploy.sh permission denied | Just `bash` it once | `git update-index --chmod=+x` already applied |
| Tailwind purge missing class | Style absent in build | Use full literal class names, no string interp |

---

## 10. What's done (v1.4.0)

- ✅ Profile + portfolio (avatar upload, achievements, streak, charts)
- ✅ Onboarding (3 modes: Cipta Baru / Profil Sedia Ada / Admin login)
- ✅ Bilik Khas booking with conflict detection
- ✅ ICT loan: single, bulk, QR-driven
- ✅ Per-asset QR sticker + bulk sticker sheet (A4, 18-up)
- ✅ Lock system (room / category / per-asset) with reason text
- ✅ Edit/delete per asset; bulk actions (lock/unlock/status/delete)
- ✅ Self-service return + admin return with notes
- ✅ Admin "Pinjaman ICT" view (all loans, filters, drill-down)
- ✅ User "Pemulangan" view (own loans, prominent return CTA)
- ✅ Reports (KPIs, trend chart, top users/resources, printable)
- ✅ Print: report, booking list, single slip, asset QR, bulk QR
- ✅ Mobile-first: drawer + bottom nav, vibrant Hadir@SKBT-style
- ✅ PWA: installable, offline app shell, auto-update prompt
- ✅ Supabase as source of truth (rooms, equipment, assets, bookings, profiles all sync)
- ✅ Production deploy on VPS w/ HTTPS
- ✅ Telegram notifications (5 events; pure SQL via pg_net + pg_cron):
  - Instant on booking INSERT
  - Instant on return (status → returned, with early/on-time/late label)
  - Instant on cancel (status → cancelled, with admin/self attribution + optional reason)
  - Daily 06:30 MY morning digest of TODAY's room bookings + multi-day loans
  - Daily 08:00 MY overdue/due-tomorrow ICT reminder
  Bot token + chat_id in Supabase Vault; triggers in DB so they fire
  for any source (app, direct SQL, future clients)
- ✅ Admin can cancel any booking (not just own); cancellation is logged
  with cancelled_at, cancelled_by_id/name, optional cancel_reason

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
npm run icons            # regenerate PWA icons from public/logo.svg

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
