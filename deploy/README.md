# Deploy SKBT 2026 ke VPS

Panduan one-time setup + deploy berulang untuk `tempah.altrabird.click`.

---

## ⚠️ PENTING — JANGAN GANGGU APP LAIN DI VPS

VPS anda mungkin sudah ada app lain (website / API / database). Panduan ini
direkabentuk untuk **tidak menyentuh apa-apa di luar paths yang khusus
untuk SKBT**. Sila ikut path ini bulat-bulat:

| Untuk apa | Path yang BOLEH disentuh |
|-----------|--------------------------|
| Source code | `/opt/tempah/` |
| Web root | `/var/www/tempah/` |
| Nginx config | `/etc/nginx/sites-available/tempah.altrabird.click` |
| Nginx symlink | `/etc/nginx/sites-enabled/tempah.altrabird.click` |
| Sertifikat SSL | `/etc/letsencrypt/live/tempah.altrabird.click/` (auto) |

**JANGAN sentuh:**
- ❌ `/etc/nginx/nginx.conf` (main config — biarkan apa adanya)
- ❌ Apa-apa fail dalam `/etc/nginx/sites-available/` selain
  `tempah.altrabird.click`
- ❌ Apa-apa fail dalam `/var/www/` selain folder `tempah/`
- ❌ App lain dalam `/opt/`, `/srv/`, `/home/<user>/`
- ❌ `systemctl restart nginx` (boleh down semua site sekejap)
  → guna `systemctl reload nginx` SAHAJA (graceful, tidak down site lain)

**Sebelum mula, audit dulu apa yang sudah ada:**
```bash
ls /etc/nginx/sites-enabled/                  # senarai site lain
sudo nginx -T 2>/dev/null | grep server_name  # senarai semua domain
ls /var/www/                                  # senarai web root lain
ls /opt/                                      # senarai app lain
```

Pastikan tiada apa-apa yang dah pakai nama `tempah`. Kalau ada, beritahu saya
dan kita pilih nama lain.

---

## Prasyarat

| Apa | Status |
|---|---|
| VPS Linux (Ubuntu 22.04 / Debian 12 / CentOS 9 — sebarang) | ✅ |
| Akses SSH dengan user `sudo` | ✅ |
| DNS A record `tempah.altrabird.click` → IP VPS | **PASTIKAN sudah propagate** |
| Port 80 + 443 dibuka di firewall | ✅ |
| Akaun Supabase dengan projek aktif | ✅ |

Periksa DNS dari komputer lokal:
```bash
dig +short tempah.altrabird.click
# Patut return IP VPS anda
```

---

## SETUP SEKALI SAHAJA

### 1. SSH ke VPS

```bash
ssh youruser@<vps-ip>
```

### 2. Install dependencies di VPS

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git curl
# Node 20 LTS dari NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # patut tunjuk v20.x.x
```

**Rocky / AlmaLinux / RHEL:**
```bash
sudo dnf install -y nginx git curl
sudo dnf install -y https://rpm.nodesource.com/pub_20.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm
sudo dnf install -y nodejs
sudo dnf install -y certbot python3-certbot-nginx
```

### 3. Clone repo + install

```bash
sudo mkdir -p /opt && sudo chown -R $USER:$USER /opt
cd /opt
git clone https://github.com/Altrabird/SISTEM-TEMPAHAN-BILIK-KHAS-PERALATAN-ICT.git tempah
cd tempah
npm ci
```

### 4. Setup env (Supabase keys)

```bash
cp .env.example .env.local
nano .env.local
```

Edit `.env.local` jadi:
```
VITE_SUPABASE_URL="https://wwixayxxmpametieyvlg.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_CDT0aKQj71p0rc52T47B7Q_J3rjtUCO"
VITE_ADMIN_ID="admin"
VITE_ADMIN_PASSWORD="UBAH_KE_KATA_LALUAN_KUAT_DI_SINI"
```

> ⚠️ **Sila tukar password admin** sebelum production. Default `admin/admin`
> hanya untuk dev. Password baru perlu disetkan SEBELUM build (ia di-bake
> ke dalam JS bundle).

### 5. Setup web root + first build

```bash
sudo mkdir -p /var/www/tempah/releases
sudo chown -R $USER:$USER /var/www/tempah

cd /opt/tempah
npm run build
# Salin output ke web root
mkdir -p /var/www/tempah/releases/initial
cp -r dist/* /var/www/tempah/releases/initial/
ln -sfn /var/www/tempah/releases/initial /var/www/tempah/dist
```

### 6. Konfigurasi Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/tempah.altrabird.click
sudo ln -s /etc/nginx/sites-available/tempah.altrabird.click /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Test HTTP dulu (sebelum HTTPS):
```bash
curl -I http://tempah.altrabird.click
# Patut return 200 OK
```

### 7. Aktifkan HTTPS dengan Let's Encrypt

```bash
sudo certbot --nginx -d tempah.altrabird.click
```

Certbot akan tanya:
- Email anda (untuk renewal reminder)
- Setuju TOS (Y)
- Auto-redirect HTTP → HTTPS (pilih **2 — Redirect**)

Sertifikat auto-renew via systemd timer (`certbot.timer`). Periksa:
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run  # uji renewal
```

### 8. Buka tempah.altrabird.click di browser

🎉 Patut tunjuk OnboardingModal app SKBT.

### 9. (Sekali sahaja) Tampal `.env.local` ke Supabase Auth Allowed URLs

Pergi Supabase Dashboard → **Authentication → URL Configuration** → tambah:
```
https://tempah.altrabird.click
```
ke "Site URL" supaya SSO / magic link (kalau anda guna nanti) berfungsi.

---

## DEPLOY BERULANG (selepas push code baru)

Bila ada perubahan baru di GitHub, dari VPS:

```bash
cd /opt/tempah
./deploy.sh
```

Skrip itu:
1. `git pull` dari `origin/main`
2. `npm ci` (clean install)
3. `npm run build` (bake env vars terkini)
4. Salin `dist/*` ke `/var/www/tempah/releases/<timestamp>/`
5. Atomic swap symlink → live tanpa downtime
6. `nginx -t && systemctl reload nginx`
7. Buang release lama (kekal 5 paling baru)

Pertama kali, beri permission:
```bash
chmod +x /opt/tempah/deploy/deploy.sh
ln -sf /opt/tempah/deploy/deploy.sh /opt/tempah/deploy.sh
```

---

## ROLLBACK (kalau deploy baru rosak)

Setiap deploy disimpan dalam `/var/www/tempah/releases/<timestamp>/`.
Untuk rollback ke release lama:

```bash
ls /var/www/tempah/releases/  # senarai release
# Tukar symlink ke release sebelumnya
sudo ln -sfn /var/www/tempah/releases/20260501-103045 /var/www/tempah/dist
sudo systemctl reload nginx
```

---

## TROUBLESHOOTING

**Nginx 502 / 404:**
```bash
sudo nginx -t                        # test config
sudo tail -f /var/log/nginx/error.log
ls -la /var/www/tempah/dist          # check symlink valid
```

**Build fail dengan "out of memory":**
```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```
Atau upgrade VPS RAM ke 2 GB+.

**Login admin tak berfungsi selepas tukar password:**
- Pastikan tukar di `.env.local` SEBELUM `npm run build`
- `cat /var/www/tempah/dist/assets/index-*.js | grep "sb_publishable"`
  — confirm Supabase key tersemat dalam bundle

**HTTPS sertifikat expired:**
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

**Supabase blok permintaan dari domain baru:**
Pergi Supabase Dashboard → Project Settings → API → semak **Allowed Origins**.

---

## KESELAMATAN PRODUCTION

Sebelum sebar URL ini ke guru-guru:

1. ✅ **Tukar `VITE_ADMIN_PASSWORD`** dari `admin` ke kata laluan kuat
2. ✅ **Aktifkan UFW / firewall** — buka 22, 80, 443 sahaja
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```
3. ⚠️ **RLS Supabase** — sekarang polisi terbuka (sesuai untuk sistem dalaman).
   Untuk akses publik, perlu Auth + tighter policies.
4. ✅ **Backup Supabase** — Project Settings → Database → enable PITR
5. ✅ **Monitor disk** — `df -h` (releases boleh menumpuk; deploy.sh prune)

---

## NEXT STEPS (selepas live)

- Setup automated GitHub Actions deploy (push to main → auto-deploy)
- Tambah analytics / uptime monitoring (UptimeRobot percuma)
- Hantar URL `tempah.altrabird.click` ke admin/guru sekolah 🚀
