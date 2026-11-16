/* =====================================================================
 * ASSET MANAGEMENT PRO — qr-scanner.js
 * Pindai QR (kamera HP/webcam) atau pencarian manual + aksi cepat.
 * QR berisi token referensi; data aset diambil setelah autentikasi.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var scanner = null;
  var conds = [], assets = [];

  function load() {
    return Promise.all([DB.list('assets', {}), DB.list('asset_conditions', {}), DB.list('profiles', {}), DB.list('locations', {})])
      .then(function (r) {
        assets = r[0].data;
        conds = r[1].data;
        var profs = UI.mapBy(r[2].data, 'id'), locs = UI.mapBy(r[3].data, 'id');
        assets.forEach(function (a) {
          a.responsible_name = (profs[a.responsible_user_id] || {}).full_name || '-';
          a.location_name = a.current_location_id ? ((locs[a.current_location_id] || {}).location_name || '-') : '-';
        });
        drawScanLog();
      });
  }

  function drawScanLog() {
    DB.list('asset_qr_logs', { order: 'scanned_at', asc: false, limit: 100 }).then(function (r) {
      var profs = null;
      DB.list('profiles', {}).then(function (pr) {
        profs = UI.mapBy(pr.data, 'id');
        UI.dataTable({
          mount: '#scanTable', pageSize: 8,
          columns: [
            { key: 'scanned_at', label: 'Waktu', render: function (s) { return UI.fdatetime(s.scanned_at); } },
            { key: 'asset_id', label: 'Aset', render: function (s) { var a = assets.find(function (x) { return x.id === s.asset_id; }); return UI.esc(a ? a.asset_code + ' — ' + a.asset_name : s.asset_id); } },
            { key: 'scanned_by', label: 'Pemindai', render: function (s) { return UI.esc((profs[s.scanned_by] || {}).full_name || '-'); } },
            { key: 'scan_action', label: 'Aksi', render: function (s) { return UI.esc(s.scan_action); } },
            { key: 'device_info', label: 'Perangkat', render: function (s) { return '<span class="small text-muted">' + UI.esc(s.device_info || '-') + '</span>'; } }
          ], rows: r.data
        });
      });
    });
  }

  function findAsset(token) {
    return assets.find(function (a) { return a.qr_token === token; }) ||
      assets.find(function (a) { return a.asset_code === token; }) ||
      assets.find(function (a) { return a.id === token; });
  }

  function logScan(a, action) {
    DB.insert('asset_qr_logs', {
      asset_id: a.id, scanned_by: Auth.userId(), scanned_at: new Date().toISOString(),
      scan_action: action, device_info: navigator.userAgent.slice(0, 90)
    }).then(function () { drawScanLog(); });
  }

  function showResult(a) {
    var el = document.getElementById('scanResult');
    var canManage = Auth.isPengelola() || Auth.isAdmin();
    el.innerHTML = '<div class="card amp-card" id="resCard">' +
      '<div class="card-header bg-transparent d-flex justify-content-between align-items-center py-2">' +
      '<h6 class="mb-0 fw-bold"><i class="bi bi-qr-code me-1 text-primary"></i>Hasil Pemindaian</h6>' +
      UI.badge(a.asset_status) + '</div><div class="card-body">' +
      '<div class="d-flex gap-3 mb-2"><div class="amp-qr-box"><div id="resQr"></div></div>' +
      '<div><h5 class="fw-bold mb-1">' + UI.esc(a.asset_name) + '</h5>' +
      '<div class="amp-asset-code mb-1">' + UI.esc(a.asset_code) + '</div>' +
      '<div class="small">' + UI.badge(a.current_condition_id === 'cond-baik' ? 'Baik' : a.current_condition_id === 'cond-rb' ? 'Rusak Berat' : a.current_condition_id === 'cond-rr' ? 'Rusak Ringan' : 'Cukup Baik') + '</div></div></div>' +
      '<div class="row amp-detail-grid">' +
      UI.kv('Kategori', UI.esc(a.category_id || '-')) +
      UI.kv('Merek / Tipe', UI.esc([a.brand, a.model].filter(Boolean).join(' · ') || '-')) +
      UI.kv('Nomor Seri', UI.esc(a.serial_number || '-')) +
      UI.kv('Lokasi', UI.esc(a.location_name)) +
      UI.kv('Unit', UI.esc(a.unit_id || '-')) +
      UI.kv('Penanggung Jawab', UI.esc(a.responsible_name)) +
      UI.kv('Tgl Perolehan', UI.fdate(a.acquisition_date)) +
      UI.kv('Nilai Perolehan', Auth.can('view.cost') || Auth.isPengelola() || Auth.isAdmin() ? UI.rp(a.acquisition_cost) : '<em class="text-muted">terbatas</em>') +
      '</div>' +
      '<div class="d-flex flex-wrap gap-2 mt-3">' +
      '<a class="btn btn-primary btn-sm" href="asset-detail.html?id=' + a.id + '"><i class="bi bi-eye me-1"></i>Detail Aset</a>' +
      (canManage ? '<button class="btn btn-outline-primary btn-sm" data-qract="cond"><i class="bi bi-clipboard-pulse me-1"></i>Perbarui Kondisi</button>' : '') +
      '<button class="btn btn-outline-warning btn-sm" data-qract="maint"><i class="bi bi-wrench me-1"></i>Laporkan Kerusakan</button>' +
      (a.asset_status === 'Aktif' ? '<a class="btn btn-outline-info btn-sm" href="loans.html?asset=' + a.id + '"><i class="bi bi-arrow-left-right me-1"></i>Ajukan Peminjaman</a>' : '') +
      '</div></div></div>';
    QRA.render(document.getElementById('resQr'), a.qr_token || a.id, 110);
    el.querySelectorAll('[data-qract]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.qract === 'cond') {
          UI.formModal({
            title: 'Perbarui Kondisi — ' + a.asset_code, submitText: 'Simpan',
            fields: [
              { name: 'new_condition_id', label: 'Kondisi Baru', type: 'select', required: true, options: conds.map(function (c) { return { value: c.id, label: c.condition_name }; }) },
              { name: 'notes', label: 'Catatan', type: 'textarea' }
            ],
            onSubmit: function (data) {
              return DB.insert('asset_condition_histories', {
                asset_id: a.id, old_condition_id: a.current_condition_id, new_condition_id: data.new_condition_id,
                inspection_date: UI.todayISO(), notes: data.notes || 'Melalui pemindaian QR', inspected_by: Auth.userId()
              }).then(function () { return DB.update('assets', a.id, { current_condition_id: data.new_condition_id }); })
                .then(function () { UI.toast('success', 'Kondisi diperbarui'); load(); });
            }
          });
        } else {
          UI.formModal({
            title: 'Laporkan Kerusakan — ' + a.asset_code, submitText: 'Kirim',
            fields: [
              { name: 'desc', label: 'Deskripsi Kerusakan', type: 'textarea', required: true },
              { name: 'priority', label: 'Urgensi', type: 'select', options: ['Rendah', 'Sedang', 'Tinggi'], value: 'Sedang' }
            ],
            onSubmit: function (data) {
              return DB.nextNumber('TKT', 'maintenance_requests', 'ticket_number').then(function (num) {
                return DB.insert('maintenance_requests', {
                  organization_id: Auth.orgId(), ticket_number: num, asset_id: a.id,
                  reported_by: Auth.userId(), report_date: UI.todayISO(),
                  damage_description: data.desc, priority: data.priority, status: 'Open',
                  maintenance_type: 'Corrective Maintenance'
                });
              }).then(function (ins) {
                UI.toast('success', 'Tiket ' + ins.data.ticket_number + ' dibuat');
                load();
              });
            }
          });
        }
      };
    });
    logScan(a, 'view_detail');
  }

  function handleToken(token) {
    var a = findAsset(String(token).trim());
    if (!a) {
      UI.alertInfo('QR tidak valid', 'Token <code>' + UI.esc(String(token).slice(0, 40)) + '</code> tidak dikenali dalam sistem.');
      return;
    }
    if (a.asset_status === 'Dihapuskan') {
      UI.alertInfo('Aset telah dihapuskan', a.asset_code + ' berstatus dihapuskan dan diarsipkan. Tindakan transaksi dinonaktifkan.');
    }
    showResult(a);
  }

  function startCam() {
    if (typeof Html5Qrcode === 'undefined') { UI.toast('error', 'Library scanner belum termuat'); return; }
    if (scanner) return;
    scanner = new Html5Qrcode('qrReader');
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } },
      function (txt) { handleToken(txt); },
      function () {}
    ).catch(function (err) {
      UI.toast('error', 'Kamera tidak dapat diakses: ' + (err && err.message || 'izin ditolak'));
      scanner = null;
    });
  }
  function stopCam() {
    if (scanner) {
      try { scanner.stop().then(function () { try { scanner.clear(); } catch (e) {} }); } catch (e) {}
      scanner = null;
      document.getElementById('qrReader').innerHTML = '';
    }
  }

  document.getElementById('qrStartBtn').onclick = startCam;
  document.getElementById('qrStopBtn').onclick = stopCam;
  document.getElementById('manualGoBtn').onclick = function () {
    var v = document.getElementById('manualCode').value;
    if (v) handleToken(v);
  };
  document.getElementById('manualCode').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleToken(e.target.value);
  });

  load();
};
