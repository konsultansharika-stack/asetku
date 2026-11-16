/* =====================================================================
 * ASSET MANAGEMENT PRO — users.js
 * Pengguna & hak akses: kelola profil, peran, status aktif + matriks RBAC.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var isAdmin = Auth.isAdmin();
  var org = Auth.orgId();

  function loadAll() {
    return Promise.all([
      DB.list('profiles', { order: 'full_name', asc: true }),
      DB.list('user_roles', {}), DB.list('roles', {}), DB.list('units', {})
    ]).then(function (r) {
      return { profiles: r[0].data, userRoles: r[1].data, roles: r[2].data, units: UI.mapBy(r[3].data, 'id') };
    });
  }

  function roleOf(d, userId) {
    var ur = d.userRoles.find(function (x) { return x.user_id === userId; });
    if (!ur) return null;
    return d.roles.find(function (x) { return x.id === ur.role_id; }) || null;
  }

  function render(d) {
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Pengguna & Hak Akses',
      'Manajemen pengguna berbasis peran (RBAC) — hak akses diberlakukan di frontend dan RLS Supabase',
      (isAdmin ? '<button class="btn btn-primary btn-sm" id="addUser"><i class="bi bi-person-plus me-1"></i>Tambah Pengguna</button>' : ''));

    var rows = d.profiles.map(function (p) {
      var role = roleOf(d, p.id);
      return Object.assign({}, p, {
        role_name: role ? role.name : 'Tanpa Peran',
        role_key: role ? role.role_key : null,
        unit_name: (d.units[p.unit_id] || {}).name || '-'
      });
    });
    UI.dataTable({
      mount: '#userTable',
      columns: [
        { key: 'full_name', label: 'Nama Pengguna', render: function (p) { return '<div class="d-flex align-items-center gap-2"><span class="amp-avatar">' + p.full_name.slice(0, 1) + '</span><div><div class="fw-semibold">' + UI.esc(p.full_name) + '</div><div class="text-muted small">' + UI.esc(p.email) + '</div></div></div>'; } },
        { key: 'employee_number', label: 'NIP/NIK' },
        { key: 'unit_name', label: 'Unit' },
        { key: 'role_name', label: 'Peran', render: function (p) { return '<span class="badge text-bg-primary-subtle text-primary border">' + UI.esc(p.role_name) + '</span>'; } },
        { key: 'phone', label: 'Telepon' },
        { key: 'is_active', label: 'Status', render: function (p) { return UI.badge(p.is_active ? 'Aktif' : 'Diarsipkan'); } }
      ],
      rows: rows, pageSize: 12,
      actions: function (p) {
        if (!isAdmin) return UI.iconBtn('Detail', 'eye', 'data-act="view" data-id="' + p.id + '"', 'btn-outline-secondary');
        return UI.iconBtn('Ubah', 'pencil', 'data-act="edit" data-id="' + p.id + '"', 'btn-outline-primary') +
          UI.iconBtn('Peran', 'shield-lock', 'data-act="role" data-id="' + p.id + '"', 'btn-outline-dark') +
          (p.id !== Auth.userId() ? UI.iconBtn(p.is_active ? 'Nonaktifkan' : 'Aktifkan', 'power', 'data-act="toggle" data-id="' + p.id + '"', p.is_active ? 'btn-outline-danger' : 'btn-outline-success') : '');
      }
    });

    /* Matriks peran */
    var ROLE_DESC = {
      super_admin: 'Akses seluruh sistem, pengguna, konfigurasi, dan data',
      pimpinan: 'Dashboard keseluruhan, laporan seluruh unit, persetujuan penghapusan, pemantauan nilai aset',
      direktur: 'Aset direktorat, pemantauan penggunaan, persetujuan transaksi sesuai delegasi',
      manajer: 'Aset departemen, pengajuan kebutuhan, persetujuan peminjaman & mutasi unit',
      pengelola: 'Data aset, QR Code, lokasi, peminjaman & pengembalian, stock opname',
      gudang: 'Penerimaan barang, stok, barang masuk & keluar, ikut opname',
      teknisi: 'Tiket pemeliharaan, pembaruan pekerjaan, hasil perbaikan',
      keuangan: 'Nilai perolehan, penyusutan, nilai buku, data pengadaan',
      pegawai: 'Melihat inventaris yang diizinkan, mengajukan peminjaman, melaporkan kerusakan, mengajukan kebutuhan'
    };
    document.getElementById('rolesPanel').innerHTML =
      '<div class="row g-3">' + Object.keys(ROLE_DESC).map(function (k) {
        var role = d.roles.find(function (x) { return x.role_key === k; }) || {};
        return '<div class="col-md-6 col-xl-4"><div class="card amp-card h-100"><div class="card-body">' +
          '<h6 class="fw-bold mb-1"><i class="bi bi-shield-check text-primary me-1"></i>' + UI.esc(role.name || k) + '</h6>' +
          '<p class="text-muted small mb-2">' + UI.esc(ROLE_DESC[k]) + '</p>' +
          '<div class="small">' + d.profiles.filter(function (p) { var r = roleOf(d, p.id); return r && r.role_key === k; }).map(function (p) {
            return '<span class="badge text-bg-light border me-1 mb-1">' + UI.esc(p.full_name) + '</span>';
          }).join('') + '</div></div></div></div>';
      }).join('') + '</div>' +
      '<div class="text-muted small mt-3"><i class="bi bi-info-circle me-1"></i>Enforcement di backend dilakukan oleh Row Level Security (RLS) Supabase — lihat <code>supabase/rls-policies.sql</code>.</div>';

    bind(d);
  }

  function bind(d) {
    var host = document.getElementById('amp-content');
    host.onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var p = d.profiles.find(function (x) { return x.id === b.dataset.id; });
      if (!p) return;
      if (b.dataset.act === 'view' || b.dataset.act === 'edit') {
        UI.formModal({
          title: b.dataset.act === 'edit' ? 'Ubah Pengguna' : 'Detail Pengguna', submitText: 'Simpan',
          fields: [
            { name: 'full_name', label: 'Nama Lengkap', required: true, value: p.full_name },
            { name: 'email', label: 'Email', type: 'email', required: true, value: p.email },
            { name: 'employee_number', label: 'NIP/NIK', value: p.employee_number },
            { name: 'phone', label: 'Telepon', value: p.phone },
            { name: 'unit_id', label: 'Unit', type: 'select', options: d.profiles.length ? Object.values(d.units).map(function (u) { return { value: u.id, label: u.name }; }) : [], value: p.unit_id },
            { name: 'is_active', label: 'Akun Aktif', type: 'checkbox', value: p.is_active !== false }
          ],
          onSubmit: function (data) {
            return DB.update('profiles', p.id, data).then(function () { UI.toast('success', 'Pengguna tersimpan'); reload(); });
          }
        });
      } else if (b.dataset.act === 'role') {
        var current = roleOf(d, p.id);
        UI.formModal({
          title: 'Atur Peran — ' + p.full_name, submitText: 'Simpan Peran',
          fields: [{ name: 'role_id', label: 'Peran', type: 'select', required: true, options: d.roles.map(function (r) { return { value: r.id, label: r.name }; }), value: current ? current.id : '' }],
          onSubmit: function (data) {
            var existing = d.userRoles.find(function (x) { return x.user_id === p.id; });
            if (existing) return DB.update('user_roles', existing.id, { role_id: data.role_id }).then(function () { UI.toast('success', 'Peran diperbarui'); reload(); });
            return DB.insert('user_roles', { user_id: p.id, role_id: data.role_id, organization_id: org }).then(function () { UI.toast('success', 'Peran ditetapkan'); reload(); });
          }
        });
      } else if (b.dataset.act === 'toggle') {
        UI.confirmDialog({ title: (p.is_active ? 'Nonaktifkan' : 'Aktifkan') + ' akun ' + p.full_name + '?', danger: p.is_active, confirmText: 'Ya' })
          .then(function (ok) {
            if (!ok) return;
            DB.update('profiles', p.id, { is_active: !p.is_active }).then(function () { UI.toast('success', 'Status akun diubah'); reload(); });
          });
      }
    };
    var add = document.getElementById('addUser');
    if (add) add.onclick = function () {
      UI.formModal({
        title: 'Tambah Pengguna', size: 'lg', submitText: 'Simpan',
        fields: [
          { name: 'full_name', label: 'Nama Lengkap', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'password', label: 'Kata Sandi Awal', required: true, help: 'Mode demo: tersimpan lokal. Mode Supabase: buat user melalui Supabase Auth/invitasi lalu kaitkan profil di sini.' },
          { name: 'employee_number', label: 'NIP/NIK' },
          { name: 'phone', label: 'Telepon' },
          { name: 'unit_id', label: 'Unit', type: 'select', options: Object.values(d.units).map(function (u) { return { value: u.id, label: u.name }; }) },
          { name: 'role_id', label: 'Peran', type: 'select', required: true, options: d.roles.map(function (r) { return { value: r.id, label: r.name }; }) }
        ],
        onSubmit: function (data) {
          var newId = 'prof-' + DB.uuid().slice(0, 8);
          return DB.insert('profiles', {
            id: newId, organization_id: org, full_name: data.full_name, email: data.email,
            phone: data.phone || null, employee_number: data.employee_number || null,
            unit_id: data.unit_id || null, is_active: true
          }).then(function () {
            return DB.insert('auth_users', { id: newId, user_id: newId, email: data.email.toLowerCase(), password: data.password });
          }).then(function () {
            return DB.insert('user_roles', { user_id: newId, role_id: data.role_id, organization_id: org });
          }).then(function () {
            UI.toast('success', 'Pengguna baru tersimpan'); reload();
          });
        }
      });
    };
  }

  function reload() { loadAll().then(render); }
  loadAll().then(render);
};
