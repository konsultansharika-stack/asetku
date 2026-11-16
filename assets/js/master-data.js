/* =====================================================================
 * ASSET MANAGEMENT PRO — master-data.js
 * Master Data: Organisasi & Unit, Kategori, Lokasi, Pemasok/Satuan/Kondisi.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var canManage = Auth.can('manage.master') || Auth.isAdmin();
  var org = Auth.orgId();

  function guardDelete(table, fk, id, label) {
    return DB.count(table, fk ? { fk: id } : {}).then(function (n) {
      if (n) throw new Error('Tidak dapat menghapus: ' + n + ' data ' + label + ' masih terhubung.');
      return true;
    });
  }

  /* ===================== ORGANISASI & UNIT ===================== */
  function pageUnits() {
    Promise.all([
      DB.list('units', { order: 'name', asc: true }),
      DB.list('departments', { order: 'name', asc: true }),
      DB.list('divisions', { order: 'name', asc: true }),
      DB.list('profiles', {})
    ]).then(function (r) {
      var units = r[0].data, deps = r[1].data, divs = r[2].data, profs = r[3].data;
      var pMap = UI.mapBy(profs, 'id');
      document.getElementById('pageHead').innerHTML = UI.pageHeader('Organisasi & Unit Kerja',
        'Struktur yayasan, unit, departemen, dan bidang beserta penanggung jawab',
        (canManage ? '<button class="btn btn-primary btn-sm" id="addUnit"><i class="bi bi-plus-lg me-1"></i>Tambah Unit</button>' : ''));

      var unitCols = [
        { key: 'code', label: 'Kode', class: 'amp-col-code' },
        { key: 'name', label: 'Nama Unit' },
        { key: 'unit_type', label: 'Tipe', render: function (u) { return '<span class="text-muted small">' + UI.esc(u.unit_type || '-') + '</span>'; } },
        { key: 'parent_unit_id', label: 'Induk', render: function (u) { var p = units.find(function (x) { return x.id === u.parent_unit_id; }); return p ? UI.esc(p.name) : '<span class="text-muted">-</span>'; } },
        { key: 'manager_id', label: 'Penanggung Jawab', render: function (u) { return UI.esc((pMap[u.manager_id] || {}).full_name || '-'); } },
        { key: 'is_active', label: 'Status', render: function (u) { return UI.badge(u.is_active ? 'Aktif' : 'Diarsipkan'); } }
      ];
      var depCols = [
        { key: 'code', label: 'Kode' },
        { key: 'name', label: 'Nama Departemen' },
        { key: 'unit_id', label: 'Unit', render: function (d) { var u = units.find(function (x) { return x.id === d.unit_id; }); return UI.esc(u ? u.name : '-'); } },
        { key: 'is_active', label: 'Status', render: function (d) { return UI.badge(d.is_active ? 'Aktif' : 'Diarsipkan'); } }
      ];
      var divCols = [
        { key: 'code', label: 'Kode' },
        { key: 'name', label: 'Nama Bidang' },
        { key: 'department_id', label: 'Departemen', render: function (d) { var x = deps.find(function (y) { return y.id === d.department_id; }); return UI.esc(x ? x.name : '-'); } },
        { key: 'is_active', label: 'Status', render: function (d) { return UI.badge(d.is_active ? 'Aktif' : 'Diarsipkan'); } }
      ];
      function actions(table, fkLabel) {
        return function (row) {
          if (!canManage) return '';
          return UI.iconBtn('Ubah', 'pencil', 'data-act="edit" data-id="' + row.id + '"', 'btn-outline-primary') +
            UI.iconBtn('Hapus', 'trash', 'data-act="del" data-table="' + table + '" data-id="' + row.id + '" data-name="' + UI.esc(row.name) + '"', 'btn-outline-danger');
        };
      }
      var host = document.getElementById('masterTable');
      host.innerHTML =
        '<div class="card amp-card mb-3"><div class="card-header bg-transparent d-flex justify-content-between py-2"><h6 class="mb-0 fw-bold">Unit Kerja</h6></div><div class="card-body p-2" id="tblUnits"></div></div>' +
        '<div class="card amp-card mb-3"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold">Departemen</h6></div><div class="card-body p-2" id="tblDeps"></div></div>' +
        '<div class="card amp-card"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold">Bidang / Divisi</h6></div><div class="card-body p-2" id="tblDivs"></div></div>';

      UI.dataTable({ mount: '#tblUnits', columns: unitCols, rows: units, actions: actions('units'), pageSize: 8 });
      UI.dataTable({ mount: '#tblDeps', columns: depCols, rows: deps, actions: actions('departments'), pageSize: 8 });
      UI.dataTable({ mount: '#tblDivs', columns: divCols, rows: divs, actions: actions('divisions'), pageSize: 8 });

      var addUnitBtn = document.getElementById('addUnit');
      if (addUnitBtn) addUnitBtn.addEventListener('click', function () {
        UI.formModal({
          title: 'Tambah Unit Kerja', submitText: 'Simpan',
          fields: [
            { name: 'name', label: 'Nama Unit', required: true },
            { name: 'code', label: 'Kode Unit', required: true, col: 'col-6 col-md-4' },
            { name: 'unit_type', label: 'Tipe Unit', type: 'select', col: 'col-6 col-md-4', options: ['kantor_pusat', 'satuan_pendidikan', 'direktorat', 'departemen', 'unit_kerja'] },
            { name: 'parent_unit_id', label: 'Unit Induk (opsional)', type: 'select', col: 'col-md-4', options: units.map(function (u) { return { value: u.id, label: u.name }; }) },
            { name: 'manager_id', label: 'Penanggung Jawab', type: 'select', options: profs.map(function (p) { return { value: p.id, label: p.full_name }; }) },
            { name: 'is_active', label: 'Aktif', type: 'checkbox', value: true }
          ],
          onSubmit: function (data) {
            data.organization_id = org;
            return DB.insert('units', data).then(function (r) {
              if (r.error) throw r.error; UI.toast('success', 'Unit tersimpan'); window.PAGE_INIT(); AMP.refreshNotifBadge();
            });
          }
        });
      });
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        var id2 = b.dataset.id;
        if (b.dataset.act === 'edit') {
          var src = units.concat(deps, divs).find(function (x) { return x.id === id2; });
          if (!src) return;
          var isUnit = !!src.unit_type;
          UI.formModal({
            title: 'Ubah ' + (isUnit ? 'Unit' : src.department_id ? 'Bidang' : 'Departemen'),
            fields: [
              { name: 'name', label: 'Nama', required: true, value: src.name },
              { name: 'code', label: 'Kode', required: true, value: src.code, col: 'col-6' },
              ...(isUnit ? [{ name: 'unit_type', label: 'Tipe Unit', type: 'select', value: src.unit_type, options: ['kantor_pusat', 'satuan_pendidikan', 'direktorat', 'departemen', 'unit_kerja'] },
                { name: 'parent_unit_id', label: 'Unit Induk', type: 'select', value: src.parent_unit_id || '', options: units.filter(function (u) { return u.id !== src.id; }).map(function (u) { return { value: u.id, label: u.name }; }) },
                { name: 'manager_id', label: 'Penanggung Jawab', type: 'select', value: src.manager_id || '', options: profs.map(function (p) { return { value: p.id, label: p.full_name }; }) }] : []),
              { name: 'is_active', label: 'Aktif', type: 'checkbox', value: src.is_active !== false }
            ],
            onSubmit: function (data) {
              return DB.update(isUnit ? 'units' : (src.department_id ? 'divisions' : 'departments'), src.id, data).then(function (r) {
                if (r.error) throw r.error; UI.toast('success', 'Perubahan tersimpan'); window.PAGE_INIT();
              });
            }
          });
        } else if (b.dataset.act === 'del') {
          UI.confirmDialog({ title: 'Hapus ' + b.dataset.name + '?', danger: true, confirmText: 'Hapus' })
            .then(function (ok) {
              if (!ok) return;
              DB.remove(b.dataset.table, id2).then(function (r) {
                if (r.error) throw r.error;
                UI.toast('success', 'Data dihapus'); window.PAGE_INIT();
              }).catch(function (err) { UI.toast('error', err.message || 'Gagal menghapus'); });
            });
        }
      });
    });
  }

  /* ===================== KATEGORI ===================== */
  function pageCategories() {
    Promise.all([
      DB.list('asset_categories', { order: 'category_name', asc: true }),
      DB.list('assets', {})
    ]).then(function (r) {
      var cats = r[0].data, assets = r[1].data;
      var countBy = {};
      assets.forEach(function (a) { if (a.category_id) countBy[a.category_id] = (countBy[a.category_id] || 0) + 1; });
      document.getElementById('pageHead').innerHTML = UI.pageHeader('Kategori Barang',
        'Kategori dan subkategori barang beserta klasifikasi aset tetap / habis pakai',
        (canManage ? '<button class="btn btn-primary btn-sm" id="addBtn"><i class="bi bi-plus-lg me-1"></i>Tambah Kategori</button>' +
          '<button class="btn btn-outline-secondary btn-sm" id="expBtn"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>' : '<span></span>'));
      UI.dataTable({
        mount: '#masterTable',
        columns: [
          { key: 'category_code', label: 'Kode' },
          { key: 'category_name', label: 'Nama Kategori', render: function (c) { return (c.parent_id ? '<i class="bi bi-arrow-return-right text-muted me-1"></i>' : '<strong>') + UI.esc(c.category_name) + (c.parent_id ? '' : '</strong>'); } },
          { key: 'parent_id', label: 'Induk', render: function (c) { if (!c.parent_id) return '<span class="text-muted">-</span>'; var p = cats.find(function (x) { return x.id === c.parent_id; }); return UI.esc(p ? p.category_name : '-'); } },
          { key: 'is_fixed_asset', label: 'Aset Tetap', render: function (c) { return c.is_fixed_asset ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<span class="text-muted">-</span>'; } },
          { key: 'is_consumable', label: 'Habis Pakai', render: function (c) { return c.is_consumable ? '<i class="bi bi-check-circle-fill text-warning"></i>' : '<span class="text-muted">-</span>'; } },
          { key: 'id', label: 'Jumlah Aset', render: function (c) { return '<strong>' + (countBy[c.id] || 0) + '</strong>'; } },
          { key: 'is_active', label: 'Status', render: function (c) { return UI.badge(c.is_active ? 'Aktif' : 'Diarsipkan'); } }
        ],
        rows: cats,
        actions: function (c) {
          if (!canManage) return '';
          return UI.iconBtn('Ubah', 'pencil', 'data-act="edit" data-id="' + c.id + '"', 'btn-outline-primary') +
            UI.iconBtn('Hapus', 'trash', 'data-act="del" data-id="' + c.id + '"', 'btn-outline-danger');
        }
      });
      var exp = document.getElementById('expBtn');
      if (exp) exp.addEventListener('click', function () {
        UI.exportExcel('master-kategori.xlsx', cats.map(function (c) {
          var p = cats.find(function (x) { return x.id === c.parent_id; });
          return { Kode: c.category_code, Nama: c.category_name, Induk: p ? p.category_name : '', 'Aset Tetap': c.is_fixed_asset ? 'Ya' : 'Tidak', 'Habis Pakai': c.is_consumable ? 'Ya' : 'Tidak', Status: c.is_active ? 'Aktif' : 'Nonaktif' };
        }));
      });
      var formFields = function (v) {
        return [
          { name: 'category_code', label: 'Kode Kategori', required: true, col: 'col-6 col-md-4', value: v.category_code },
          { name: 'category_name', label: 'Nama Kategori', required: true, col: 'col-6 col-md-8', value: v.category_name },
          { name: 'parent_id', label: 'Kategori Induk (subkategori)', type: 'select', options: cats.filter(function (c) { return c.id !== v.id && !c.parent_id; }).map(function (c) { return { value: c.id, label: c.category_name }; }) },
          { name: 'is_fixed_asset', label: 'Klasifikasi sebagai aset tetap', type: 'checkbox', value: v.is_fixed_asset },
          { name: 'is_consumable', label: 'Klasifikasi sebagai barang habis pakai', type: 'checkbox', value: v.is_consumable },
          { name: 'is_active', label: 'Aktif', type: 'checkbox', value: v.is_active !== false }
        ];
      };
      var addBtn = document.getElementById('addBtn');
      if (addBtn) addBtn.addEventListener('click', function () {
        UI.formModal({
          title: 'Tambah Kategori Barang', submitText: 'Simpan', fields: formFields({}),
          onSubmit: function (data) {
            if (data.is_fixed_asset && data.is_consumable) { UI.toast('warning', 'Pilih salah satu klasifikasi'); return false; }
            data.organization_id = org;
            var dup = cats.find(function (c) { return c.category_code.toLowerCase() === String(data.category_code).toLowerCase(); });
            if (dup) { UI.toast('error', 'Kode kategori sudah digunakan'); return false; }
            return DB.insert('asset_categories', data).then(function (r) { if (r.error) throw r.error; UI.toast('success', 'Kategori tersimpan'); window.PAGE_INIT(); });
          }
        });
      });
      var host = document.getElementById('masterTable');
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        var c = cats.find(function (x) { return x.id === b.dataset.id; });
        if (b.dataset.act === 'edit') {
          UI.formModal({ title: 'Ubah Kategori', fields: formFields(c), submitText: 'Simpan',
            onSubmit: function (data) { return DB.update('asset_categories', c.id, data).then(function (r) { if (r.error) throw r.error; UI.toast('success', 'Perubahan tersimpan'); window.PAGE_INIT(); }); } });
        } else {
          UI.confirmDialog({ title: 'Hapus kategori ' + c.category_name + '?', danger: true, confirmText: 'Hapus' }).then(function (ok) {
            if (!ok) return;
            if ((countBy[c.id] || 0) > 0) { UI.toast('error', 'Tidak dapat menghapus: masih ada ' + countBy[c.id] + ' aset pada kategori ini.'); return; }
            DB.remove('asset_categories', c.id).then(function () { UI.toast('success', 'Kategori dihapus'); window.PAGE_INIT(); });
          });
        }
      });
    });
  }

  /* ===================== LOKASI ===================== */
  function pageLocations() {
    Promise.all([
      DB.list('locations', { order: 'location_code', asc: true }),
      DB.list('profiles', {}), DB.list('assets', {})
    ]).then(function (r) {
      var locs = r[0].data, profs = r[1].data, assets = r[2].data;
      var countBy = {};
      assets.forEach(function (a) { if (a.current_location_id) countBy[a.current_location_id] = (countBy[a.current_location_id] || 0) + 1; });
      document.getElementById('pageHead').innerHTML = UI.pageHeader('Lokasi & Ruangan',
        'Gedung, lantai, ruangan, dan lokasi penyimpanan barang',
        (canManage ? '<button class="btn btn-primary btn-sm" id="addBtn"><i class="bi bi-plus-lg me-1"></i>Tambah Lokasi</button>' +
          '<button class="btn btn-outline-secondary btn-sm" id="expBtn"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>' : '<span></span>'));
      UI.dataTable({
        mount: '#masterTable',
        columns: [
          { key: 'location_code', label: 'Kode' },
          { key: 'location_name', label: 'Nama Lokasi', render: function (l) { return (l.parent_location_id ? '<i class="bi bi-arrow-return-right text-muted me-1"></i>' : '<strong>') + UI.esc(l.location_name) + (l.parent_location_id ? '' : '</strong>'); } },
          { key: 'location_type', label: 'Tipe', render: function (l) { return '<span class="badge text-bg-light border">' + UI.esc(l.location_type) + '</span>'; } },
          { key: 'building', label: 'Gedung' },
          { key: 'floor', label: 'Lantai', render: function (l) { return UI.esc(l.floor && l.floor !== '-' ? l.floor : '-'); } },
          { key: 'room', label: 'Ruangan' },
          { key: 'responsible_user_id', label: 'Penanggung Jawab', render: function (l) { return UI.esc((profs.find(function (p) { return p.id === l.responsible_user_id; }) || {}).full_name || '-'); } },
          { key: 'id', label: 'Jumlah Aset', render: function (l) { return '<strong>' + (countBy[l.id] || 0) + '</strong>'; } },
          { key: 'is_active', label: 'Status', render: function (l) { return UI.badge(l.is_active ? 'Aktif' : 'Diarsipkan'); } }
        ],
        rows: locs,
        actions: function (l) {
          if (!canManage) return '';
          return UI.iconBtn('Ubah', 'pencil', 'data-act="edit" data-id="' + l.id + '"', 'btn-outline-primary') +
            UI.iconBtn('Hapus', 'trash', 'data-act="del" data-id="' + l.id + '"', 'btn-outline-danger');
        }
      });
      var exp = document.getElementById('expBtn');
      if (exp) exp.addEventListener('click', function () {
        UI.exportExcel('master-lokasi.xlsx', locs.map(function (l) {
          var p = profs.find(function (x) { return x.id === l.responsible_user_id; });
          return { Kode: l.location_code, Nama: l.location_name, Tipe: l.location_type, Gedung: l.building, Lantai: l.floor, Ruangan: l.room, PenanggungJawab: p ? p.full_name : '', Kapasitas: l.capacity || '', Status: l.is_active ? 'Aktif' : 'Nonaktif' };
        }));
      });
      var fields = function (v) {
        return [
          { name: 'location_code', label: 'Kode Lokasi', required: true, col: 'col-6 col-md-4', value: v.location_code },
          { name: 'location_name', label: 'Nama Lokasi', required: true, col: 'col-6 col-md-8', value: v.location_name },
          { name: 'location_type', label: 'Tipe', type: 'select', col: 'col-6 col-md-4', value: v.location_type || 'ruangan', options: [{ value: 'gedung', label: 'Gedung' }, { value: 'lantai', label: 'Lantai' }, { value: 'ruangan', label: 'Ruangan' }, { value: 'area', label: 'Area/Lapangan' }] },
          { name: 'parent_location_id', label: 'Induk (gedung)', type: 'select', col: 'col-6 col-md-8', options: locs.filter(function (l) { return l.id !== v.id && (l.location_type === 'gedung' || l.location_type === 'lantai'); }).map(function (l) { return { value: l.id, label: l.location_name }; }) },
          { name: 'building', label: 'Gedung', col: 'col-6 col-md-4', value: v.building },
          { name: 'floor', label: 'Lantai', col: 'col-6 col-md-4', value: v.floor },
          { name: 'room', label: 'Ruangan', col: 'col-6 col-md-4', value: v.room },
          { name: 'capacity', label: 'Kapasitas', type: 'number', col: 'col-6 col-md-4', value: v.capacity },
          { name: 'responsible_user_id', label: 'Penanggung Jawab Ruangan', type: 'select', options: profs.map(function (p) { return { value: p.id, label: p.full_name }; }), value: v.responsible_user_id },
          { name: 'description', label: 'Deskripsi', type: 'textarea', value: v.description },
          { name: 'is_active', label: 'Aktif', type: 'checkbox', value: v.is_active !== false }
        ];
      };
      var addBtn = document.getElementById('addBtn');
      if (addBtn) addBtn.addEventListener('click', function () {
        UI.formModal({ title: 'Tambah Lokasi', submitText: 'Simpan', size: 'lg', fields: fields({}),
          onSubmit: function (data) {
            data.organization_id = org; data.capacity = data.capacity || null;
            return DB.insert('locations', data).then(function (r2) { if (r2.error) throw r2.error; UI.toast('success', 'Lokasi tersimpan'); window.PAGE_INIT(); });
          } });
      });
      var host = document.getElementById('masterTable');
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        var l = locs.find(function (x) { return x.id === b.dataset.id; });
        if (b.dataset.act === 'edit') {
          UI.formModal({ title: 'Ubah Lokasi', size: 'lg', fields: fields(l), submitText: 'Simpan',
            onSubmit: function (data) { return DB.update('locations', l.id, data).then(function (r2) { if (r2.error) throw r2.error; UI.toast('success', 'Perubahan tersimpan'); window.PAGE_INIT(); }); } });
        } else {
          UI.confirmDialog({ title: 'Hapus lokasi ' + l.location_name + '?', danger: true, confirmText: 'Hapus' }).then(function (ok) {
            if (!ok) return;
            if ((countBy[l.id] || 0) > 0) { UI.toast('error', 'Tidak dapat menghapus: masih ada aset di lokasi ini.'); return; }
            DB.remove('locations', l.id).then(function () { UI.toast('success', 'Lokasi dihapus'); window.PAGE_INIT(); });
          });
        }
      });
    });
  }

  /* ===================== PEMASOK + SATUAN + SUMBER DANA + KONDISI ===================== */
  function pageSuppliers() {
    Promise.all([
      DB.list('suppliers', { order: 'supplier_name', asc: true }),
      DB.list('units_of_measure', { order: 'name', asc: true }),
      DB.list('funding_sources', { order: 'name', asc: true }),
      DB.list('asset_conditions', { order: 'condition_code', asc: true })
    ]).then(function (r) {
      var sups = r[0].data, uoms = r[1].data, funds = r[2].data, conds = r[3].data;
      document.getElementById('pageHead').innerHTML = UI.pageHeader('Pemasok & Master Lainnya',
        'Data pemasok, satuan ukur, sumber dana, dan master kondisi barang');

      UI.dataTable({
        mount: '#masterTable',
        columns: [
          { key: 'supplier_code', label: 'Kode' },
          { key: 'supplier_name', label: 'Nama Pemasok / Perusahaan', render: function (s) { return '<strong>' + UI.esc(s.supplier_name) + '</strong>'; } },
          { key: 'contact_person', label: 'Kontak Person' },
          { key: 'phone', label: 'Telepon' },
          { key: 'email', label: 'Email' },
          { key: 'tax_number', label: 'NPWP', render: function (s) { return UI.esc(s.tax_number || '-'); } },
          { key: 'is_active', label: 'Status', render: function (s) { return UI.badge(s.is_active ? 'Aktif' : 'Nonaktif'); } }
        ],
        rows: sups,
        actions: function (s) {
          if (!canManage) return '';
          return UI.iconBtn('Ubah', 'pencil', 'data-act="edit" data-id="' + s.id + '"', 'btn-outline-primary') +
            UI.iconBtn('Hapus', 'trash', 'data-act="del" data-id="' + s.id + '"', 'btn-outline-danger');
        }
      });
      var fields = function (v) {
        return [
          { name: 'supplier_code', label: 'Kode Pemasok', required: true, col: 'col-6 col-md-4', value: v.supplier_code },
          { name: 'supplier_name', label: 'Nama Perusahaan / Pemasok', required: true, col: 'col-6 col-md-8', value: v.supplier_name },
          { name: 'contact_person', label: 'Kontak Person', col: 'col-6', value: v.contact_person },
          { name: 'phone', label: 'Nomor Telepon', col: 'col-6', value: v.phone },
          { name: 'email', label: 'Email', type: 'email', value: v.email },
          { name: 'tax_number', label: 'NPWP (opsional)', value: v.tax_number },
          { name: 'address', label: 'Alamat', type: 'textarea', value: v.address },
          { name: 'is_active', label: 'Aktif', type: 'checkbox', value: v.is_active !== false }
        ];
      };
      var host = document.getElementById('masterTable');
      host.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        var s = sups.find(function (x) { return x.id === b.dataset.id; });
        if (b.dataset.act === 'edit') {
          UI.formModal({ title: 'Ubah Pemasok', size: 'lg', fields: fields(s), submitText: 'Simpan',
            onSubmit: function (data) { return DB.update('suppliers', s.id, data).then(function (r2) { if (r2.error) throw r2.error; UI.toast('success', 'Perubahan tersimpan'); window.PAGE_INIT(); }); } });
        } else {
          UI.confirmDialog({ title: 'Hapus pemasok ' + s.supplier_name + '?', danger: true, confirmText: 'Hapus' }).then(function (ok) {
            if (!ok) return;
            DB.remove('suppliers', s.id).then(function () { UI.toast('success', 'Pemasok dihapus'); window.PAGE_INIT(); });
          });
        }
      });
      var exp = document.getElementById('pageHead').querySelector ? null : null;
      // Tambah pemasok (tombol di header kartu tabel)
      setTimeout(function () {
        var tb = document.querySelector('#masterTable .amp-tbl-search');
        if (tb && canManage) {
          var btn = document.createElement('button');
          btn.className = 'btn btn-primary btn-sm me-2';
          btn.innerHTML = '<i class="bi bi-plus-lg me-1"></i>Tambah Pemasok';
          tb.parentNode.parentNode.querySelector('.amp-tbl-search').parentNode.insertBefore(btn, tb.parentNode);
          btn.addEventListener('click', function () {
            UI.formModal({ title: 'Tambah Pemasok', size: 'lg', fields: fields({}), submitText: 'Simpan',
              onSubmit: function (data) { data.organization_id = org; return DB.insert('suppliers', data).then(function (r2) { if (r2.error) throw r2.error; UI.toast('success', 'Pemasok tersimpan'); window.PAGE_INIT(); }); } });
          });
        }
      }, 100);

      /* Satuan */
      UI.dataTable({
        mount: '#uomTable',
        columns: [{ key: 'name', label: 'Nama Satuan' }, { key: 'symbol', label: 'Simbol' }],
        rows: uoms,
        search: false, pageSize: 12,
        actions: function (u) {
          if (!canManage) return '';
          return UI.iconBtn('Ubah', 'pencil', 'data-uact="edit-uom" data-id="' + u.id + '"', 'btn-outline-primary') +
            UI.iconBtn('Hapus', 'trash', 'data-uact="del-uom" data-id="' + u.id + '"', 'btn-outline-danger');
        }
      });
      /* Sumber Dana */
      UI.dataTable({
        mount: '#fundTable',
        columns: [{ key: 'name', label: 'Nama Sumber Dana' }, { key: 'description', label: 'Keterangan' }, { key: 'is_active', label: 'Status', render: function (f) { return UI.badge(f.is_active ? 'Aktif' : 'Nonaktif'); } }],
        rows: funds, search: false, pageSize: 12,
        actions: function (f) {
          if (!canManage) return '';
          return UI.iconBtn('Ubah', 'pencil', 'data-uact="edit-fund" data-id="' + f.id + '"', 'btn-outline-primary') +
            UI.iconBtn('Hapus', 'trash', 'data-uact="del-fund" data-id="' + f.id + '"', 'btn-outline-danger');
        }
      });
      /* Kondisi */
      UI.dataTable({
        mount: '#condTable',
        columns: [{ key: 'condition_code', label: 'Kode' }, { key: 'condition_name', label: 'Kondisi' }, { key: 'description', label: 'Deskripsi' }],
        rows: conds, search: false, pageSize: 12,
        actions: function (c) {
          if (!canManage) return '';
          return UI.iconBtn('Ubah', 'pencil', 'data-uact="edit-cond" data-id="' + c.id + '"', 'btn-outline-primary');
        }
      });

      document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-uact]'); if (!b) return;
        var kind = b.dataset.uact.split('-')[1];
        var set = kind === 'uom' ? uoms : kind === 'fund' ? funds : conds;
        var table = kind === 'uom' ? 'units_of_measure' : kind === 'fund' ? 'funding_sources' : 'asset_conditions';
        var row = set.find(function (x) { return x.id === b.dataset.id; });
        if (b.dataset.uact.startsWith('del')) {
          UI.confirmDialog({ title: 'Hapus data ini?', danger: true, confirmText: 'Hapus' }).then(function (ok) {
            if (ok) DB.remove(table, row.id).then(function () { UI.toast('success', 'Dihapus'); window.PAGE_INIT(); });
          });
          return;
        }
        var flds = kind === 'uom' ? [{ name: 'name', label: 'Nama Satuan', required: true, value: row.name }, { name: 'symbol', label: 'Simbol', value: row.symbol }]
          : kind === 'fund' ? [{ name: 'name', label: 'Nama Sumber Dana', required: true, value: row.name }, { name: 'description', label: 'Keterangan', type: 'textarea', value: row.description }, { name: 'is_active', label: 'Aktif', type: 'checkbox', value: row.is_active !== false }]
          : [{ name: 'condition_name', label: 'Nama Kondisi', required: true, value: row.condition_name }, { name: 'condition_code', label: 'Kode', required: true, value: row.condition_code }, { name: 'description', label: 'Deskripsi', type: 'textarea', value: row.description }];
        UI.formModal({ title: 'Ubah ' + (kind === 'uom' ? 'Satuan' : kind === 'fund' ? 'Sumber Dana' : 'Kondisi'), fields: flds, submitText: 'Simpan',
          onSubmit: function (data) { return DB.update(table, row.id, data).then(function (r2) { if (r2.error) throw r2.error; UI.toast('success', 'Tersimpan'); window.PAGE_INIT(); }); } });
      });
      if (canManage) addMiniAddButtons(uoms, funds);
    });
  }

  function addMiniAddButtons(uoms, funds) {
    [['#tabUom', 'Tambah Satuan', function () {
      UI.formModal({ title: 'Tambah Satuan', fields: [{ name: 'name', label: 'Nama Satuan', required: true }, { name: 'symbol', label: 'Simbol' }], submitText: 'Simpan',
        onSubmit: function (d) { return DB.insert('units_of_measure', d).then(function (r) { if (r.error) throw r.error; UI.toast('success', 'Tersimpan'); window.PAGE_INIT(); }); } });
    }], ['#tabFund', 'Tambah Sumber Dana', function () {
      UI.formModal({ title: 'Tambah Sumber Dana', fields: [{ name: 'name', label: 'Nama Sumber Dana', required: true }, { name: 'description', label: 'Keterangan', type: 'textarea' }, { name: 'is_active', label: 'Aktif', type: 'checkbox', value: true }], submitText: 'Simpan',
        onSubmit: function (d) { d.organization_id = org; return DB.insert('funding_sources', d).then(function (r) { if (r.error) throw r.error; UI.toast('success', 'Tersimpan'); window.PAGE_INIT(); }); } });
    }]].forEach(function (cfg) {
      var tab = document.querySelector(cfg[0]);
      if (!tab) return;
      var btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-sm mb-2';
      btn.innerHTML = '<i class="bi bi-plus-lg me-1"></i>' + cfg[1];
      tab.insertBefore(btn, tab.firstChild);
      btn.addEventListener('click', cfg[2]);
    });
  }

  var key = AMP.pageKey();
  if (key === 'units') pageUnits();
  else if (key === 'categories') pageCategories();
  else if (key === 'locations') pageLocations();
  else if (key === 'suppliers') pageSuppliers();
};
