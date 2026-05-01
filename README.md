<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# SISTEM TEMPAHAN BILIK KHAS & PERALATAN ICT 2026

**Sistem tempahan bilik khas & peralatan ICT untuk sekolah, dengan portfolio profil pengguna.**

</div>

---

## Ciri Utama

- **Tempahan Bilik & Peralatan ICT** — semakan konflik masa secara automatik
- **Portfolio Profil Pengguna** — setiap pengguna mempunyai halaman profil tersendiri dengan:
  - Statistik tempahan (total, bulan ini, jumlah jam)
  - Streak mingguan (konsisten guna sumber)
  - Pencapaian / lencana (13 achievement berbeza)
  - Carta penggunaan 6 bulan terakhir
  - Sumber kegemaran & cabaran aktif
  - Tempahan akan datang & aktiviti terkini
- **Inventori Aset** — daftar unit spesifik (PC 01, Laptop 02, dll.) dengan nombor siri & gambar
- **Backend Supabase** dengan automatic fallback ke localStorage (mode offline)
- **Eksport CSV** untuk rekod tempahan
- **Bahasa Malaysia** sepenuhnya
- **Responsive** (desktop & tablet)

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Bundler | Vite 6 |
| Styling | Tailwind CSS v4 |
| Animation | Motion (formerly Framer Motion) |
| Icons | lucide-react |
| Backend | Supabase (Postgres + RLS) |
| Storage Fallback | Browser localStorage |

---

## Setup Tempatan

### Prasyarat
- Node.js 20+
- (Pilihan) Akaun Supabase percuma di [supabase.com](https://supabase.com)

### Langkah 1 — Install dependencies

```bash
npm install
```

### Langkah 2 — Konfigurasi env (pilihan, untuk Supabase)

Salin `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` dan masukkan kunci Supabase anda:

```
VITE_SUPABASE_URL="https://xxxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbG..."
```

> **Tip:** Anda boleh skip langkah ini. Jika `.env.local` tidak wujud, sistem
> akan automatik guna `localStorage` pelayar. Berguna untuk demo/testing.

### Langkah 3 — Setup skema Supabase

Pergi ke Supabase Dashboard → **SQL Editor** → **New query**, paste
kandungan fail [`supabase/schema.sql`](supabase/schema.sql), kemudian klik **RUN**.

Skema akan cipta jadual:
- `profiles` — profil pengguna
- `rooms` — bilik khas
- `equipment` — kategori peralatan
- `assets` — unit spesifik peralatan
- `bookings` — rekod tempahan

Termasuk Row Level Security (RLS) dan data benih untuk semua bilik & peralatan SKBT.

### Langkah 4 — Run

```bash
npm run dev
```

Buka http://localhost:3000

---

## Struktur Projek

```
src/
├── App.tsx                        # Orchestrator utama
├── main.tsx                       # Entry point
├── types.ts                       # TypeScript types
├── constants.ts                   # Default rooms/equipment + achievements
├── index.css                      # Tailwind v4 + fonts
├── lib/
│   ├── supabase.ts                # Supabase client (null jika tidak dikonfig)
│   ├── storage.ts                 # Storage layer (Supabase ↔ localStorage)
│   └── achievements.ts            # Logik kira stats & unlock pencapaian
├── views/
│   ├── DashboardView.tsx          # Halaman utama
│   ├── PortfolioView.tsx          # ⭐ Portfolio profil pengguna
│   ├── BookingsView.tsx           # Senarai tempahan + filter + CSV export
│   ├── ResourceManagementView.tsx # Bilik & Peralatan
│   └── SettingsView.tsx           # Edit profil + reset data + status backend
└── components/
    ├── OnboardingModal.tsx        # First-run profile capture
    ├── BookingModal.tsx           # Borang tempahan baru
    ├── AssetListModal.tsx         # Senarai unit aset
    └── AddAssetModal.tsx          # Daftar aset baru
supabase/
└── schema.sql                     # Skema DB + seed data
```

---

## Sistem Pencapaian

Portfolio dilengkapi 13 lencana untuk menggalakkan penggunaan konsisten:

| Tier | Lencana | Cara Buka |
|------|---------|-----------|
| Bronze | Langkah Pertama | Tempahan pertama |
| Bronze | Aktif Mingguan | 5 tempahan |
| Bronze | Burung Pagi | Tempahan sebelum 7:30 pagi |
| Bronze | Burung Hantu | Tempahan selepas 5:00 petang |
| Silver | Pengguna Berdedikasi | 10 tempahan |
| Silver | Tulang Belakang Sekolah | 25 tempahan |
| Silver | Konsisten 1 Minggu | 2 minggu berturut-turut |
| Silver | Penjelajah Bilik | Guna 3 bilik berbeza |
| Silver | Pakar Peralatan | Guna 3 jenis peralatan ICT |
| Gold | Legenda 2026 | 50 tempahan |
| Gold | Konsisten 1 Bulan | 4 minggu berturut-turut |
| Gold | Pengguna Pro | Tempahan dalam 5 hari berbeza dlm sebulan |
| Platinum | Perintis 2026 | Sertai sebelum 1 Julai 2026 |

---

## Backend Supabase — Catatan Keselamatan

Skema yang disertakan menggunakan polisi RLS yang **terbuka** (sesiapa
sahaja boleh baca/tulis). Ini sesuai untuk:
- Demo / pembangunan
- Sistem dalaman sekolah dengan akses terhad

Untuk **produksi awam**, anda perlu:
1. Aktifkan Supabase Auth (email/SSO)
2. Gantikan polisi `using (true)` dengan polisi berasaskan `auth.uid()`
3. Tambah column `auth_id uuid` di `profiles` yang link ke `auth.users`

---

## Deploy

Projek ini boleh deploy ke mana-mana static host (Vercel, Netlify, Cloudflare Pages):

```bash
npm run build       # output ke dist/
```

Tetapkan env vars `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di dashboard
host anda sebelum deploy.

---

## Lihat di AI Studio

https://ai.studio/apps/3cc810c0-a509-419e-b07e-6973043802e4

---

## Lesen

Apache-2.0
