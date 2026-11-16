/* =====================================================================
 * ASSET MANAGEMENT PRO — supabase/schema.sql
 * Database PostgreSQL lengkap (51 tabel) dengan relasi, constraint,
 * index, function, dan trigger.
 *
 * URUTAN EKSEKUSI DI SUPABASE SQL EDITOR:
 *   1. schema.sql         (file ini)
 *   2. rls-policies.sql   (keamanan baris + storage)
 *   3. seed.sql           (master data awal)
 *
 * Catatan: tabel `auth.users` milik Supabase Auth. Profil pengguna
 * ditautkan lewat profiles.id -> auth.users.id.
 * ===================================================================== */

-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================================================
-- 1. ORGANISASI DAN PENGGUNA
-- =========================================================
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  address text,
  phone text,
  email text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

-- Kolom identitas tambahan (aman dijalankan ulang pada database lama)
alter table organizations add column if not exists website text;
alter table organizations add column if not exists npwp text;
alter table organizations add column if not exists leader_name text;
alter table organizations add column if not exists footer_note text;

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  parent_unit_id uuid references units(id) on delete set null,
  name text not null,
  code text,
  unit_type text check (unit_type in ('kantor_pusat','direktorat','departemen','satuan_pendidikan','unit_kerja','cabang')) ,
  manager_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_units_org on units(organization_id);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_departments_org on departments(organization_id);
create index if not exists idx_departments_unit on departments(unit_id);

create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key, -- = auth.users.id
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  employee_number text,
  unit_id uuid references units(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  division_id uuid references divisions(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_org on profiles(organization_id);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  role_key text unique not null
);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id, organization_id)
);

-- =========================================================
-- 2. MASTER DATA INVENTARIS
-- =========================================================
create table if not exists asset_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  parent_id uuid references asset_categories(id) on delete set null,
  category_code text not null,
  category_name text not null,
  description text,
  is_fixed_asset boolean not null default false,
  is_consumable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, category_code)
);

create table if not exists units_of_measure (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  symbol text
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  parent_location_id uuid references locations(id) on delete set null,
  location_code text not null,
  location_name text not null,
  location_type text not null default 'ruangan' check (location_type in ('gedung','lantai','ruangan','area')),
  building text,
  floor text,
  room text,
  capacity integer,
  description text,
  responsible_user_id uuid references profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, location_code)
);
create index if not exists idx_locations_org on locations(organization_id);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  supplier_code text not null,
  supplier_name text not null,
  address text,
  phone text,
  email text,
  contact_person text,
  tax_number text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, supplier_code)
);

create table if not exists funding_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true
);

create table if not exists asset_conditions (
  id uuid primary key default gen_random_uuid(),
  condition_name text not null,
  condition_code text unique not null,
  description text
);

-- =========================================================
-- 3. DATA ASET DAN BARANG
-- =========================================================
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  asset_code text,
  asset_name text not null,
  category_id uuid references asset_categories(id) on delete restrict,
  unit_of_measure_id uuid references units_of_measure(id) on delete set null,
  brand text,
  model text,
  serial_number text,
  specification text,
  description text,
  asset_type text not null default 'inventory' check (asset_type in ('fixed','inventory','consumable')),
  acquisition_date date,
  acquisition_cost numeric(15,2) default 0,
  quantity numeric(12,2) not null default 1,
  current_condition_id uuid references asset_conditions(id) on delete restrict,
  current_location_id uuid references locations(id) on delete set null,
  unit_id uuid references units(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  division_id uuid references divisions(id) on delete set null,
  responsible_user_id uuid references profiles(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  funding_source_id uuid references funding_sources(id) on delete set null,
  invoice_number text,
  procurement_number text,
  acquisition_method text,
  ownership_status text default 'Dimiliki Sendiri',
  warranty_start_date date,
  warranty_end_date date,
  photo_path text,
  qr_token text unique,
  asset_status text not null default 'Draft' check (asset_status in
    ('Draft','Menunggu Verifikasi','Aktif','Dipinjam','Dalam Pemeliharaan','Dalam Mutasi','Rusak','Hilang','Dihapuskan','Diarsipkan')),
  condition_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid,
  unique (organization_id, asset_code)
);
create index if not exists idx_assets_org on assets(organization_id);
create index if not exists idx_assets_category on assets(category_id);
create index if not exists idx_assets_location on assets(current_location_id);
create index if not exists idx_assets_status on assets(asset_status);
create index if not exists idx_assets_name_trgm on assets using gin (to_tsvector('simple', asset_name));

create table if not exists asset_identifiers (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  identifier_type text not null,
  identifier_value text not null,
  is_primary boolean not null default false
);

create table if not exists asset_documents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  document_type text,
  document_number text,
  file_path text,
  description text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists asset_condition_histories (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  old_condition_id uuid references asset_conditions(id) on delete set null,
  new_condition_id uuid references asset_conditions(id) on delete restrict,
  inspection_date date,
  notes text,
  photo_path text,
  inspected_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists asset_location_histories (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  old_location_id uuid references locations(id) on delete set null,
  new_location_id uuid references locations(id) on delete restrict,
  old_unit_id uuid references units(id) on delete set null,
  new_unit_id uuid references units(id) on delete set null,
  movement_date date,
  notes text,
  approved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists asset_qr_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  scanned_by uuid references profiles(id) on delete set null,
  scanned_at timestamptz not null default now(),
  scan_action text,
  device_info text
);

-- =========================================================
-- 4. PENGADAAN DAN PENERIMAAN
-- =========================================================
create table if not exists procurement_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  request_number text not null,
  request_date date,
  requester_id uuid references profiles(id) on delete set null,
  unit_id uuid references units(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  purpose text,
  priority text check (priority in ('Rendah','Sedang','Tinggi')),
  estimated_total numeric(15,2) default 0,
  status text not null default 'Draft' check (status in
    ('Draft','Submitted','Review Atasan','Review Keuangan','Approval Pimpinan','Approved','Rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, request_number)
);

create table if not exists procurement_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references procurement_requests(id) on delete cascade,
  category_id uuid references asset_categories(id) on delete set null,
  item_name text not null,
  specification text,
  quantity numeric(12,2) not null default 1,
  estimated_unit_price numeric(15,2) default 0,
  estimated_total numeric(15,2) default 0
);

create table if not exists procurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  procurement_number text not null,
  request_id uuid references procurement_requests(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  procurement_date date,
  invoice_number text,
  tax_amount numeric(15,2) default 0,
  discount_amount numeric(15,2) default 0,
  additional_cost numeric(15,2) default 0,
  total_amount numeric(15,2) default 0,
  funding_source_id uuid references funding_sources(id) on delete set null,
  payment_status text default 'Belum Lunas' check (payment_status in ('Belum Lunas','Lunas','Sebagian')),
  status text not null default 'Draft' check (status in ('Draft','Completed','Cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, procurement_number)
);

create table if not exists procurement_items (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid not null references procurements(id) on delete cascade,
  item_name text not null,
  category_id uuid references asset_categories(id) on delete set null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(15,2) default 0,
  total_price numeric(15,2) default 0
);

create table if not exists goods_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  receipt_number text not null,
  procurement_id uuid references procurements(id) on delete set null,
  receipt_date date,
  received_by uuid references profiles(id) on delete set null,
  inspection_status text not null default 'Pending' check (inspection_status in ('Pending','Verified','Rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, receipt_number)
);

create table if not exists goods_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references goods_receipts(id) on delete cascade,
  procurement_item_id uuid references procurement_items(id) on delete set null,
  item_name text,
  quantity_ordered numeric(12,2) default 0,
  quantity_received numeric(12,2) default 0,
  quantity_rejected numeric(12,2) default 0,
  condition_id uuid references asset_conditions(id) on delete set null,
  notes text
);

-- =========================================================
-- 5. PEMINJAMAN DAN PENGEMBALIAN
-- =========================================================
create table if not exists loan_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  loan_number text not null,
  borrower_id uuid references profiles(id) on delete set null,
  unit_id uuid references units(id) on delete set null,
  request_date date,
  planned_return_date date,
  purpose text,
  status text not null default 'Submitted' check (status in
    ('Draft','Submitted','Menunggu Persetujuan','Disetujui','Ditolak','Siap Diambil','Dipinjam','Sebagian','Dikembalikan','Selesai')),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, loan_number)
);

create table if not exists loan_items (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loan_requests(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete restrict,
  quantity numeric(12,2) not null default 1,
  condition_before_id uuid references asset_conditions(id) on delete set null,
  notes text
);
create index if not exists idx_loan_items_asset on loan_items(asset_id);

create table if not exists loan_returns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  return_number text not null,
  loan_id uuid not null references loan_requests(id) on delete cascade,
  return_date date,
  received_by uuid references profiles(id) on delete set null,
  notes text,
  status text not null default 'Completed' check (status in ('Draft','Completed','Cancelled')),
  created_at timestamptz not null default now(),
  unique (organization_id, return_number)
);

create table if not exists loan_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references loan_returns(id) on delete cascade,
  loan_item_id uuid references loan_items(id) on delete set null,
  asset_id uuid references assets(id) on delete restrict,
  quantity_returned numeric(12,2) not null default 1,
  condition_after_id uuid references asset_conditions(id) on delete set null,
  damage_notes text,
  photo_path text
);

create table if not exists loan_status_histories (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loan_requests(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 6. MUTASI ASET
-- =========================================================
create table if not exists asset_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  transfer_number text not null,
  transfer_date date,
  requested_by uuid references profiles(id) on delete set null,
  source_location_id uuid references locations(id) on delete set null,
  destination_location_id uuid references locations(id) on delete set null,
  source_unit_id uuid references units(id) on delete set null,
  destination_unit_id uuid references units(id) on delete set null,
  reason text,
  status text not null default 'Pengajuan' check (status in
    ('Pengajuan','Disetujui','Ditolak','Pengiriman','Penerimaan','Selesai')),
  approved_by uuid references profiles(id) on delete set null,
  petugas_kirim uuid references profiles(id) on delete set null,
  petugas_terima uuid references profiles(id) on delete set null,
  proof_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, transfer_number)
);

create table if not exists asset_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references asset_transfers(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete restrict,
  condition_before_id uuid references asset_conditions(id) on delete set null,
  condition_after_id uuid references asset_conditions(id) on delete set null,
  notes text
);

-- =========================================================
-- 7. PEMELIHARAAN
-- =========================================================
create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ticket_number text not null,
  asset_id uuid not null references assets(id) on delete restrict,
  reported_by uuid references profiles(id) on delete set null,
  report_date date,
  damage_description text,
  priority text check (priority in ('Rendah','Sedang','Tinggi')),
  status text not null default 'Open' check (status in
    ('Open','Assigned','In Progress','Waiting Parts','Completed','Verified','Cancelled')),
  assigned_to uuid references profiles(id) on delete set null,
  completion_date date,
  verification_by uuid references profiles(id) on delete set null,
  verification_date timestamptz,
  maintenance_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, ticket_number)
);
create index if not exists idx_maint_asset on maintenance_requests(asset_id);

create table if not exists maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  maintenance_type text,
  schedule_date date,
  recurrence_type text check (recurrence_type in ('days','months','none')),
  recurrence_interval integer default 0,
  responsible_user_id uuid references profiles(id) on delete set null,
  status text not null default 'Terjadwal' check (status in ('Terjadwal','Terlambat','Selesai','Cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists maintenance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  maintenance_id uuid references maintenance_requests(id) on delete set null,
  asset_id uuid not null references assets(id) on delete restrict,
  maintenance_date date,
  work_description text,
  technician_id uuid references profiles(id) on delete set null,
  vendor_id uuid references suppliers(id) on delete set null,
  labor_cost numeric(15,2) default 0,
  material_cost numeric(15,2) default 0,
  total_cost numeric(15,2) default 0,
  result text,
  before_photo_path text,
  after_photo_path text,
  created_at timestamptz not null default now()
);

create table if not exists maintenance_parts (
  id uuid primary key default gen_random_uuid(),
  maintenance_record_id uuid not null references maintenance_records(id) on delete cascade,
  part_name text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(15,2) default 0,
  total_price numeric(15,2) default 0
);

-- =========================================================
-- 8. PENYUSUTAN ASET
-- =========================================================
create table if not exists depreciation_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id uuid references asset_categories(id) on delete cascade, -- null = default semua kategori
  depreciation_method text not null default 'straight_line' check (depreciation_method in ('straight_line','declining','none')),
  default_useful_life_months integer not null default 48,
  default_residual_percentage numeric(5,2) not null default 10,
  start_policy text default 'acquisition_month',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists asset_depreciations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  acquisition_cost numeric(15,2) not null,
  residual_value numeric(15,2) not null default 0,
  depreciable_amount numeric(15,2) not null,
  useful_life_months integer not null,
  depreciation_method text not null,
  depreciation_start_date date,
  monthly_depreciation numeric(15,2) default 0,
  annual_depreciation numeric(15,2) default 0,
  accumulated_depreciation numeric(15,2) not null default 0,
  current_book_value numeric(15,2) not null,
  depreciation_status text not null default 'Aktif' check (depreciation_status in ('Aktif','Selesai Disusutkan','Dihentikan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id)
);

create table if not exists depreciation_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  period_start date,
  period_end date,
  status text not null default 'Open' check (status in ('Open','Closed')),
  closed_by uuid references profiles(id) on delete set null,
  closed_at timestamptz,
  unique (organization_id, period_year, period_month)
);

create table if not exists depreciation_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  asset_depreciation_id uuid not null references asset_depreciations(id) on delete cascade,
  period_id uuid not null references depreciation_periods(id) on delete restrict,
  depreciation_amount numeric(15,2) not null,
  accumulated_before numeric(15,2),
  accumulated_after numeric(15,2),
  book_value_after numeric(15,2),
  posted_at timestamptz not null default now(),
  posted_by uuid references profiles(id) on delete set null,
  unique (asset_depreciation_id, period_id) -- cegah posting ganda
);

-- =========================================================
-- 9. STOCK OPNAME
-- =========================================================
create table if not exists stock_opnames (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  opname_number text not null,
  opname_name text,
  period_start date,
  period_end date,
  unit_id uuid references units(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  status text not null default 'Berlangsung' check (status in ('Berlangsung','Selesai','Cancelled')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, opname_number)
);

create table if not exists stock_opname_items (
  id uuid primary key default gen_random_uuid(),
  opname_id uuid not null references stock_opnames(id) on delete cascade,
  asset_id uuid references assets(id) on delete set null,
  asset_code_snapshot text,
  asset_name_snapshot text,
  expected_location_id uuid references locations(id) on delete set null,
  actual_location_id uuid references locations(id) on delete set null,
  expected_condition_id uuid references asset_conditions(id) on delete set null,
  actual_condition_id uuid references asset_conditions(id) on delete set null,
  expected_quantity numeric(12,2),
  actual_quantity numeric(12,2),
  result_status text check (result_status in
    ('Sesuai data','Barang ditemukan di lokasi berbeda','Kondisi berubah','Barang tidak ditemukan',
     'Barang belum terdaftar','Jumlah tidak sesuai','QR Code rusak','Data tidak sesuai')),
  photo_path text,
  notes text,
  inspected_by uuid references profiles(id) on delete set null,
  inspected_at timestamptz
);

create table if not exists stock_opname_adjustments (
  id uuid primary key default gen_random_uuid(),
  opname_item_id uuid not null references stock_opname_items(id) on delete cascade,
  adjustment_type text check (adjustment_type in ('Mutasi Lokasi','Koreksi Kondisi','Selisih Jumlah','Laporan Kehilangan','Lainnya')),
  adjustment_reason text,
  approval_status text not null default 'Menunggu' check (approval_status in ('Menunggu','Approved','Ditolak')),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz
);

-- =========================================================
-- 10. PENGHAPUSAN ASET
-- =========================================================
create table if not exists asset_disposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  disposal_number text not null,
  disposal_date date,
  reason text,
  proposed_by uuid references profiles(id) on delete set null,
  reviewed_by uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  disposal_method text,
  selling_price numeric(15,2) default 0,
  book_value_at_disposal numeric(15,2) default 0,
  status text not null default 'Pengajuan' check (status in
    ('Pengajuan','Review','Disetujui','Ditolak','Pelaksanaan','Selesai','Dibatalkan')),
  notes text,
  document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, disposal_number)
);

create table if not exists asset_disposal_items (
  id uuid primary key default gen_random_uuid(),
  disposal_id uuid not null references asset_disposals(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete restrict,
  condition_id uuid references asset_conditions(id) on delete set null,
  book_value numeric(15,2) default 0,
  selling_price numeric(15,2) default 0,
  notes text
);

-- =========================================================
-- 11. SISTEM, NOTIFIKASI, DAN AUDIT
-- =========================================================
create table if not exists approval_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  transaction_type text not null,
  workflow_name text,
  is_active boolean not null default true
);

create table if not exists approval_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references approval_workflows(id) on delete cascade,
  step_order integer not null,
  role_id uuid references roles(id) on delete set null,
  approver_user_id uuid references profiles(id) on delete set null,
  is_required boolean not null default true
);

create table if not exists approval_histories (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null,
  transaction_id uuid not null,
  step_order integer default 0,
  approver_id uuid references profiles(id) on delete set null,
  decision text not null check (decision in ('Submitted','Approved','Rejected','Returned')),
  notes text,
  decided_at timestamptz not null default now()
);
create index if not exists idx_approval_hist_tx on approval_histories(transaction_type, transaction_id);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade, -- null = broadcast
  title text not null,
  message text,
  notification_type text,
  related_table text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, is_read);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_org_time on audit_logs(organization_id, created_at desc);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb,
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (organization_id, setting_key)
);

-- =========================================================
-- FUNCTION & TRIGGER
-- =========================================================

-- updated_at otomatis
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['organizations','units','departments','divisions','profiles','asset_categories',
    'locations','suppliers','assets','procurement_requests','procurements','goods_receipts','loan_requests',
    'asset_transfers','maintenance_requests','maintenance_schedules','asset_depreciations','depreciation_settings',
    'stock_opnames','asset_disposals','app_settings']
  loop
    execute format('drop trigger if exists trg_%s_updated on %I;', t, t);
    execute format('create trigger trg_%s_updated before update on %I for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- Nomor dokumen otomatis: PREFIX-YYYYMM-0001 (unik per organisasi)
create or replace function generate_doc_number(prefix text, org uuid) returns text as $$
declare
  seq integer;
  head text;
begin
  head := prefix || '-' || to_char(now(), 'YYYY-MM') || '-';
  select coalesce(max((substring(dr_number from length(head) + 1))::integer), 0) + 1 into seq
  from (
    select request_number as dr_number from procurement_requests where organization_id = org
    union all select procurement_number from procurements where organization_id = org
    union all select receipt_number from goods_receipts where organization_id = org
    union all select loan_number from loan_requests where organization_id = org
    union all select return_number from loan_returns where organization_id = org
    union all select transfer_number from asset_transfers where organization_id = org
    union all select ticket_number from maintenance_requests where organization_id = org
    union all select opname_number from stock_opnames where organization_id = org
    union all select disposal_number from asset_disposals where organization_id = org
  ) all_numbers
  where dr_number like head || '%';
  return head || lpad(seq::text, 4, '0');
end;
$$ language plpgsql;

-- Kode inventaris otomatis: KODEKATEGORI/TAHUN/0001
create or replace function generate_asset_code(p_category uuid, p_org uuid, p_date date) returns text as $$
declare
  cat_code text;
  seq integer;
begin
  select category_code into cat_code from asset_categories where id = p_category;
  cat_code := coalesce(cat_code, 'AST');
  select coalesce(max((split_part(asset_code, '/', 3))::integer), 0) + 1 into seq
  from assets
  where organization_id = p_org
    and category_id = p_category
    and asset_code like cat_code || '/' || to_char(coalesce(p_date, current_date), 'YYYY') || '/%';
  return cat_code || '/' || to_char(coalesce(p_date, current_date), 'YYYY') || '/' || lpad(seq::text, 4, '0');
end;
$$ language plpgsql;

-- QR token unik & tidak mudah ditebak
create or replace function generate_qr_token() returns text as $$
begin
  return encode(gen_random_bytes(16), 'hex');
end;
$$ language plpgsql;

-- Trigger: QR token otomatis untuk aset baru
create or replace function trg_assets_qr_token() returns trigger as $$
begin
  if new.qr_token is null and new.asset_status <> 'Draft' then
    new.qr_token := generate_qr_token();
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists trg_assets_qr on assets;
create trigger trg_assets_qr before insert on assets
for each row execute function trg_assets_qr_token();

-- Audit trail generic (aktif untuk tabel inti)
create or replace function audit_log_row() returns trigger as $$
declare orgid uuid;
begin
  begin
    orgid := coalesce(new.organization_id, old.organization_id);
  exception when others then orgid := null;
  end;
  if tg_op = 'INSERT' then
    insert into audit_logs(organization_id, user_id, action, table_name, record_id, new_data)
    values (orgid, null, 'INSERT', tg_table_name, (case when new.id is null then null else new.id end), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into audit_logs(organization_id, user_id, action, table_name, record_id, old_data, new_data)
    values (orgid, null, 'UPDATE', tg_table_name, (case when new.id is null then null else new.id end), to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into audit_logs(organization_id, user_id, action, table_name, record_id, old_data)
    values (orgid, null, 'DELETE', tg_table_name, (case when old.id is null then null else old.id end), to_jsonb(old));
    return old;
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_audit_assets on assets;
create trigger trg_audit_assets after insert or update or delete on assets
for each row execute function audit_log_row();

-- Cegah peminjaman ganda: aset yang sedang dipinjam tidak boleh masuk transaksi lain
create or replace function guard_loan_item() returns trigger as $$
declare cur_status text;
declare active_count integer;
begin
  select asset_status into cur_status from assets where id = new.asset_id;
  if cur_status in ('Dihapuskan','Hilang','Dalam Mutasi') then
    raise exception 'Aset berstatus % dan tidak dapat dipinjam', cur_status;
  end if;
  select count(*) into active_count
  from loan_items li
  join loan_requests lr on lr.id = li.loan_id
  where li.asset_id = new.asset_id
    and lr.status in ('Submitted','Disetujui','Siap Diambil','Dipinjam');
  if active_count > 0 then
    raise exception 'Aset sedang dipinjam/diajukan oleh pihak lain — peminjaman ganda dicegah';
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists trg_guard_loan on loan_items;
create trigger trg_guard_loan before insert on loan_items
for each row execute function guard_loan_item();

-- Sinkronisasi status aset saat peminjaman berubah
create or replace function sync_asset_loan_status() returns trigger as $$
begin
  if new.status = 'Dipinjam' and old.status <> 'Dipinjam' then
    update assets set asset_status = 'Dipinjam'
    where id in (select asset_id from loan_items where loan_id = new.id);
  elsif old.status in ('Dipinjam','Sebagian') and new.status in ('Dikembalikan','Selesai') then
    update assets set asset_status = 'Aktif'
    where id in (select asset_id from loan_items where loan_id = new.id)
      and asset_status = 'Dipinjam';
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists trg_loan_sync on loan_requests;
create trigger trg_loan_sync after update on loan_requests
for each row execute function sync_asset_loan_status();

-- Mutasi hanya memperbarui lokasi setelah selesai
create or replace function sync_transfer_completion() returns trigger as $$
begin
  if new.status = 'Selesai' and old.status <> 'Selesai' then
    update assets set
      current_location_id = new.destination_location_id,
      unit_id = new.destination_unit_id,
      asset_status = 'Aktif'
    where id in (select asset_id from asset_transfer_items where transfer_id = new.id);
    insert into asset_location_histories(asset_id, old_location_id, new_location_id, old_unit_id, new_unit_id, movement_date, notes, approved_by)
    select ti.asset_id, a.current_location_id, new.destination_location_id, a.unit_id, new.destination_unit_id, current_date, 'Mutasi ' || new.transfer_number, new.approved_by
    from asset_transfer_items ti
    join assets a on a.id = ti.asset_id
    where ti.transfer_id = new.id;
  elsif new.status in ('Disetujui','Pengiriman') and old.status = 'Pengajuan' then
    update assets set asset_status = 'Dalam Mutasi'
    where id in (select asset_id from asset_transfer_items where transfer_id = new.id);
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists trg_transfer_sync on asset_transfers;
create trigger trg_transfer_sync after update on asset_transfers
for each row execute function sync_transfer_completion();

-- Posting penyusutan satu periode (atomik, tidak ganda)
create or replace function post_depreciation_period(p_period uuid, p_posted_by uuid) returns integer as $$
declare
  v_org uuid;
  v_start date; v_end date;
  v_count integer := 0;
  r record;
  v_elapsed integer;
  v_dep numeric(15,2);
begin
  select organization_id, period_start, period_end into v_org, v_start, v_end
  from depreciation_periods where id = p_period;
  if v_org is null then raise exception 'Periode tidak ditemukan'; end if;
  if (select status from depreciation_periods where id = p_period) = 'Closed' then
    raise exception 'Periode sudah ditutup — tidak dapat diposting';
  end if;

  for r in
    select ad.*, a.acquisition_date
    from asset_depreciations ad
    join assets a on a.id = ad.asset_id
    where ad.organization_id = v_org and ad.depreciation_status = 'Aktif'
  loop
    if exists (select 1 from depreciation_entries where asset_depreciation_id = r.id and period_id = p_period) then
      continue; -- sudah diposting
    end if;
    v_elapsed := (date_part('year', v_end) - date_part('year', r.depreciation_start_date)) * 12
               + (date_part('month', v_end) - date_part('month', r.depreciation_start_date));
    if v_elapsed < 0 then continue; end if;

    if r.depreciation_method = 'straight_line' then
      v_dep := r.monthly_depreciation;
    else -- declining balance 150%
      v_dep := round((r.acquisition_cost - r.accumulated_depreciation) * (1.5 / r.useful_life_months), 2);
    end if;
    if r.accumulated_depreciation + v_dep > r.depreciable_amount then
      v_dep := r.depreciable_amount - r.accumulated_depreciation;
    end if;
    if v_dep <= 0 then
      update asset_depreciations set depreciation_status = 'Selesai Disusutkan', current_book_value = r.residual_value
      where id = r.id;
      continue;
    end if;

    insert into depreciation_entries(organization_id, asset_depreciation_id, period_id, depreciation_amount,
      accumulated_before, accumulated_after, book_value_after, posted_by)
    values (v_org, r.id, p_period, v_dep, r.accumulated_depreciation,
      r.accumulated_depreciation + v_dep, r.acquisition_cost - (r.accumulated_depreciation + v_dep), p_posted_by);

    update asset_depreciations
    set accumulated_depreciation = r.accumulated_depreciation + v_dep,
        current_book_value = greatest(r.acquisition_cost - (r.accumulated_depreciation + v_dep), r.residual_value),
        depreciation_status = case when r.accumulated_depreciation + v_dep >= r.depreciable_amount
          then 'Selesai Disusutkan' else 'Aktif' end
    where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$ language plpgsql;

-- =========================================================
-- SELESAI — lanjutkan dengan rls-policies.sql lalu seed.sql
-- =========================================================
