/* =====================================================================
 * ASSET MANAGEMENT PRO — supabase/seed.sql
 * Data awal: peran RBAC, kondisi barang, satuan, kategori template,
 * organisasi contoh, dan panduan pembuatan admin pertama.
 *
 * Jalankan SETELAH schema.sql dan rls-policies.sql.
 * ===================================================================== */

-- =========================================================
-- 1. PERAN RBAC (9 role)
-- =========================================================
insert into roles (name, description, role_key) values
  ('Super Admin',        'Akses seluruh sistem, pengguna, konfigurasi, dan data', 'super_admin'),
  ('Pimpinan Yayasan',   'Dashboard keseluruhan, laporan, persetujuan penghapusan, pemantauan nilai aset', 'pimpinan'),
  ('Direktur',           'Memantau aset direktorat, menyetujui transaksi sesuai delegasi', 'direktur'),
  ('Manajer Departemen', 'Aset departemen, pengajuan kebutuhan, persetujuan transaksi unit', 'manajer'),
  ('Pengelola Inventaris','Mengelola data aset, QR Code, lokasi, peminjaman & opname', 'pengelola'),
  ('Petugas Gudang',     'Penerimaan barang, pengelolaan stok, barang masuk & keluar', 'gudang'),
  ('Teknisi',            'Melihat tiket pemeliharaan, memperbarui pekerjaan, mencatat hasil', 'teknisi'),
  ('Keuangan',           'Nilai perolehan, penyusutan, laporan nilai buku, data pengadaan', 'keuangan'),
  ('Pegawai',            'Melihat inventaris diizinkan, mengajukan peminjaman & kebutuhan, melaporkan kerusakan', 'pegawai')
on conflict (role_key) do nothing;

-- =========================================================
-- 2. MASTER KONDISI BARANG
-- =========================================================
insert into asset_conditions (condition_name, condition_code, description) values
  ('Baru', 'BRU', 'Kondisi baru belum digunakan'),
  ('Baik', 'BIK', 'Kondisi baik dan berfungsi normal'),
  ('Cukup Baik', 'CKB', 'Berfungsi dengan penurunan kualitas ringan'),
  ('Rusak Ringan', 'RRG', 'Kerusakan ringan, masih dapat diperbaiki'),
  ('Rusak Berat', 'RBG', 'Kerusakan berat, tidak layak pakai'),
  ('Tidak Berfungsi', 'TFG', 'Tidak berfungsi sama sekali'),
  ('Hilang', 'HLG', 'Barang tidak ditemukan'),
  ('Dihapuskan', 'DHP', 'Telah dihapuskan dari daftar aset')
on conflict (condition_code) do nothing;

-- =========================================================
-- 3. SATUAN UKUR
-- =========================================================
insert into units_of_measure (name, symbol) values
  ('Unit','unit'),('Buah','bh'),('Set','set'),('Paket','pkt'),('Meter','m'),
  ('Meter Persegi','m²'),('Liter','L'),('Kilogram','kg'),('Rim','rim'),('Lainnya','-')
on conflict do nothing;

-- =========================================================
-- 4. ORGANISASI CONTOH (ubah sesuai organisasi Anda)
-- =========================================================
insert into organizations (id, name, code, address, phone, email) values
  ('11111111-1111-1111-1111-111111111111', 'Yayasan Pendidikan Nusantara', 'YPN',
   'Jl. Pendidikan Raya No. 45, Bandung', '(022) 8765-4321', 'info@ypn-or.id')
on conflict (id) do nothing;

-- Struktur unit & departemen contoh
insert into units (id, organization_id, name, code, unit_type) values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Kantor Yayasan', 'KY', 'kantor_pusat'),
  ('21111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'SD Nusantara', 'SD', 'satuan_pendidikan'),
  ('21111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'SMP Nusantara', 'SMP', 'satuan_pendidikan'),
  ('21111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'SMA Nusantara', 'SMA', 'satuan_pendidikan')
on conflict (id) do nothing;

insert into departments (id, organization_id, unit_id, name, code) values
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'Keuangan', 'KEU'),
  ('31111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'Sarana & Prasarana', 'SAR'),
  ('31111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111114', 'Akademik SMA', 'SMA-AK')
on conflict (id) do nothing;

-- =========================================================
-- 5. KATEGORI BARANG TEMPLATE
-- =========================================================
insert into asset_categories (organization_id, category_code, category_name, is_fixed_asset, is_consumable) values
  ('11111111-1111-1111-1111-111111111111','TNH','Tanah',true,false),
  ('11111111-1111-1111-1111-111111111111','BDG','Bangunan',true,false),
  ('11111111-1111-1111-1111-111111111111','KND','Kendaraan',true,false),
  ('11111111-1111-1111-1111-111111111111','KMP','Komputer dan Laptop',false,false),
  ('11111111-1111-1111-1111-111111111111','PRT','Printer dan Scanner',false,false),
  ('11111111-1111-1111-1111-111111111111','PKT','Peralatan Kantor',false,false),
  ('11111111-1111-1111-1111-111111111111','MBL','Meubelair',false,false),
  ('11111111-1111-1111-1111-111111111111','PKL','Peralatan Kelas',false,false),
  ('11111111-1111-1111-1111-111111111111','PLB','Peralatan Laboratorium',false,false),
  ('11111111-1111-1111-1111-111111111111','POR','Peralatan Olahraga',false,false),
  ('11111111-1111-1111-1111-111111111111','PDR','Peralatan Dapur',false,false),
  ('11111111-1111-1111-1111-111111111111','PSR','Peralatan Asrama',false,false),
  ('11111111-1111-1111-1111-111111111111','PLT','Peralatan Listrik',false,false),
  ('11111111-1111-1111-1111-111111111111','PEL','Peralatan Elektronik',false,false),
  ('11111111-1111-1111-1111-111111111111','PJR','Peralatan Jaringan',false,false),
  ('11111111-1111-1111-1111-111111111111','PKS','Peralatan Kesehatan',false,false),
  ('11111111-1111-1111-1111-111111111111','PKM','Peralatan Keamanan',false,false),
  ('11111111-1111-1111-1111-111111111111','BPK','Buku dan Perpustakaan',false,false),
  ('11111111-1111-1111-1111-111111111111','BHP','Barang Habis Pakai',false,true)
on conflict do nothing;

-- =========================================================
-- 6. SUMBER DANA & KEBIJAKAN PENYUSUTAN
-- =========================================================
insert into funding_sources (organization_id, name, description) values
  ('11111111-1111-1111-1111-111111111111','Dana BOS','Bantuan Operasional Sekolah'),
  ('11111111-1111-1111-1111-111111111111','Kas Yayasan','Pembiayaan internal'),
  ('11111111-1111-1111-1111-111111111111','Hibah / Bantuan','Hibah pihak ketiga'),
  ('11111111-1111-1111-1111-111111111111','Dana Komite','Iuran komite orang tua')
on conflict do nothing;

insert into depreciation_settings (organization_id, category_id, depreciation_method, default_useful_life_months, default_residual_percentage)
select '11111111-1111-1111-1111-111111111111', null, 'straight_line', 48, 10
where not exists (select 1 from depreciation_settings where organization_id = '11111111-1111-1111-1111-111111111111');

-- =========================================================
-- 7. PENGATURAN APLIKASI
-- =========================================================
insert into app_settings (organization_id, setting_key, setting_value) values
  ('11111111-1111-1111-1111-111111111111','app.currency','{"code": "IDR", "symbol": "Rp"}'),
  ('11111111-1111-1111-1111-111111111111','loan.fine_per_day','{"amount": 5000}'),
  ('11111111-1111-1111-1111-111111111111','procurement.approval_steps','{"steps": ["Review Atasan","Review Keuangan","Approval Pimpinan"]}'),
  ('11111111-1111-1111-1111-111111111111','asset.code_format','{"pattern": "KODEKATEGORI/TAHUN/SEQ"}')
on conflict (organization_id, setting_key) do nothing;

-- =========================================================
-- 8. PENUTUPAN PERIODE PENYUSUTAN AWAL
-- =========================================================
insert into depreciation_periods (organization_id, period_year, period_month, period_start, period_end, status)
select '11111111-1111-1111-1111-111111111111', date_part('year', current_date), date_part('month', current_date),
       date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date, 'Open'
where not exists (
  select 1 from depreciation_periods
  where organization_id = '11111111-1111-1111-1111-111111111111'
    and period_year = date_part('year', current_date)
    and period_month = date_part('month', current_date)
);

-- =========================================================
-- 9. PENGUNA ADMIN PERTAMA (MANUAL)
-- ---------------------------------------------------------------------
-- Supabase tidak memperbolehkan mengisi auth.users lewat SQL biasa.
-- Cara membuat admin pertama:
--   1. Dashboard Supabase → Authentication → Users → "Add User"
--      (email + password, email confirmed = true)
--   2. Jalankan SQL di bawah dengan mengganti UUID/EMAIL sesuai
--      pengguna yang baru dibuat (cek di tabel auth.users):
--
--   insert into profiles (id, organization_id, full_name, email, is_active)
--   select u.id, '11111111-1111-1111-1111-111111111111', 'Nama Admin', u.email, true
--   from auth.users u where u.email = 'admin@organisasi.id'
--   on conflict (id) do nothing;
--
--   insert into user_roles (user_id, role_id, organization_id)
--   select p.id, r.id, p.organization_id
--   from profiles p join roles r on r.role_key = 'super_admin'
--   where p.email = 'admin@organisasi.id';
-- =====================================================================
