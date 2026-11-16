/* =====================================================================
 * ASSET MANAGEMENT PRO — settings.js
 * Pengaturan: profil organisasi, preferensi aplikasi, audit trail,
 * koneksi data (mode demo / Supabase).
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var isAdmin = Auth.isAdmin();
  var org = Auth.orgId();

  function renderOrg() {
    DB.list('organizations', { limit: 1 }).then(function (r) {
      var o = r.data[0] || {};
      document.getElementById('orgPanel').innerHTML =
        '<div class="card amp-card" style="max-width:720px"><div class="card-body">' +
        '<form id="orgForm" class="row g-2">' +
        '<div class="col-md-8 mb-1"><label class="form-label">Nama Organisasi *</label><input class="form-control" name="name" value="' + UI.esc(o.name || '') + '" required></div>' +
        '<div class="col-md-4 mb-1"><label class="form-label">Kode</label><input class="form-control" name="code" value="' + UI.esc(o.code || '') + '"></div>' +
        '<div class="col-12 mb-1"><label class="form-label">Alamat</label><textarea class="form-control" name="address" rows="2">' + UI.esc(o.address || '') + '</textarea></div>' +
        '<div class="col-md-4 mb-1"><label class="form-label">Telepon</label><input class="form-control" name="phone" value="' + UI.esc(o.phone || '') + '"></div>' +
        '<div class="col-md-8 mb-1"><label class="form-label">Email</label><input class="form-control" type="email" name="email" value="' + UI.esc(o.email || '') + '"></div>' +
        '<div class="col-12 text-end"><button class="btn btn-primary btn-sm"><i class="bi bi-save me-1"></i>Simpan Profil</button></div>' +
        '</form></div></div>';
      document.getElementById('orgForm').onsubmit = function (e) {
        e.preventDefault();
        var f = e.target;
        var data = { name: f.name.value, code: f.code.value, address: f.address.value, phone: f.phone.value, email: f.email.value };
        DB.update('organizations', o.id, data).then(function (r2) {
          if (r2.error) throw r2.error;
          UI.toast('success', 'Profil organisasi tersimpan');
        }).catch(function (err) { UI.toast('error', err.message); });
      };
    });
  }

  function renderPref() {
    DB.list('app_settings', {}).then(function (r) {
      var rows = r.data || [];
      document.getElementById('prefPanel').innerHTML =
        '<div class="card amp-card" style="max-width:760px"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold">Preferensi & Kebijakan Aplikasi</h6></div><div class="card-body p-0">' +
        '<table class="table mb-0"><thead><tr><th>Kunci Pengaturan</th><th>Nilai</th><th></th></tr></thead><tbody>' +
        rows.map(function (s) {
          return '<tr><td class="fw-semibold">' + UI.esc(s.setting_key) + '</td>' +
            '<td><code style="font-size:.78rem">' + UI.esc(JSON.stringify(s.setting_value)) + '</code></td>' +
            '<td class="text-end">' + (isAdmin ? UI.iconBtn('Ubah', 'pencil', 'data-set="' + s.id + '"', 'btn-outline-primary') : '') + '</td></tr>';
        }).join('') +
        '</tbody></table>' +
        '<div class="p-3 d-flex gap-3 flex-wrap">' +
        '<div><label class="form-label small mb-1">Tema</label><button class="btn btn-outline-secondary btn-sm" id="prefTheme"><i class="bi bi-circle-half me-1"></i>Ganti Terang/Gelap</button></div>' +
        '<div><label class="form-label small mb-1">Tampilan tabel</label><span class="badge text-bg-light border">Default 10-15 baris</span></div>' +
        '</div></div></div>' +
        '<div class="card amp-card mt-3" style="max-width:760px"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold">Tentang Aplikasi</h6></div><div class="card-body small">' +
        '<div><strong>' + window.AMP_CONFIG.APP_NAME + '</strong> — ' + window.AMP_CONFIG.APP_TAGLINE + '</div>' +
        '<div class="text-muted mt-1">Sistem Informasi Inventaris, Barang, dan Manajemen Aset Terintegrasi. ' +
        'Mendukung siklus: Perencanaan → Pengadaan → Penerimaan → Inventarisasi → QR Code → Penempatan → Peminjaman → Pengembalian → Pemeliharaan → Penyusutan → Stock Opname → Penghapusan → Pelaporan.</div>' +
        '<div class="text-muted mt-2">Mode data: <strong>' + (DB.isDemo() ? 'Demo (lokal peramban)' : 'Supabase PostgreSQL') + '</strong></div>' +
        '</div></div>';
      document.getElementById('prefPanel').onclick = function (e) {
        if (e.target.closest('#prefTheme')) { document.getElementById('ampThemeBtn').click(); return; }
        var b = e.target.closest('[data-set]'); if (!b || !isAdmin) return;
        var s = rows.find(function (x) { return x.id === b.dataset.set; });
        UI.formModal({
          title: 'Ubah Pengaturan: ' + s.setting_key, submitText: 'Simpan',
          fields: [{ name: 'val', label: 'Nilai (JSON)', type: 'textarea', rows: 4, required: true, value: JSON.stringify(s.setting_value) }],
          onSubmit: function (data) {
            var parsed;
            try { parsed = JSON.parse(data.val); } catch (err) { UI.toast('error', 'Format JSON tidak valid'); return false; }
            return DB.update('app_settings', s.id, { setting_value: parsed }).then(function () { UI.toast('success', 'Pengaturan tersimpan'); renderPref(); });
          }
        });
      };
    });
  }

  function renderAudit() {
    if (!isAdmin) {
      document.getElementById('auditTable').innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-shield-lock fs-2 d-block"></i>Audit trail hanya untuk Super Admin.</div>';
      return;
    }
    DB.list('audit_logs', { order: 'created_at', asc: false, limit: 300 }).then(function (r) {
      UI.dataTable({
        mount: '#auditTable', pageSize: 12,
        columns: [
          { key: 'created_at', label: 'Waktu', render: function (a) { return UI.fdatetime(a.created_at); } },
          { key: 'user_name', label: 'Pengguna', render: function (a) { return UI.esc(a.user_name || '-'); } },
          { key: 'action', label: 'Aksi', render: function (a) { return '<span class="badge text-bg-secondary">' + UI.esc(a.action) + '</span>'; } },
          { key: 'table_name', label: 'Tabel' },
          { key: 'record_id', label: 'Record', render: function (a) { return '<code style="font-size:.72rem">' + UI.esc(String(a.record_id || '-').slice(0, 18)); } }
        ], rows: r.data
      });
    });
  }

  function renderData() {
    document.getElementById('dataPanel').innerHTML =
      '<div class="card amp-card" style="max-width:760px"><div class="card-body">' +
      '<h6 class="fw-bold">Status Koneksi Data</h6>' +
      '<div class="alert ' + (DB.isDemo() ? 'alert-warning' : 'alert-success') + ' py-2 small">' +
      (DB.isDemo() ?
        '<strong>Mode Demo aktif.</strong> Data disimpan di penyimpanan lokal peramban untuk demonstrasi — tidak untuk data produksi. Untuk produksi, hubungkan ke Supabase:' +
        '<ol class="mb-0 mt-1"><li>Buat project Supabase dan jalankan <code>supabase/schema.sql</code>, <code>rls-policies.sql</code>, <code>seed.sql</code>.</li>' +
        '<li>Isi <code>SUPABASE_URL</code> & <code>SUPABASE_ANON_KEY</code> pada <code>assets/js/supabase-config.js</code>.</li>' +
        '<li>Buat akun di Supabase Auth; sistem akan memakai PostgreSQL + RLS secara otomatis.</li></ol>' :
        '<strong>Tersambung ke Supabase.</strong> Semua transaksi tersimpan di PostgreSQL dengan Row Level Security.') +
      '</div>' +
      '<div class="d-flex gap-2 flex-wrap">' +
      '<button class="btn btn-outline-secondary btn-sm" id="expAll"><i class="bi bi-download me-1"></i>Ekspor Seluruh Data (JSON)</button>' +
      (DB.isDemo() && isAdmin ? '<button class="btn btn-outline-danger btn-sm" id="resetDemo"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset Data Demo</button>' : '') +
      '</div></div></div>';
    document.getElementById('expAll').onclick = function () {
      var tables = ['assets', 'asset_categories', 'locations', 'suppliers', 'loan_requests', 'procurement_requests', 'maintenance_requests'];
      Promise.all(tables.map(function (t) { return DB.list(t, { limit: 2000 }); })).then(function (rs) {
        var out = {};
        tables.forEach(function (t, i) { out[t] = rs[i].data; });
        var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'asset-management-export.json';
        a.click();
        UI.toast('success', 'Ekspor JSON diunduh');
      });
    };
    var rd = document.getElementById('resetDemo');
    if (rd) rd.onclick = function () {
      UI.confirmDialog({ title: 'Reset seluruh data demo?', html: 'Data contoh akan dimuat ulang; perubahan Anda hilang.', danger: true, confirmText: 'Reset' })
        .then(function (ok) {
          if (!ok) return;
          DB.resetDemo();
          UI.toast('success', 'Data demo dimuat ulang — halaman akan dimuat ulang');
          setTimeout(function () { location.reload(); }, 900);
        });
    };
  }

  document.getElementById('pageHead').innerHTML = UI.pageHeader('Pengaturan',
    'Profil organisasi, preferensi aplikasi, audit trail, dan koneksi data',
    '<button class="btn btn-outline-dark btn-sm" id="backHome"><i class="bi bi-house me-1"></i>Dashboard</button>');
  document.getElementById('backHome').onclick = function () { location.href = 'index.html'; };
  renderOrg();
  renderPref();
  renderAudit();
  renderData();
};
