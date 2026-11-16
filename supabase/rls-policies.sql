/* =====================================================================
 * ASSET MANAGEMENT PRO — supabase/rls-policies.sql
 * Row Level Security (RBAC di level database) + policy Storage.
 *
 * Jalankan SETELAH schema.sql.
 * Prinsip: semua pengguna terautentikasi hanya melihat data
 * organisasinya; hak tulis ditentukan peran (user_roles).
 * ===================================================================== */

-- =========================================================
-- FUNGSI PEMBANTU KONTEKS PENGGUNA
-- =========================================================

-- Organisasi pengguna saat ini
create or replace function current_org_id() returns uuid as $$
  select organization_id from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Peran (role_key) pengguna saat ini
create or replace function current_role_keys() returns text[] as $$
  select coalesce(array_agg(r.role_key), '{}')
  from user_roles ur
  join roles r on r.id = ur.role_id
  where ur.user_id = auth.uid();
$$ language sql stable security definer;

create or replace function has_role(role_keys text[]) returns boolean as $$
  select (current_role_keys() && role_keys) or ('super_admin' = any(current_role_keys()));
$$ language sql stable security definer;

-- Definisi kelompok hak akses
-- super_admin: semua
-- pimpinan, direktur: persetujuan & pemantauan
-- manajer: persetujuan unit
-- pengelola: operasional aset
-- gudang: penerimaan & stok
-- teknisi: pemeliharaan
-- keuangan: penyusutan & nilai
-- pegawai: pengajuan
create or replace function can_manage_master() returns boolean as $$
  select has_role(array['pengelola']);
$$ language sql stable security definer;

create or replace function can_manage_assets() returns boolean as $$
  select has_role(array['pengelola','gudang']);
$$ language sql stable security definer;

create or replace function can_process_transactions() returns boolean as $$
  select has_role(array['pengelola','gudang','manajer','teknisi']);
$$ language sql stable security definer;

create or replace function can_approve() returns boolean as $$
  select has_role(array['pimpinan','direktur','manajer','keuangan']);
$$ language sql stable security definer;

create or replace function can_manage_users() returns boolean as $$
  select has_role(array['super_admin']);
$$ language sql stable security definer;

-- =========================================================
-- AKTIFKAN RLS SEMUA TABEL
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','units','departments','divisions','profiles','roles','user_roles',
    'asset_categories','units_of_measure','locations','suppliers','funding_sources','asset_conditions',
    'assets','asset_identifiers','asset_documents','asset_condition_histories','asset_location_histories','asset_qr_logs',
    'procurement_requests','procurement_request_items','procurements','procurement_items','goods_receipts','goods_receipt_items',
    'loan_requests','loan_items','loan_returns','loan_return_items','loan_status_histories',
    'asset_transfers','asset_transfer_items',
    'maintenance_requests','maintenance_schedules','maintenance_records','maintenance_parts',
    'depreciation_settings','asset_depreciations','depreciation_periods','depreciation_entries',
    'stock_opnames','stock_opname_items','stock_opname_adjustments',
    'asset_disposals','asset_disposal_items',
    'approval_workflows','approval_steps','approval_histories','notifications','audit_logs','app_settings']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists p_%s_select on %I;', t, t);
    execute format('drop policy if exists p_%s_insert on %I;', t, t);
    execute format('drop policy if exists p_%s_update on %I;', t, t);
    execute format('drop policy if exists p_%s_delete on %I;', t, t);
  end loop;
end $$;

-- =========================================================
-- POLISI SELECT (semua anggota organisasi dapat membaca)
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'units','departments','divisions','asset_categories','locations','suppliers','funding_sources',
    'assets','asset_identifiers','asset_documents','asset_condition_histories','asset_location_histories','asset_qr_logs',
    'procurement_requests','procurement_request_items','procurements','procurement_items','goods_receipts','goods_receipt_items',
    'loan_requests','loan_items','loan_returns','loan_return_items','loan_status_histories',
    'asset_transfers','asset_transfer_items',
    'maintenance_requests','maintenance_schedules','maintenance_records','maintenance_parts',
    'depreciation_settings','asset_depreciations','depreciation_periods','depreciation_entries',
    'stock_opnames','stock_opname_items','stock_opname_adjustments',
    'asset_disposals','asset_disposal_items',
    'approval_workflows','approval_steps','approval_histories','app_settings']
  loop
    execute format($f$
      create policy p_%1$s_select on %1$I for select to authenticated
      using (organization_id = current_org_id() or has_role(array['super_admin']));
    $f$, t);
  end loop;
end $$;

-- Tabel referensi global dibaca semua pengguna terautentikasi
create policy p_roles_select on roles for select to authenticated using (true);
create policy p_conditions_select on asset_conditions for select to authenticated using (true);
create policy p_uom_select on units_of_measure for select to authenticated using (true);

-- organizations: hanya organisasi sendiri
create policy p_org_select on organizations for select to authenticated
  using (id = current_org_id());

-- profiles: satu organisasi (untuk daftar penanggung jawab)
create policy p_profiles_select on profiles for select to authenticated
  using (organization_id = current_org_id() or id = auth.uid());

-- user_roles: admin, atau data sendiri
create policy p_userroles_select on user_roles for select to authenticated
  using (user_id = auth.uid() or organization_id = current_org_id());

-- notifications: milik sendiri + broadcast (user_id null)
create policy p_notif_select on notifications for select to authenticated
  using (user_id = auth.uid() or user_id is null);

-- audit_logs: hanya super admin
create policy p_audit_select on audit_logs for select to authenticated
  using (has_role(array['super_admin']));

-- =========================================================
-- POLISI INSERT
-- =========================================================
do $$
declare t text;
begin
  -- Master data: pengelola & admin
  foreach t in array array['units','departments','divisions','asset_categories','locations','suppliers','funding_sources']
  loop
    execute format($f$
      create policy p_%1$s_insert on %1$I for insert to authenticated
      with check (organization_id = current_org_id() and can_manage_master());
    $f$, t);
  end loop;

  -- Aset & riwayat: pengelola/gudang
  foreach t in array array['assets','asset_identifiers','asset_documents','asset_condition_histories','asset_location_histories','asset_qr_logs']
  loop
    execute format($f$
      create policy p_%1$s_insert on %1$I for insert to authenticated
      with check (organization_id = current_org_id() and (can_manage_assets() or has_role(array['pegawai','teknisi','manajer','keuangan'])));
    $f$, t);
  end loop;

  -- Transaksi: pegawai boleh mengajukan, proses oleh operator
  foreach t in array array['procurement_requests','procurement_request_items','loan_requests','loan_items',
    'maintenance_requests','asset_transfers','asset_transfer_items','stock_opnames','stock_opname_items',
    'asset_disposals','asset_disposal_items']
  loop
    execute format($f$
      create policy p_%1$s_insert on %1$I for insert to authenticated
      with check (organization_id = current_org_id() and can_process_transactions());
    $f$, t);
  end loop;

  foreach t in array array['procurements','procurement_items','goods_receipts','goods_receipt_items',
    'loan_returns','loan_return_items','loan_status_histories',
    'maintenance_schedules','maintenance_records','maintenance_parts',
    'depreciation_settings','asset_depreciations','depreciation_periods','depreciation_entries',
    'stock_opname_adjustments','approval_workflows','approval_steps','approval_histories','app_settings']
  loop
    execute format($f$
      create policy p_%1$s_insert on %1$I for insert to authenticated
      with check (organization_id = current_org_id() and (can_process_transactions() or can_approve() or has_role(array['keuangan'])));
    $f$, t);
  end loop;
end $$;

-- notifications: semua boleh membuat (sistem/pengguna)
create policy p_notif_insert on notifications for insert to authenticated with check (true);

-- audit_logs: sistem saja (via trigger security definer)
create policy p_audit_insert on audit_logs for insert to authenticated with check (false);

-- =========================================================
-- POLISI UPDATE
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array['units','departments','divisions','asset_categories','locations','suppliers','funding_sources']
  loop
    execute format($f$
      create policy p_%1$s_update on %1$I for update to authenticated
      using (organization_id = current_org_id()) with check (organization_id = current_org_id() and can_manage_master());
    $f$, t);
  end loop;

  foreach t in array array['assets','asset_identifiers','asset_documents']
  loop
    execute format($f$
      create policy p_%1$s_update on %1$I for update to authenticated
      using (organization_id = current_org_id()) with check (organization_id = current_org_id() and can_manage_assets());
    $f$, t);
  end loop;

  foreach t in array array['procurement_requests','loan_requests','asset_transfers','maintenance_requests',
    'maintenance_schedules','stock_opnames','stock_opname_items','asset_disposals','procurements',
    'goods_receipts','asset_disposal_items','stock_opname_adjustments']
  loop
    execute format($f$
      create policy p_%1$s_update on %1$I for update to authenticated
      using (organization_id = current_org_id()) with check (organization_id = current_org_id() and (can_process_transactions() or can_approve()));
    $f$, t);
  end loop;

  foreach t in array array['asset_depreciations','depreciation_periods','depreciation_settings','app_settings']
  loop
    execute format($f$
      create policy p_%1$s_update on %1$I for update to authenticated
      using (organization_id = current_org_id()) with check (organization_id = current_org_id() and has_role(array['keuangan','super_admin']));
    $f$, t);
  end loop;
end $$;

-- Riwayat tidak boleh diubah (append-only)
create policy p_condhist_update on asset_condition_histories for update to authenticated using (false);
create policy p_lochist_update on asset_location_histories for update to authenticated using (false);
create policy p_loanhist_update on loan_status_histories for update to authenticated using (false);
create policy p_qrlog_update on asset_qr_logs for update to authenticated using (false);
create policy p_apphist_update on approval_histories for update to authenticated using (false);
create policy p_depent_update on depreciation_entries for update to authenticated using (false);

-- profiles: pengguna edit data sendiri, admin penuh
create policy p_profiles_update on profiles for update to authenticated
  using (id = auth.uid() or has_role(array['super_admin']))
  with check (id = auth.uid() or has_role(array['super_admin']));

-- user_roles: hanya admin
create policy p_userroles_update on user_roles for update to authenticated
  using (can_manage_users()) with check (can_manage_users());
create policy p_userroles_insert on user_roles for insert to authenticated
  with check (can_manage_users());
create policy p_userroles_delete on user_roles for delete to authenticated
  using (can_manage_users());

-- notifications: pengguna menandai miliknya dibaca
create policy p_notif_update on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- POLISI DELETE
-- =========================================================
-- Prinsip: data transaksi selesai tidak boleh dihapus permanen.
do $$
declare t text;
begin
  foreach t in array array['units','departments','divisions','asset_categories','locations','suppliers','funding_sources']
  loop
    execute format($f$
      create policy p_%1$s_delete on %1$I for delete to authenticated
      using (organization_id = current_org_id() and can_manage_master());
    $f$, t);
  end loop;

  foreach t in array array['assets','asset_identifiers','asset_documents']
  loop
    execute format($f$
      create policy p_%1$s_delete on %1$I for delete to authenticated
      using (organization_id = current_org_id() and can_manage_assets() and asset_status_review(t_asset := id));
    $f$, t);
  end loop;
end $$;

-- helper untuk delete draft saja
create or replace function asset_status_review(t_asset uuid) returns boolean as $$
  select exists (select 1 from assets where id = t_asset and asset_status = 'Draft');
$$ language sql stable security definer;

-- Riwayat & entri keuangan: tidak boleh dihapus oleh siapa pun
create policy p_condhist_delete on asset_condition_histories for delete to authenticated using (false);
create policy p_lochist_delete on asset_location_histories for delete to authenticated using (false);
create policy p_loanhist_delete on loan_status_histories for delete to authenticated using (false);
create policy p_depent_delete on depreciation_entries for delete to authenticated using (false);
create policy p_apphist_delete on approval_histories for delete to authenticated using (false);

-- Draft transaksi dapat dibatalkan/dihapus operator
create policy p_req_delete on procurement_requests for delete to authenticated
  using (organization_id = current_org_id() and status = 'Draft' and can_process_transactions());
create policy p_loan_delete on loan_requests for delete to authenticated
  using (organization_id = current_org_id() and status = 'Draft' and can_process_transactions());

-- notifications
create policy p_notif_delete on notifications for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- SUPABASE STORAGE: BUCKET PRIVAT + POLICY
-- =========================================================
insert into storage.buckets (id, name, public)
values
  ('asset-photos', 'asset-photos', false),
  ('asset-documents', 'asset-documents', false),
  ('procurement-documents', 'procurement-documents', false),
  ('maintenance-photos', 'maintenance-photos', false),
  ('stock-opname-photos', 'stock-opname-photos', false),
  ('disposal-documents', 'disposal-documents', false),
  ('qr-labels', 'qr-labels', false)
on conflict (id) do nothing;

-- Pengguna terautentikasi anggota organisasi dapat mengakses file
-- (path file dianjurkan memakai prefix organization_id/)
create policy "storage auth read" on storage.objects for select to authenticated
  using (bucket_id in ('asset-photos','asset-documents','procurement-documents','maintenance-photos','stock-opname-photos','disposal-documents','qr-labels'));
create policy "storage auth insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('asset-photos','asset-documents','procurement-documents','maintenance-photos','stock-opname-photos','disposal-documents','qr-labels'));
create policy "storage auth update" on storage.objects for update to authenticated
  using (bucket_id in ('asset-photos','asset-documents','procurement-documents','maintenance-photos','stock-opname-photos','disposal-documents','qr-labels'));
create policy "storage auth delete" on storage.objects for delete to authenticated
  using (bucket_id in ('asset-photos','asset-documents','procurement-documents','maintenance-photos','stock-opname-photos','disposal-documents','qr-labels') and has_role(array['super_admin','pengelola']));

-- Catatan akses file privat:
-- Gunakan signed URL berbatas waktu: await supabase.storage.from('asset-documents').createSignedUrl(path, 300)

-- =========================================================
-- TRIGGER PROFIL BARU (opsional):
-- Buat profil otomatis ketika pengguna baru mendaftar di Auth.
-- =========================================================
create or replace function handle_new_user() returns trigger as $$
begin
  -- Hanya buat profil bila ada raw_user_meta_data.organization_id
  if new.raw_user_meta_data->>'organization_id' is not null then
    insert into profiles (id, organization_id, full_name, email)
    values (new.id, (new.raw_user_meta_data->>'organization_id')::uuid,
            coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
