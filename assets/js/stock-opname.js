/* =====================================================================
 * ASSET MANAGEMENT PRO — stock-opname.js
 * Stock opname: kegiatan pemeriksaan fisik, hasil, selisih, penyesuaian.
 * Perubahan data master hanya terjadi setelah penyesuaian disetujui.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();
  var canProcess = Auth.can('process.opname') || Auth.isPengelola() || Auth.isAdmin();

  function loadAll() {
    return Promise.all([
      DB.list('stock_opnames', { order: 'created_at', asc: false }),
      DB.list('stock_opname_items', {}),
      DB.list('stock_opname_adjustments', {}),
      DB.list('assets', {}), DB.list('locations', {}), DB.list('units', {}),
      DB.list('profiles', {}), DB.list('asset_conditions', {})
    ]).then(function (r) {
      return {
        ops: r[0].data, items: r[1].data, adjustments: r[2].data,
        assets: r[3].data, locs: UI.mapBy(r[4].data, 'id'), units: UI.mapBy(r[5].data, 'id'),
        profs: UI.mapBy(r[6].data, 'id'), conds: r[7].data
      };
    });
  }

  function render(d) {
    var rows = d.ops.map(function (o) {
      var items = d.items.filter(function (x) { return x.opname_id === o.id; });
      var checked = items.filter(function (x) { return x.result_status; }).length;
      var diffs = items.filter(function (x) { return x.result_status && x.result_status !== 'Sesuai data'; }).length;
      return Object.assign({}, o, {
        location_name: o.location_id ? ((d.locs[o.location_id] || {}).location_name || '-') : 'Semua Lokasi',
        unit_name: o.unit_id ? ((d.units[o.unit_id] || {}).name || '-') : 'Semua Unit',
        nItems: items.length, nChecked: checked, nDiff: diffs
      });
    });
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Stock Opname & Audit Fisik',
      'Pemeriksaan keberadaan fisik aset melalui pemindaian QR atau pencarian kode',
      (canProcess ? '<button class="btn btn-primary btn-sm" id="addSo"><i class="bi bi-plus-lg me-1"></i>Kegiatan Baru</button>' : '') +
      '<button class="btn btn-outline-secondary btn-sm" id="expSo"><i class="bi bi-file-earmark-excel me-1"></i>Excel Hasil</button>');

    UI.dataTable({
      mount: '#opnameTable',
      columns: [
        { key: 'opname_number', label: 'No. Kegiatan' },
        { key: 'opname_name', label: 'Nama Kegiatan' },
        { key: 'location_name', label: 'Lokasi' },
        { key: 'period_start', label: 'Periode', render: function (o) { return UI.fdate(o.period_start) + ' s.d. ' + UI.fdate(o.period_end); } },
        { key: 'nChecked', label: 'Diperiksa', class: 'text-center', render: function (o) { return o.nChecked + '/' + o.nItems; } },
        { key: 'nDiff', label: 'Selisih', class: 'text-center', render: function (o) { return o.nDiff ? '<span class="text-danger fw-bold">' + o.nDiff + '</span>' : '0'; } },
        { key: 'status', label: 'Status', render: function (o) { return UI.badge(o.status); } }
      ],
      rows: rows, pageSize: 10,
      actions: function (o) {
        var h = UI.iconBtn('Buka Kegiatan', 'clipboard-check', 'data-act="open" data-id="' + o.id + '"', 'btn-outline-primary');
        if (canProcess && o.status !== 'Selesai') {
          h += UI.iconBtn('Selesaikan', 'flag', 'data-act="finish" data-id="' + o.id + '"', 'btn-outline-success');
        }
        return h;
      }
    });
    document.getElementById('expSo').onclick = function () {
      UI.exportExcel('hasil-stock-opname.xlsx', d.items.map(function (x) {
        var a = d.assets.find(function (y) { return y.id === x.asset_id; }) || {};
        return { Kegiatan: (d.ops.find(function (o) { return o.id === x.opname_id; }) || {}).opname_number || '',
          Kode: x.asset_code_snapshot, Nama: x.asset_name_snapshot,
          'Lokasi Harus': (d.locs[x.expected_location_id] || {}).location_name || '-',
          'Lokasi Aktual': (d.locs[x.actual_location_id] || {}).location_name || '-',
          'Kondisi Aktual': (d.conds.find(function (c) { return c.id === x.actual_condition_id; }) || {}).condition_name || '-',
          'Jml Harus': x.expected_quantity, 'Jml Aktual': x.actual_quantity,
          Hasil: x.result_status || 'Belum diperiksa', Petugas: (d.profs[x.inspected_by] || {}).full_name || '-' };
      }));
    };
    document.getElementById('opnameTable').onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var o = d.ops.find(function (x) { return x.id === b.dataset.id; });
      if (b.dataset.act === 'open') openSession(d, o);
      else if (b.dataset.act === 'finish') finish(d, o);
    };
    var add = document.getElementById('addSo');
    if (add) add.onclick = function () { openForm(d); };
  }

  /* ---------------- FORM KEGIATAN ---------------- */
  function openForm(d) {
    UI.formModal({
      title: 'Kegiatan Stock Opname Baru', size: 'lg', submitText: 'Buat & Muat Aset',
      fields: [
        { name: 'opname_name', label: 'Nama Kegiatan', required: true, placeholder: 'cth: Stock Opname Gedung A Desember 2026' },
        { name: 'period_start', label: 'Mulai', type: 'date', required: true, col: 'col-6', value: UI.todayISO() },
        { name: 'period_end', label: 'Selesai', type: 'date', required: true, col: 'col-6', value: UI.todayISO() },
        { name: 'location_id', label: 'Lokasi Cakupan', type: 'select', options: Object.values(d.locs).map(function (l) { return { value: l.id, label: l.location_name }; }), help: 'Kosongkan = semua lokasi' },
        { name: 'unit_id', label: 'Unit Cakupan', type: 'select', options: Object.values(d.units).map(function (u) { return { value: u.id, label: u.name }; }) }
      ],
      onSubmit: function (data) {
        return DB.nextNumber('SO', 'stock_opnames', 'opname_number').then(function (num) {
          return DB.insert('stock_opnames', {
            organization_id: org, opname_number: num, opname_name: data.opname_name,
            period_start: data.period_start, period_end: data.period_end,
            unit_id: data.unit_id || null, location_id: data.location_id || null,
            status: 'Berlangsung', created_by: Auth.userId()
          }).then(function (ins) {
            var so = ins.data;
            var candidates = d.assets.filter(function (a) {
              if (!a.is_active || a.asset_status === 'Dihapuskan' || a.asset_status === 'Draft') return false;
              if (so.location_id && a.current_location_id !== so.location_id) return false;
              if (so.unit_id && a.unit_id !== so.unit_id) return false;
              return true;
            });
            return DB.insertMany('stock_opname_items', candidates.map(function (a) {
              return { opname_id: so.id, asset_id: a.id, asset_code_snapshot: a.asset_code,
                asset_name_snapshot: a.asset_name, expected_location_id: a.current_location_id,
                actual_location_id: null, expected_condition_id: a.current_condition_id,
                actual_condition_id: null, expected_quantity: a.quantity, actual_quantity: null,
                result_status: null, notes: null, inspected_by: null, inspected_at: null };
            })).then(function () { return so; });
          });
        }).then(function (so) {
          UI.toast('success', 'Kegiatan ' + so.opname_number + ' dibuat — ' + so.opname_name);
          reload();
        });
      }
    });
  }

  function finish(d, o) {
    var items = d.items.filter(function (x) { return x.opname_id === o.id; });
    var unchecked = items.filter(function (x) { return !x.result_status; }).length;
    UI.confirmDialog({
      title: 'Selesaikan kegiatan opname?',
      html: unchecked ? '<strong>' + unchecked + ' item belum diperiksa</strong> dan akan dianggap tidak ditemukan saat penyesuaian dibuat.' : 'Seluruh item telah diperiksa.'
    }).then(function (ok) {
      if (!ok) return;
      DB.update('stock_opnames', o.id, { status: 'Selesai' }).then(function () {
        UI.toast('success', 'Kegiatan selesai — buat penyesuaian untuk tindak lanjut selisih');
        reload();
      });
    });
  }

  /* ---------------- SESI PEMERIKSAAN ---------------- */
  function openSession(d, o) {
    var items = d.items.filter(function (x) { return x.opname_id === o.id; });
    var assetMap = UI.mapBy(d.assets, 'id');
    var html = '<div class="row g-2 mb-3"><div class="col-lg-7">' +
      '<div id="soReader"></div>' +
      '<div class="d-flex gap-2 mt-2">' +
      '<button class="btn btn-outline-secondary btn-sm" id="soCam"><i class="bi bi-camera-video me-1"></i>Kamera</button>' +
      '<input class="form-control form-control-sm" id="soManual" placeholder="Kode inventaris / token QR">' +
      '<button class="btn btn-primary btn-sm" id="soCheck"><i class="bi bi-search"></i></button></div>' +
      '<div class="text-muted small mt-1">Pindai QR aset atau ketik kode inventaris untuk mencatat hasil pemeriksaan.</div></div>' +
      '<div class="col-lg-5"><div class="card amp-card"><div class="card-body py-2">' +
      '<div class="d-flex justify-content-between small"><span>Diperiksa</span><strong id="soStatC">' + items.filter(function (x) { return x.result_status; }).length + '/' + items.length + '</strong></div>' +
      '<div class="d-flex justify-content-between small"><span>Selisih</span><strong class="text-danger" id="soStatD">' + items.filter(function (x) { return x.result_status && x.result_status !== 'Sesuai data'; }).length + '</strong></div>' +
      '<div class="d-flex justify-content-between small"><span>Status kegiatan</span><strong>' + o.status + '</strong></div>' +
      '<hr class="my-2"><button class="btn btn-outline-primary btn-sm w-100" id="soAdjBtn"><i class="bi bi-magic me-1"></i>Buat Penyesuaian Selisih</button>' +
      '<div id="soAdjList" class="mt-2"></div></div></div></div></div>' +
      '<div id="soItemTbl"></div>';

    var m = UI.modal({
      title: o.opname_number + ' — ' + o.opname_name, size: 'xl', body: html,
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>',
      onShown: function () {
        drawItems();
        document.getElementById('soCheck').onclick = function () { checkManual(document.getElementById('soManual').value); };
        document.getElementById('soManual').addEventListener('keydown', function (e) { if (e.key === 'Enter') checkManual(e.target.value); });
        document.getElementById('soCam').onclick = startCam;
        document.getElementById('soAdjBtn').onclick = function () { createAdjustments(d, o); };
        drawAdjustments();
      }
    });

    var scanner = null;
    function startCam() {
      if (typeof Html5Qrcode === 'undefined') { UI.toast('error', 'Library scanner belum termuat'); return; }
      if (scanner) return;
      scanner = new Html5Qrcode('soReader');
      scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, function (txt) {
        checkToken(String(txt).trim());
      }, function () {}).catch(function (err) {
        UI.toast('error', 'Kamera tidak dapat diakses: ' + (err && err.message ? err.message : 'izin ditolak'));
        scanner = null;
      });
    }
    function stopCam() { if (scanner) { try { scanner.stop(); } catch (e) {} scanner = null; } }
    document.querySelector('.modal.show') && document.querySelector('.modal.show').addEventListener('hidden.bs.modal', stopCam);

    function findAssetByToken(token) {
      return d.assets.find(function (a) { return a.qr_token === token || a.asset_code === token || a.id === token; });
    }
    function checkToken(token) {
      var a = findAssetByToken(token);
      if (!a) { UI.toast('warning', 'QR/kode tidak dikenali: ' + token.slice(0, 24)); return; }
      var item = items.find(function (x) { return x.asset_id === a.id; });
      if (!item) { UI.toast('warning', a.asset_name + ' tidak termasuk cakupan kegiatan ini'); return; }
      openCheckForm(d, o, item, a, function () { drawItems(); drawAdjustments(); });
    }
    function checkManual(code) {
      if (!code) return;
      checkToken(code.trim());
      document.getElementById('soManual').value = '';
    }
    function drawItems() {
      items = d.items.filter(function (x) { return x.opname_id === o.id; });
      var checked = items.filter(function (x) { return x.result_status; }).length;
      var diffs = items.filter(function (x) { return x.result_status && x.result_status !== 'Sesuai data'; }).length;
      document.getElementById('soStatC').textContent = checked + '/' + items.length;
      document.getElementById('soStatD').textContent = diffs;
      UI.dataTable({
        mount: '#soItemTbl', toolbar: false, pageSize: 10,
        columns: [
          { key: 'asset_code_snapshot', label: 'Kode' },
          { key: 'asset_name_snapshot', label: 'Nama Barang' },
          { key: 'expected_location_id', label: 'Lokasi Harus', render: function (x) { return UI.esc((d.locs[x.expected_location_id] || {}).location_name || '-'); } },
          { key: 'result_status', label: 'Hasil', render: function (x) { return x.result_status ? UI.badge(x.result_status === 'Sesuai data' ? 'Baik' : x.result_status === 'Barang tidak ditemukan' ? 'Hilang' : 'Menunggu Verifikasi') + ' <span class="small">' + UI.esc(x.result_status) + '</span>' : '<span class="badge text-bg-light border">Belum diperiksa</span>'; } },
          { key: 'inspected_at', label: 'Diperiksa', render: function (x) { return x.inspected_at ? UI.fdatetime(x.inspected_at) : '-'; } }
        ],
        rows: items,
        actions: function (x) {
          if (o.status === 'Selesai') return '';
          var a = assetMap[x.asset_id];
          return UI.iconBtn(x.result_status ? 'Periksa Ulang' : 'Periksa', 'search', 'data-ck="' + x.id + '"', 'btn-outline-primary');
        }
      });
      document.getElementById('soItemTbl').onclick = function (e) {
        var b = e.target.closest('[data-ck]'); if (!b) return;
        var item = items.find(function (x) { return x.id === b.dataset.ck; });
        openCheckForm(d, o, item, assetMap[item.asset_id], function () { drawItems(); drawAdjustments(); });
      };
    }
    function drawAdjustments() {
      var adj = d.adjustments.filter(function (a) {
        var it = d.items.find(function (x) { return x.id === a.opname_item_id; });
        return it && it.opname_id === o.id;
      });
      document.getElementById('soAdjList').innerHTML = adj.length ? adj.map(function (a) {
        return '<div class="small border-bottom pb-1 mb-1"><i class="bi bi-magic me-1 text-info"></i>' + UI.esc(a.adjustment_type) +
          ' — <span class="badge text-bg-' + (a.approval_status === 'Approved' ? 'success' : 'warning') + '">' + a.approval_status + '</span></div>';
      }).join('') : '<div class="text-muted small">Belum ada penyesuaian</div>';
    }
  }

  function openCheckForm(d, o, item, a, onDone) {
    if (!a) return;
    var RESULT = ['Sesuai data', 'Barang ditemukan di lokasi berbeda', 'Kondisi berubah', 'Barang tidak ditemukan',
      'Barang belum terdaftar', 'Jumlah tidak sesuai', 'QR Code rusak', 'Data tidak sesuai'];
    UI.formModal({
      title: 'Pemeriksaan — ' + a.asset_code, submitText: 'Simpan Hasil',
      fields: [
        { name: 'res', label: 'Hasil Pemeriksaan', type: 'select', required: true, options: RESULT, value: item.result_status || 'Sesuai data' },
        { name: 'actual_location_id', label: 'Lokasi Aktual Ditemukan', type: 'select', options: Object.values(d.locs).map(function (l) { return { value: l.id, label: l.location_name }; }), value: item.actual_location_id || item.expected_location_id },
        { name: 'actual_condition_id', label: 'Kondisi Aktual', type: 'select', options: d.conds.map(function (c) { return { value: c.id, label: c.condition_name }; }), value: item.actual_condition_id || item.expected_condition_id },
        { name: 'actual_quantity', label: 'Jumlah Fisik', type: 'number', min: 0, value: item.actual_quantity !== null && item.actual_quantity !== undefined ? item.actual_quantity : item.expected_quantity },
        { name: 'notes', label: 'Catatan', type: 'textarea', value: item.notes }
      ],
      onSubmit: function (data) {
        var locDiff = data.actual_location_id !== item.expected_location_id;
        var condDiff = data.actual_condition_id !== item.expected_condition_id;
        var qtyDiff = data.actual_quantity !== item.expected_quantity;
        var res = data.res;
        if (res === 'Sesuai data') {
          if (locDiff) res = 'Barang ditemukan di lokasi berbeda';
          else if (condDiff) res = 'Kondisi berubah';
          else if (qtyDiff) res = 'Jumlah tidak sesuai';
        }
        if (res === 'Barang tidak ditemukan') { data.actual_quantity = 0; }
        return DB.update('stock_opname_items', item.id, {
          actual_location_id: data.actual_location_id, actual_condition_id: data.actual_condition_id,
          actual_quantity: data.actual_quantity, result_status: res, notes: data.notes,
          inspected_by: Auth.userId(), inspected_at: new Date().toISOString()
        }).then(function () {
          DB.insert('asset_qr_logs', { asset_id: a.id, scanned_by: Auth.userId(), scanned_at: new Date().toISOString(), scan_action: 'opname_check', device_info: navigator.userAgent.slice(0, 80) });
          UI.toast('success', 'Hasil pemeriksaan tersimpan: ' + res);
          onDone && onDone();
        });
      }
    });
  }

  /* ---------------- PENYESUAIAN ---------------- */
  function createAdjustments(d, o) {
    var diffs = d.items.filter(function (x) { return x.opname_id === o.id && x.result_status && x.result_status !== 'Sesuai data'; });
    var existing = d.adjustments.filter(function (a) { return diffs.some(function (x) { return x.id === a.opname_item_id; }); });
    var pending = diffs.filter(function (x) { return !existing.some(function (a) { return a.opname_item_id === x.id; }); });
    if (!pending.length) { UI.toast('warning', existing.length ? 'Selisih sudah masuk daftar penyesuaian' : 'Tidak ada selisih'); return; }
    var body = '<div class="small text-muted mb-2">' + pending.length + ' selisih akan diusulkan sebagai penyesuaian (perlu persetujuan sebelum data master diubah):</div>' +
      pending.map(function (x, i) {
        return '<div class="border rounded p-2 mb-2"><div class="fw-semibold small">' + UI.esc(x.asset_code_snapshot + ' — ' + x.asset_name_snapshot) +
          ' <span class="badge text-bg-warning">' + UI.esc(x.result_status) + '</span></div>' +
          '<div class="row g-1 mt-1"><div class="col-md-6"><label class="form-label small">Jenis Penyesuaian</label>' +
          '<select class="form-select form-select-sm adj-type" data-i="' + i + '"><option>Mutasi Lokasi</option><option>Koreksi Kondisi</option><option>Selisih Jumlah</option><option>Laporan Kehilangan</option></select></div>' +
          '<div class="col-md-6"><label class="form-label small">Alasan</label><input class="form-control form-control-sm adj-reason" data-i="' + i + '" value="Tindak lanjut ' + o.opname_number + '"></div></div></div>';
      }).join('');
    UI.modal({
      title: 'Buat Penyesuaian — ' + o.opname_number, size: 'lg', body: body,
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>' +
        '<button class="btn btn-primary" id="adjSave"><i class="bi bi-check-lg me-1"></i>Usulkan Penyesuaian</button>',
      onShown: function () {
        document.getElementById('adjSave').onclick = function () {
          var chains = pending.map(function (x, i) {
            return DB.insert('stock_opname_adjustments', {
              opname_item_id: x.id,
              adjustment_type: document.querySelector('.adj-type[data-i="' + i + '"]').value,
              adjustment_reason: document.querySelector('.adj-reason[data-i="' + i + '"]').value,
              approval_status: 'Menunggu'
            });
          });
          Promise.all(chains).then(function () {
            UI.toast('success', pending.length + ' penyesuaian diusulkan — menunggu persetujuan');
            reload();
          });
        };
      }
    });
  }

  /* ---------------- PERSMUJUAN PENYESUAIAN (manajer/admin) ---------------- */
  function approveAdjustments(d) {
    var pending = d.adjustments.filter(function (a) { return a.approval_status === 'Menunggu'; });
    var itemMap = UI.mapBy(d.items, 'id');
    if (!pending.length) return;
    var body = pending.map(function (a, i) {
      var it = itemMap[a.opname_item_id] || {};
      return '<div class="border rounded p-2 mb-2"><div class="small fw-semibold">' + UI.esc(it.asset_code_snapshot + ' — ' + it.asset_name_snapshot) + '</div>' +
        '<div class="small text-muted">' + UI.esc(a.adjustment_type) + ' · ' + UI.esc(a.adjustment_reason) + '</div>' +
        '<div class="d-flex gap-2 mt-1"><button class="btn btn-outline-success btn-sm adj-ok" data-i="' + i + '">Setujui & Terapkan</button>' +
        '<button class="btn btn-outline-danger btn-sm adj-no" data-i="' + i + '">Tolak</button></div></div>';
    }).join('');
    UI.modal({
      title: 'Persetujuan Penyesuaian Opname', size: 'lg', body: '<div class="small text-muted mb-2">Menyetujui penyesuaian akan mengubah data master aset (lokasi/kondisi/status) melalui catatan riwayat.</div>' + body,
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>',
      onShown: function () {
        document.querySelectorAll('.adj-ok').forEach(function (b) {
          b.onclick = function () {
            var a = pending[Number(b.dataset.i)];
            applyAdjustment(d, a, true).then(function () { UI.toast('success', 'Penyesuaian diterapkan'); reload(); m.close(); });
          };
        });
        document.querySelectorAll('.adj-no').forEach(function (b) {
          b.onclick = function () {
            var a = pending[Number(b.dataset.i)];
            DB.update('stock_opname_adjustments', a.id, { approval_status: 'Ditolak', approved_by: Auth.userId(), approved_at: new Date().toISOString() })
              .then(function () { UI.toast('success', 'Penyesuaian ditolak'); reload(); m.close(); });
          };
        });
      }
    });
  }

  function applyAdjustment(d, a) {
    var it = d.items.find(function (x) { return x.id === a.opname_item_id; });
    if (!it || !it.asset_id) return Promise.resolve();
    var upd = {}, histNote = 'Penyesuaian opname: ' + a.adjustment_type;
    if (a.adjustment_type === 'Mutasi Lokasi' && it.actual_location_id) {
      upd.current_location_id = it.actual_location_id;
      DB.insert('asset_location_histories', {
        asset_id: it.asset_id, old_location_id: it.expected_location_id, new_location_id: it.actual_location_id,
        old_unit_id: null, new_unit_id: null, movement_date: UI.todayISO(), notes: histNote, approved_by: Auth.userId()
      });
    } else if (a.adjustment_type === 'Koreksi Kondisi' && it.actual_condition_id) {
      upd.current_condition_id = it.actual_condition_id;
      DB.insert('asset_condition_histories', {
        asset_id: it.asset_id, old_condition_id: it.expected_condition_id, new_condition_id: it.actual_condition_id,
        inspection_date: UI.todayISO(), notes: histNote, inspected_by: Auth.userId()
      });
    } else if (a.adjustment_type === 'Laporan Kehilangan') {
      upd.asset_status = 'Hilang';
      upd.current_condition_id = 'cond-hilang';
    } else if (a.adjustment_type === 'Selisih Jumlah' && it.actual_quantity !== null) {
      upd.quantity = it.actual_quantity;
    }
    return DB.update('stock_opname_adjustments', a.id, { approval_status: 'Approved', approved_by: Auth.userId(), approved_at: new Date().toISOString() })
      .then(function () { if (Object.keys(upd).length) return DB.update('assets', it.asset_id, upd); });
  }

  function reload() { loadAll().then(render); }
  loadAll().then(function (d) {
    render(d);
    // Panel persetujuan penyesuaian (jika ada yang menunggu & berhak)
    if ((Auth.can('approve.loan') || Auth.isAdmin() || Auth.roles().indexOf('manajer') >= 0) &&
        d.adjustments.some(function (a) { return a.approval_status === 'Menunggu'; })) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-warning btn-sm ms-2';
      btn.innerHTML = '<i class="bi bi-magic me-1"></i>Persetujuan Penyesuaian';
      document.querySelector('#pageHead .amp-page-head > div:last-child').appendChild(btn);
      btn.onclick = function () { approveAdjustments(d); };
    }
  });
};
