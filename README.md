# ASSET MANAGEMENT PRO

**Sistem Informasi Inventaris, Barang, dan Manajemen Aset Terintegrasi**

> Smart Asset, Accurate Data, Better Management.

Aplikasi web profesional untuk mengelola siklus hidup aset organisasi/yayasan/sekolah: **Perencanaan Kebutuhan → Pengadaan → Persetujuan → Pembelian → Penerimaan → Inventarisasi → QR Code → Penempatan → Peminjaman → Pengembalian → Pemeliharaan → Penyusutan → Stock Opname → Penghapusan → Pelaporan**.

Dibangun dengan **HTML5 + CSS3 + JavaScript murni (ES6+)**, Bootstrap 5, Chart.js, SweetAlert2, QR Code (generate + scan kamera), SheetJS, dan **Supabase PostgreSQL** sebagai basis data produksi dengan autentikasi + Row Level Security.

---

## 1. Mode Aplikasi

| Mode | Kapan aktif | Penyimpanan |
|---|---|---|
| **Demo** | Default, saat `SUPABASE_URL`/`ANON_KEY` belum diisi | Penyimpanan lokal peramban (data contoh lengkap) — untuk evaluasi |
| **Produksi** | Setelah mengisi kredensial Supabase | PostgreSQL + Auth + RLS + Storage |

> Mode demo memudahkan pengujian tanpa backend. **Untuk data organisasi yang sebenarnya, wajib menggunakan mode Supabase** (satu langkah konfigurasi, lihat bagian 3).

---

## 2. Menjalankan Lokal

Aplikasi ini 100% statis — cukup layani folder `public/` dengan server apa pun:

```bash
# dengan Next.js shell (project ini sudah disiapkan)
bun run dev            # buka http://localhost:3000

# atau server statis apa pun
cd public && python3 -m http.server 8080
```

Akun demo (sandi: `demo123`):

| Email | Peran |
|---|---|
| superadmin@demo.id | Super Admin |
| pimpinan@demo.id | Pimpinan Yayasan |
| direktur@demo.id | Direktur |
| manajer@demo.id | Manajer Departemen |
| pengelola@demo.id | Pengelola Inventaris |
| gudang@demo.id | Petugas Gudang |
| teknisi@demo.id | Teknisi |
| keuangan@demo.id | Keuangan |
| pegawai@demo.id | Pegawai |

---

## 3. Setup Produksi (Supabase)

1. **Buat project** di [supabase.com](https://supabase.com) (region terdekat).
2. **SQL Editor** — jalankan berurutan:
   - `supabase/schema.sql` — 51 tabel + fungsi + trigger
   - `supabase/rls-policies.sql` — Row Level Security + bucket storage
   - `supabase/seed.sql` — peran RBAC, kondisi, satuan, kategori template
3. **Authentication → Users → Add User** — buat admin pertama (email confirmed).
4. **Kaitkan profil admin** — jalankan SQL pada bagian akhir `seed.sql` (langkah 9):
   ```sql
   insert into profiles (id, organization_id, full_name, email, is_active)
   select u.id, '11111111-1111-1111-1111-111111111111', 'Nama Admin', u.email, true
   from auth.users u where u.email = 'admin@organisasi.id'
   on conflict (id) do nothing;

   insert into user_roles (user_id, role_id, organization_id)
   select p.id, r.id, p.organization_id from profiles p
   join roles r on r.role_key = 'super_admin'
   where p.email = 'admin@organisasi.id';
   ```
5. **Konfigurasi frontend** — dua cara:
   - **Tanpa edit kode (disarankan)**: masuk sebagai Super Admin → **Pengaturan → tab "Koneksi Supabase"** → isi Project URL & Anon Key → **Uji Koneksi** → **Simpan & Aktifkan**. Koneksi tersimpan di peramban.
   - **Permanen (semua pengguna)**: edit `assets/js/supabase-config.js`:
   ```js
   SUPABASE_URL: 'https://<project-ref>.supabase.co',
   SUPABASE_ANON_KEY: '<anon-public-key>',
   ```
   (Anon key **aman** untuk frontend — seluruh proteksi data dilakukan RLS. Service role key **tidak pernah** diletakkan di frontend.)
6. **Data organisasi** — sesuaikan organisasi/units/lokasi pada `seed.sql` atau kelola lewat aplikasi (Master Data).
7. **Scheduler** (opsional) — deploy edge functions:
   ```bash
   supabase functions deploy send-reminders
   supabase functions deploy calculate-depreciation
   ```
   lalu pasang `pg_cron` sesuai contoh di `supabase/config.toml`.

### Storage
Bucket privat: `asset-photos`, `asset-documents`, `procurement-documents`, `maintenance-photos`, `stock-opname-photos`, `disposal-documents`, `qr-labels`. Akses file memakai **signed URL** berbatas waktu.
Bucket publik: `branding` — logo organisasi (diunggah dari Pengaturan → Identitas & Logo) dapat diakses tanpa autentikasi agar tampil di halaman masuk.

### Identitas, Logo & Tema (Pengaturan)
- **Identitas & Logo** — nama, kode, alamat, telepon, email, website, NPWP, pimpinan, catatan kaki laporan, dan **logo** (PNG/JPG/SVG, otomatis di-resize 256px). Logo & nama langsung tampil di sidebar dan halaman masuk; pada mode Supabase logo disimpan ke bucket `branding`.
- **Tampilan Warna** — 6 palet siap pakai (Navy, Hijau Pendidikan, Biru Samudra, Ungu Elegan, Merah Marun, Oranye Senja) + warna kustom (sidebar & aksen) dengan pratinjau langsung. Disimpan per peramban.
- **Koneksi Supabase** — uji koneksi dengan pengukuran latensi; simpan/aktifkan atau putuskan koneksi tanpa mengedit kode. Hanya Super Admin.

---

## 4. Deployment (GitHub + Vercel)

1. Push folder `public/` (seluruh aplikasi) + `supabase/` ke repository GitHub.
2. Vercel → **Import Project** → framework: *Other* (static). Root directory menunjuk folder aplikasi.
3. Isi `supabase-config.js` dengan kredensial produksi sebelum deploy, atau gunakan build step untuk menyuntikkan nilai env.
4. Aktifkan HTTPS (QR scanner kamera **wajib HTTPS** — kebijakan browser).

---

## 5. Struktur Folder

```text
public/
├── index.html               # Dashboard utama
├── login.html               # Autentikasi + pendaftaran
├── assets.html              # Data Inventaris (CRUD aset)
├── asset-detail.html        # Detail + riwayat + QR
├── categories.html          # Master kategori & subkategori
├── locations.html           # Master lokasi/gedung/ruangan
├── units.html               # Organisasi, unit, departemen, bidang
├── suppliers.html           # Pemasok, satuan, sumber dana, kondisi
├── procurement.html         # Pengajuan kebutuhan + realisasi PO
├── goods-receipt.html       # Penerimaan barang → pembuatan aset
├── loans.html               # Peminjaman (anti peminjaman ganda)
├── returns.html             # Pengembalian (penuh/sebagian/insiden)
├── transfers.html           # Mutasi aset (4 tahap)
├── maintenance.html         # Tiket, jadwal berulang, biaya
├── depreciation.html        # Penyusutan + periode + simulasi
├── stock-opname.html        # Audit fisik + selisih + penyesuaian
├── disposal.html            # Penghapusan aset (workflow + arsip)
├── qr-scanner.html          # Scan kamera/manual + riwayat
├── reports.html             # Reporting Center + ekspor
├── users.html               # Pengguna & RBAC
├── settings.html            # Profil organisasi, preferensi, audit
├── assets/css/              # style, dashboard, forms, responsive
├── assets/js/               # modul per fitur + adapter data
│   ├── supabase-config.js   # ← kredensial produksi di sini
│   ├── db.js                # adapter DemoDB ⇄ SupabaseDB
│   ├── auth.js              # sesi + RBAC
│   ├── app.js               # shell, menu, notifikasi, tema
│   ├── ui.js, demo-data.js, qr-code.js
│   └── dashboard.js, assets.js, loans.js, ... (per modul)
└── supabase/
    ├── schema.sql           # 51 tabel + function + trigger
    ├── rls-policies.sql     # keamanan baris + storage
    ├── seed.sql             # data awal
    ├── config.toml          # CLI + contoh pg_cron
    └── functions/           # edge functions (Deno)
        ├── calculate-depreciation/
        └── send-reminders/
```

---

## 6. Arsitektur Data

- **51 tabel** sesuai spesifikasi: organisasi/pengguna (7), master (6), aset (6), pengadaan/penerimaan (6), peminjaman (5), mutasi (2), pemeliharaan (4), penyusutan (4), stock opname (3), penghapusan (2), sistem (6).
- **UUID PK** + `organization_id`, `created_at`, `updated_at`, `created_by/updated_by` pada seluruh tabel transaksi.
- **Kode inventaris** unik per organisasi (`KODEKATEGORI/TAHUN/0001`) dengan deteksi duplikat nomor seri; **QR token** acak 16 byte (bukan data aset) — data diambil setelah autentikasi.
- **Integritas transaksi** diberlakukan di database:
  - peminjaman ganda dicegah trigger `guard_loan_item`
  - status aset tersinkron otomatis saat peminjaman/mutasi berubah
  - lokasi hanya diperbarui setelah mutasi `Selesai`
  - `depreciation_entries` unik per (aset, periode) — tidak bisa posting ganda
  - periode tertutup menolak posting (`post_depreciation_period`)
  - aset dihapuskan diarsipkan, tidak dihapus permanen
- **Penyusutan**: garis lurus `(perolehan − residu)/umur`, saldo menurun 150%, dibatasi nilai residu; posting bulanan atomik; simulasi jadwal.
- **Audit trail**: trigger `audit_log_row` pada tabel aset + perekaman aksi penting aplikasi.
- **RBAC 9 peran** dievaluasi lewat fungsi `has_role()` di RLS — pengguna hanya melihat/mengubah sesuai kewenangan organisasinya.

---

## 7. Daftar Uji (Checklist Pengujian)

| No | Pengujian | Cara |
|---|---|---|
| 1 | Login/logout semua peran | 9 akun demo (atau akun Supabase) |
| 2 | Hak akses per peran | Login `pegawai` → menu terbatas; langsung akses URL juga diblok |
| 3 | CRUD master data | Kategori/lokasi/pemasok/unit |
| 4 | Kode inventaris otomatis & unik | Tambah aset baru → kode `KMP/2026/000X`; nomor seri ganda ditolak |
| 5 | QR generate & scan | Halaman aset (unduh PNG, label, kartu) + QR Scanner (kamera/manual) |
| 6 | Pengadaan → PO → Penerimaan → Aset | Alur lengkap; aset baru berstatus *Menunggu Verifikasi* |
| 7 | Peminjaman & anti-overlap | Pinjam laptop → coba pinjam laptop yang sama → ditolak |
| 8 | Pengembalian sebagian | Kembalikan 1 dari 2 item → status *Sebagian* |
| 9 | Insiden → tiket | Kembalikan dengan kondisi rusak → tiket pemeliharaan otomatis |
| 10 | Mutasi | Persetujuan → Pengiriman → Penerimaan → lokasi diperbarui |
| 11 | Pemeliharaan | Tiket → tugaskan → selesaikan (biaya) → verifikasi |
| 12 | Penyusutan | Posting periode 2× → entri ganda ditolak; tutup periode → tidak bisa posting |
| 13 | Stock opname | Scan/cek manual → selisih → penyesuaian → persetujuan mengubah master |
| 14 | Penghapusan | Pengajuan → persetujuan pimpinan → aset diarsipkan (bukan terhapus) |
| 15 | Laporan & ekspor | Excel/CSV/PDF dari Reporting Center |
| 16 | Audit trail | Settings → Audit Trail (super admin) |
| 17 | Responsif | Desktop / tablet / smartphone + mode gelap |

---

## 8. Keamanan

- Supabase Auth + RLS di **semua** tabel — bukan hanya menu tersembunyi di frontend.
- Role Based Access Control 9 peran + kewenangan per transaksi.
- Service role key **tidak ada** di frontend; hanya di edge functions.
- Storage privat + signed URL; validasi format/ukuran di sisi unggah.
- QR token acak (tidak memuat data aset); scan divalidasi sesi + hak akses.
- Audit trail; backup database berkala disarankan melalui Supabase Dashboard.

---

## 9. Lisensi & Kredit

Dibangun sebagai sistem internal organisasi. Library pihak ketiga melalui CDN: Bootstrap 5, Bootstrap Icons, Chart.js 4, SweetAlert2 11, qrcodejs, html5-qrcode, SheetJS, jsPDF + AutoTable, supabase-js v2.
