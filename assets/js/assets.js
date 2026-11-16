/* =====================================================================
 * ASSET MANAGEMENT PRO — assets.js
 * Data Inventaris: CRUD aset, kode otomatis, QR, ekspor, filter lengkap.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var canManage = Auth.can('manage.assets') || Auth.isPengelola() || Auth.isAdmin();
  var org = Auth.orgId();
  var lookups = {};
  var selected = new Set();
  var rows = [];

  var params = new URLSearchParams(location.search);
  var filters = {
    q: params.get('q') || '', category: params.get('category') || '',
    unit: params.get('unit') || '', location: params.get('location') || '',
    condition: params.get('condition') || '', status: params.get('status') || '',
    type: params.get('type') || ''
  };

  function load() {
    return Promise.all([
      DB.list('assets', { order: 'created_at', asc: false, limit: 1500 }),
      DB.list('asset_categories', {}),
      DB.list('units', {}), DB.list('locations', {}),
      DB.list('asset_conditions', {}), DB.list('suppliers', {}),
      DB.list('funding_sources', {}), DB.list('profiles', {}),
      DB.list('units_of_measure', {}), DB.list('departments', {})
    ]).then(function (r) {
      rows = r[0].data;
      lookups.cat = UI.mapBy(r[1].data, 'id');
      lookups.unit = UI.mapBy(r[2].data, 'id');
      lookups.loc = UI.mapBy(r[3].data, 'id');
      lookups.cond = UI.mapBy(r[4].data, 'id');
      lookups.sup = UI.mapBy(r[5].data, 'id');
      lookups.fund = UI.mapBy(r[6].data, 'id');
      lookups.prof = UI.mapBy(r[7].data, 'id');
      lookups.uom = UI.mapBy(r[8].data, 'id');
      lookups.dep = UI.mapBy(r[9].data, 'id');
      return decorate();
    });
  }

  function decorate() {
    rows.forEach(function (a) {
      a.category_name = lookups.cat[a.category_id] ? lookups.cat[a.category_id].category_name : '-';
      a.location_name = a.current_location_id && lookups.loc[a.current_location_id] ? lookups.loc[a.current_location_id].location_name : null;
      a.unit_name = lookups.unit[a.unit_id] ? lookups.unit[a.unit_id].name : '-';
      a.condition_name = lookups.cond[a.current_condition_id] ? lookups.cond[a.current_condition_id].condition_name : '-';
      a.responsible_name = lookups.prof[a.responsible_user_id] ? lookups.prof[a.responsible_user_id].full_name : '-';
      a.supplier_name = lookups.sup[a.supplier_id] ? lookups.sup[a.supplier_id].supplier_name : null;
      a.funding_name = lookups.fund[a.funding_source_id] ? lookups.fund[a.funding_source_id].name : null;
      a.uom_name = lookups.uom[a.unit_of_measure_id] ? lookups.uom[a.unit_of_measure_id].name : '-';
    });
  }

  /* ---------------- FILTER BAR ---------------- */
  function renderFilters() {
    var el = document.getElementById('assetsFilters');
    var opt = function (rowsArr, valKey, labKey, cur, allLabel) {
      return '<option value="">' + allLabel + '</option>' + rowsArr.map(function (x) {
        return '<option value="' + x[valKey] + '"' + (String(cur) === String(x[valKey]) ? ' selected' : '') + '>' + UI.esc(x[labKey]) + '</option>';
      }).join('');
    };
    var cats = Object.values(lookups.cat), units = Object.values(lookups.unit),
      locs = Object.values(lookups.loc), conds = Object.values(lookups.cond);
    el.innerHTML =
      '<input type="search" class="form-control" id="fQ" placeholder="Cari kode/nama/seri..." value="' + UI.esc(filters.q) + '" style="min-width:190px">' +
      '<select class="form-select" id="fCat">' + opt(cats, 'id', 'category_name', filters.category, 'Semua Kategori') + '</select>' +
      '<select class="form-select" id="fUnit">' + opt(units, 'id', 'name', filters.unit, 'Semua Unit') + '</select>' +
      '<select class="form-select" id="fLoc">' + opt(locs, 'id', 'location_name', filters.location, 'Semua Lokasi') + '</select>' +
      '<select class="form-select" id="fCond">' + opt(conds, 'id', 'condition_name', filters.condition, 'Semua Kondisi') + '</select>' +
      '<select class="form-select" id="fStatus"><option value="">Semua Status</option>' +
      ['Draft', 'Menunggu Verifikasi', 'Aktif', 'Dipinjam', 'Dalam Pemeliharaan', 'Dalam Mutasi', 'Rusak', 'Hilang', 'Dihapuskan'].map(function (s) {
        return '<option value="' + s + '"' + (filters.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') + '</select>';
    var get = function (id2) { return document.getElementById(id2); };
    get('fCat').onchange = function (e) { filters.category = e.target.value; apply(); };
    get('fUnit').onchange = function (e) { filters.unit = e.target.value; apply(); };
    get('fLoc').onchange = function (e) { filters.location = e.target.value; apply(); };
    get('fCond').onchange = function (e) { filters.condition = e.target.value; apply(); };
    get('fStatus').onchange = function (e) { filters.status = e.target.value; apply(); };
    get('fQ').oninput = UI.debounce(function (e) { filters.q = e.target.value; apply(); }, 250);
  }

  function apply() {
    var q = filters.q.toLowerCase();
    var data = rows.filter(function (a) {
      if (filters.category && a.category_id !== filters.category) return false;
      if (filters.unit && a.unit_id !== filters.unit) return false;
      if (filters.location) {
        if (filters.location === 'none' && a.current_location_id) return false;
        if (filters.location !== 'none' && a.current_location_id !== filters.location) return false;
      }
      if (filters.condition && a.current_condition_id !== filters.condition) return false;
      if (filters.status && a.asset_status !== filters.status) return false;
      if (q && !(a.asset_code + ' ' + a.asset_name + ' ' + (a.brand || '') + ' ' + (a.serial_number || '')).toLowerCase().includes(q)) return false;
      return true;
    });
    if (tbl) tbl.reload(data);
    var headEl = document.getElementById('assetsHead');
    var meta = headEl && headEl.querySelector('.amp-head-meta');
    if (meta) {
      var n = data.length;
      var totalVal = data.reduce(function (s, a) { return s + (a.acquisition_cost || 0); }, 0);
      meta.innerHTML = '<span class="text-muted small"><strong>' + n + '</strong> aset · nilai perolehan <strong>' + UI.rp(totalVal) + '</strong></span>';
    }
  }

  /* ---------------- TABLE ---------------- */
  var tbl = null;
  function renderTable() {
    tbl = UI.dataTable({
      mount: '#assetsTable',
      columns: [
        { key: 'sel', label: '', class: 'amp-col-sel', render: function (a) { return '<input type="checkbox" class="form-check-input amp-row-sel" data-id="' + a.id + '"' + (selected.has(a.id) ? ' checked' : '') + (a.qr_token ? '' : ' disabled title="Belum ada QR"') + '>'; } },
        { key: 'asset_code', label: 'Kode Inventaris', render: function (a) { return '<span class="amp-asset-code">' + UI.esc(a.asset_code || '(draft)') + '</span>'; } },
        { key: 'asset_name', label: 'Nama Barang', render: function (a) {
          var t = a.asset_type === 'fixed' ? ' <i class="bi bi-building text-secondary" title="Aset tetap"></i>' : a.asset_type === 'consumable' ? ' <i class="bi bi-basket2 text-warning" title="Habis pakai"></i>' : '';
          return '<a class="fw-semibold text-decoration-none" href="asset-detail.html?id=' + a.id + '">' + UI.esc(a.asset_name) + '</a>' + t +
            '<div class="text-muted" style="font-size:.72rem">' + UI.esc([a.brand, a.model].filter(Boolean).join(' · ') || '-') + '</div>';
        } },
        { key: 'category_name', label: 'Kategori' },
        { key: 'location_name', label: 'Lokasi', render: function (a) { return UI.esc(a.location_name || '<span class="text-warning">Tanpa lokasi</span>'); } },
        { key: 'unit_name', label: 'Unit' },
        { key: 'quantity', label: 'Jml', class: 'text-center', render: function (a) { return a.quantity > 1 ? '<strong>' + a.quantity + '</strong> ' + UI.esc(a.uom_name) : '1'; } },
        { key: 'condition_name', label: 'Kondisi', render: function (a) { return UI.badge(a.condition_name); } },
        { key: 'asset_status', label: 'Status', render: function (a) { return UI.badge(a.asset_status); } },
        { key: 'acquisition_cost', label: 'Nilai Perolehan', class: 'text-end', render: function (a) { return UI.rp(a.acquisition_cost); } },
        { key: 'acquisition_date', label: 'Tgl Perolehan', render: function (a) { return UI.fdate(a.acquisition_date); } }
      ],
      rows: [],
      pageSize: 12,
      actions: function (a) {
        var h = '<a href="asset-detail.html?id=' + a.id + '" class="btn btn-outline-secondary btn-sm amp-icon-btn" title="Detail"><i class="bi bi-eye"></i></a>';
        if (a.qr_token) {
          h += UI.iconBtn('Unduh QR', 'qr-code', 'data-act="qr" data-id="' + a.id + '"', 'btn-outline-dark') +
            UI.iconBtn('Kartu Inventaris', 'printer', 'data-act="card" data-id="' + a.id + '"', 'btn-outline-dark');
        }
        if (canManage) {
          h += UI.iconBtn('Ubah', 'pencil', 'data-act="edit" data-id="' + a.id + '"', 'btn-outline-primary');
          if (a.asset_status === 'Draft' || a.asset_status === 'Menunggu Verifikasi') {
            h += UI.iconBtn('Verifikasi & Aktifkan', 'check2-circle', 'data-act="verify" data-id="' + a.id + '"', 'btn-outline-success');
          }
          if (a.asset_status === 'Draft') {
            h += UI.iconBtn('Hapus', 'trash', 'data-act="del" data-id="' + a.id + '"', 'btn-outline-danger');
          }
        }
        return h;
      }
    });
    var host = document.getElementById('assetsTable');
    host.addEventListener('change', function (e) {
      var cb = e.target.closest('.amp-row-sel');
      if (!cb) return;
      if (cb.checked) selected.add(cb.dataset.id); else selected.delete(cb.dataset.id);
      updateSelBar();
    });
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = rows.find(function (x) { return x.id === b.dataset.id; });
      if (!a) return;
      if (b.dataset.act === 'qr') QRA.download(a);
      else if (b.dataset.act === 'card') QRA.printCard(a, (lookups.orgName || ''), a.specification);
      else if (b.dataset.act === 'edit') openForm(a);
      else if (b.dataset.act === 'verify') verifyAsset(a);
      else if (b.dataset.act === 'del') delAsset(a);
    });
    updateSelBar();
  }

  function updateSelBar() {
    var bar = document.getElementById('selBar');
    if (!bar) return;
    bar.style.display = selected.size ? '' : 'none';
    bar.querySelector('#selCount').textContent = selected.size + ' aset dipilih';
  }

  /* ---------------- VERIFIKASI ---------------- */
  function verifyAsset(a) {
    UI.confirmDialog({ title: 'Verifikasi aset ini?', html: 'Kode inventaris <strong>' + UI.esc(a.asset_code) + '</strong> akan diaktifkan dan QR Code dibuat.' })
      .then(function (ok) {
        if (!ok) return;
        var patch = { asset_status: 'Aktif' };
        if (!a.qr_token) patch.qr_token = DB.uuid();
        DB.update('assets', a.id, patch).then(function (r) {
          if (r.error) throw r.error;
          UI.toast('success', 'Aset terverifikasi & aktif — QR Code dibuat');
          load().then(function () { apply(); });
        }).catch(function (e) { UI.toast('error', e.message); });
      });
  }
  function delAsset(a) {
    UI.confirmDialog({ title: 'Hapus draft aset?', html: UI.esc(a.asset_name), danger: true, confirmText: 'Hapus' })
      .then(function (ok) {
        if (!ok) return;
        DB.remove('assets', a.id).then(function () { UI.toast('success', 'Draft dihapus'); load().then(apply); });
      });
  }

  /* ---------------- FORM TAMBAH/UBAH ---------------- */
  function nextAssetCode(categoryId, year) {
    var cat = lookups.cat[categoryId];
    var code = cat ? cat.category_code : 'AST';
    return DB.list('assets', { limit: 1500 }).then(function (r) {
      var max = 0;
      (r.data || []).forEach(function (a) {
        var c = String(a.asset_code || '');
        if (c.indexOf(code + '/' + year + '/') === 0) {
          var n = parseInt(c.split('/')[2], 10);
          if (!isNaN(n) && n > max) max = n;
        }
      });
      return code + '/' + year + '/' + String(max + 1).padStart(4, '0');
    });
  }

  function openForm(a) {
    var isEdit = !!a;
    var v = a || { asset_type: 'inventory', quantity: 1, asset_status: 'Menunggu Verifikasi', is_active: true };
    return Promise.all([
      DB.list('asset_categories', {}), DB.list('units', {}), DB.list('locations', {}),
      DB.list('asset_conditions', {}), DB.list('suppliers', {}), DB.list('funding_sources', {}),
      DB.list('profiles', {}), DB.list('units_of_measure', {}), DB.list('departments', {}), DB.list('divisions', {})
    ]).then(function (r) {
      var cats = r[0].data.filter(function (c) { return c.is_active !== false; });
      var units = r[1].data, locs = r[2].data, conds = r[3].data, sups = r[4].data,
        funds = r[5].data, profs = r[6].data, uoms = r[7].data, deps = r[8].data, divs = r[9].data;
      var fields = [
        { name: '_sec1', type: 'static-text', value: '<div class="amp-form-section-title">Identitas Barang</div>' },
        { name: 'asset_name', label: 'Nama Barang', required: true, value: v.asset_name },
        { name: 'category_id', label: 'Kategori', type: 'select', required: true, options: cats.map(function (c) { return { value: c.id, label: c.category_name + (c.is_fixed_asset ? ' (aset tetap)' : c.is_consumable ? ' (habis pakai)' : '') }; }), value: v.category_id },
        { name: 'brand', label: 'Merek', col: 'col-6 col-md-3', value: v.brand },
        { name: 'model', label: 'Tipe / Model', col: 'col-6 col-md-3', value: v.model },
        { name: 'serial_number', label: 'Nomor Seri', col: 'col-6 col-md-3', value: v.serial_number },
        { name: 'unit_of_measure_id', label: 'Satuan', type: 'select', col: 'col-6 col-md-3', options: uoms.map(function (u) { return { value: u.id, label: u.name }; }), value: v.unit_of_measure_id || (uoms[0] && uoms[0].id) },
        { name: 'quantity', label: 'Jumlah', type: 'number', min: 1, col: 'col-6 col-md-3', value: v.quantity, help: 'Lebih dari 1 = pelacakan kuantitas' },
        { name: 'specification', label: 'Spesifikasi', type: 'textarea', value: v.specification },
        { name: 'description', label: 'Deskripsi / Catatan', type: 'textarea', value: v.description },

        { name: '_sec2', type: 'static-text', value: '<div class="amp-form-section-title">Informasi Pengadaan</div>' },
        { name: 'acquisition_date', label: 'Tanggal Pembelian', type: 'date', col: 'col-6 col-md-3', value: v.acquisition_date || UI.todayISO() },
        { name: 'acquisition_cost', label: 'Total Harga Perolehan (Rp)', type: 'number', min: 0, col: 'col-6 col-md-3', required: true, value: v.acquisition_cost },
        { name: 'supplier_id', label: 'Pemasok', type: 'select', col: 'col-6 col-md-3', options: sups.map(function (s) { return { value: s.id, label: s.supplier_name }; }), value: v.supplier_id },
        { name: 'funding_source_id', label: 'Sumber Dana', type: 'select', col: 'col-6 col-md-3', options: funds.map(function (f) { return { value: f.id, label: f.name }; }), value: v.funding_source_id },
        { name: 'invoice_number', label: 'Nomor Invoice', col: 'col-6 col-md-4', value: v.invoice_number },
        { name: 'procurement_number', label: 'Nomor Dokumen Pengadaan', col: 'col-6 col-md-4', value: v.procurement_number },
        { name: 'acquisition_method', label: 'Metode Pengadaan', type: 'select', col: 'col-6 col-md-4', options: ['Pembelian Langsung', 'Tender', 'Penunjukan Langsung', 'Hibah', 'Wakaf'], value: v.acquisition_method || 'Pembelian Langsung' },

        { name: '_sec3', type: 'static-text', value: '<div class="amp-form-section-title">Kepemilikan & Penempatan</div>' },
        { name: 'unit_id', label: 'Unit Pemilik', type: 'select', required: true, col: 'col-6 col-md-4', options: units.map(function (u) { return { value: u.id, label: u.name }; }), value: v.unit_id },
        { name: 'department_id', label: 'Departemen', type: 'select', col: 'col-6 col-md-4', options: deps.map(function (d) { return { value: d.id, label: d.name }; }), value: v.department_id },
        { name: 'current_location_id', label: 'Lokasi / Ruangan', type: 'select', col: 'col-6 col-md-4', options: locs.filter(function (l) { return l.location_type !== 'gedung' || true; }).map(function (l) { return { value: l.id, label: l.location_name }; }), value: v.current_location_id },
        { name: 'responsible_user_id', label: 'Penanggung Jawab', type: 'select', col: 'col-6 col-md-6', options: profs.map(function (p) { return { value: p.id, label: p.full_name }; }), value: v.responsible_user_id || (profs[0] && profs[0].id) },
        { name: 'ownership_status', label: 'Status Kepemilikan', type: 'select', col: 'col-6 col-md-6', options: ['Dimiliki Sendiri', 'Sewa', 'Titipan / Amanah', 'Bantuan Pemerintah'], value: v.ownership_status || 'Dimiliki Sendiri' },

        { name: '_sec4', type: 'static-text', value: '<div class="amp-form-section-title">Kondisi & Status</div>' },
        { name: 'current_condition_id', label: 'Kondisi', type: 'select', required: true, col: 'col-6 col-md-4', options: conds.map(function (c) { return { value: c.id, label: c.condition_name }; }), value: v.current_condition_id || (conds.find(function (c) { return c.condition_code === 'BRU'; }) || conds[0]).id },
        { name: 'asset_status', label: 'Status Inventaris', type: 'select', col: 'col-6 col-md-4', options: ['Draft', 'Menunggu Verifikasi', 'Aktif'], value: v.asset_status },
        { name: 'condition_note', label: 'Catatan Kondisi', col: 'col-6 col-md-4', value: v.condition_note }
      ];
      UI.formModal({
        title: isEdit ? 'Ubah Aset — ' + (a.asset_code || 'draft') : 'Tambah Barang Baru',
        size: 'xl', submitText: isEdit ? 'Simpan Perubahan' : 'Simpan Aset',
        fields: fields,
        values: v,
        onSubmit: function (data) {
          if (!isEdit) {
            var dup = null;
            if (data.serial_number) {
              dup = rows.find(function (x) { return x.serial_number && x.serial_number.toLowerCase() === data.serial_number.toLowerCase(); });
              if (dup) { UI.toast('error', 'Nomor seri sudah terdaftar pada aset: ' + dup.asset_code); return false; }
            }
            var catObj = lookups.cat[data.category_id] || cats.find(function (c) { return c.id === data.category_id; });
            data.asset_type = catObj && catObj.is_fixed_asset ? 'fixed' : catObj && catObj.is_consumable ? 'consumable' : 'inventory';
            data.is_active = true;
            data.qr_token = data.asset_status !== 'Draft' ? DB.uuid() : null; // QR otomatis saat mendapat kode
            return DB.insert('assets', data).then(function (ins) {
              var rec = ins.data;
              var chain = [];
              if (data.asset_status !== 'Draft') {
                var year = (data.acquisition_date || UI.todayISO()).slice(0, 4);
                chain.push(nextAssetCode(data.category_id, year).then(function (code) {
                  return DB.update('assets', rec.id, { asset_code: code }).then(function () {
                    rec.asset_code = code;
                    return DB.insert('asset_condition_histories', {
                      asset_id: rec.id, old_condition_id: null, new_condition_id: data.current_condition_id,
                      inspection_date: UI.todayISO(), notes: 'Pencatatan awal', inspected_by: Auth.userId()
                    });
                  });
                }));
                chain.push(ensureDepreciation(rec, cats.find(function (c) { return c.id === data.category_id; })));
              }
              return Promise.all(chain).then(function () {
                UI.toast('success', 'Aset tersimpan' + (rec.asset_code ? ' dengan kode ' + rec.asset_code : ' sebagai draft'));
                load().then(apply);
              });
            });
          }
          return DB.update('assets', a.id, data).then(function (r) {
            if (r.error) throw r.error;
            if (a.current_condition_id !== data.current_condition_id) {
              DB.insert('asset_condition_histories', {
                asset_id: a.id, old_condition_id: a.current_condition_id, new_condition_id: data.current_condition_id,
                inspection_date: UI.todayISO(), notes: 'Perubahan manual melalui form ubah aset', inspected_by: Auth.userId()
              });
            }
            UI.toast('success', 'Perubahan tersimpan');
            load().then(apply);
          });
        }
      });
    });
  }

  /* Penyusutan otomatis untuk aset tetap */
  function ensureDepreciation(assetRec, catObj) {
    if (!catObj || (!catObj.is_fixed_asset)) return Promise.resolve();
    return DB.list('asset_depreciations', { eq: { asset_id: assetRec.id } }).then(function (ex) {
      if ((ex.data || []).length) return null;
      return DB.list('depreciation_settings', {}).then(function (sr) {
        var settings = sr.data || [];
        var s = settings.find(function (x) { return x.category_id === catObj.id; }) ||
          settings.find(function (x) { return !x.category_id; });
        if (!s || s.depreciation_method === 'none') return null;
        var cost = assetRec.acquisition_cost || 0;
        var residualPct = (s.default_residual_percentage || 0) / 100;
        var residual = Math.round(cost * residualPct);
        var life = s.default_useful_life_months || 48;
        var depreciable = cost - residual;
        var monthly = s.depreciation_method === 'straight_line' ? Math.round(depreciable / life) : 0;
        return DB.insert('asset_depreciations', {
          organization_id: assetRec.organization_id, asset_id: assetRec.id,
          acquisition_cost: cost, residual_value: residual, depreciable_amount: depreciable,
          useful_life_months: life, depreciation_method: s.depreciation_method,
          depreciation_start_date: assetRec.acquisition_date || UI.todayISO(),
          monthly_depreciation: monthly, annual_depreciation: monthly * 12,
          accumulated_depreciation: 0, current_book_value: cost, depreciation_status: 'Aktif'
        });
      });
    });
  }

  /* ---------------- HEADER & BATCH ---------------- */
  function renderHead() {
    return DB.list('organizations', { limit: 1 }).then(function (r) {
      lookups.orgName = (r.data[0] || {}).name || '';
      document.getElementById('assetsHead').innerHTML = UI.pageHeader('Data Inventaris & Aset',
        'Pusat data seluruh barang organisasi — individual, aset tetap, dan habis pakai',
        (canManage ? '<button class="btn btn-primary btn-sm" id="addAssetBtn"><i class="bi bi-plus-lg me-1"></i>Tambah Barang</button>' : '') +
        '<button class="btn btn-outline-secondary btn-sm" id="expBtn"><i class="bi bi-file-earmark-excel me-1"></i>Ekspor Excel</button>' +
        '<button class="btn btn-outline-dark btn-sm" id="labelBtn"><i class="bi bi-qr-code me-1"></i>Cetak Label QR Terpilih</button>') +
        '<div class="amp-head-meta"></div>';
      var add = document.getElementById('addAssetBtn');
      if (add) add.addEventListener('click', function () { openForm(null); });
      document.getElementById('expBtn').addEventListener('click', function () {
        UI.exportExcel('inventaris-aset.xlsx', visibleRows().map(function (a) {
          return { Kode: a.asset_code, Nama: a.asset_name, Kategori: a.category_name, Merek: a.brand, Model: a.model,
            'Nomor Seri': a.serial_number, Lokasi: a.location_name || '', Unit: a.unit_name, Kondisi: a.condition_name,
            Status: a.asset_status, Jumlah: a.quantity, 'Nilai Perolehan': a.acquisition_cost, 'Tgl Perolehan': a.acquisition_date,
            PenanggungJawab: a.responsible_name, Pemasok: a.supplier_name || '', 'Sumber Dana': a.funding_name || '' };
        }));
      });
      document.getElementById('labelBtn').addEventListener('click', function () {
        var picked = rows.filter(function (a) { return selected.has(a.id) && a.qr_token; });
        if (!picked.length) { UI.toast('warning', 'Pilih aset yang sudah memiliki QR Code'); return; }
        QRA.printLabels(picked, lookups.orgName);
      });
    });
  }
  function visibleRows() {
    var q = filters.q.toLowerCase();
    return rows.filter(function (a) {
      if (filters.category && a.category_id !== filters.category) return false;
      if (filters.unit && a.unit_id !== filters.unit) return false;
      if (filters.location && a.current_location_id !== filters.location) return false;
      if (filters.condition && a.current_condition_id !== filters.condition) return false;
      if (filters.status && a.asset_status !== filters.status) return false;
      if (q && !(a.asset_code + ' ' + a.asset_name + ' ' + (a.brand || '') + ' ' + (a.serial_number || '')).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  load().then(function () {
    renderHead();
    renderFilters();
    renderTable();
    apply();
  });
};
