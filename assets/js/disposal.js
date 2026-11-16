/* =====================================================================
 * ASSET MANAGEMENT PRO — disposal.js
 * Penghapusan aset: Pengajuan → Pemeriksaan/Review → Persetujuan Pimpinan
 * → Pelaksanaan → Arsip. Aset dihapuskan diarsipkan, tidak dihapus permanen.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();

  function loadAll() {
    return Promise.all([
      DB.list('asset_disposals', { order: 'disposal_date', asc: false }),
      DB.list('asset_disposal_items', {}),
      DB.list('assets', {}), DB.list('profiles', {}), DB.list('asset_conditions', {})
    ]).then(function (r) {
      return {
        ds: r[0].data, items: r[1].data, assets: r[2].data,
        profs: UI.mapBy(r[3].data, 'id'), conds: r[4].data
      };
    });
  }

  function render(d) {
    var rows = d.ds.map(function (x) {
      var its = d.items.filter(function (i) { return i.disposal_id === x.id; });
      return Object.assign({}, x, {
        nItems: its.length,
        proposed_name: (d.profs[x.proposed_by] || {}).full_name || '-',
        approved_name: x.approved_by ? ((d.profs[x.approved_by] || {}).full_name || '-') : '-',
        total_book: its.reduce(function (s, i) { return s + (i.book_value || 0); }, 0)
      });
    });
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Penghapusan & Pelepasan Aset',
      'Alasan penghapusan, berita acara, persetujuan pimpinan, dan pengarsipan',
      '<button class="btn btn-primary btn-sm" id="addDsp"><i class="bi bi-plus-lg me-1"></i>Pengajuan Penghapusan</button>' +
      '<button class="btn btn-outline-secondary btn-sm" id="expDsp"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>');

    UI.dataTable({
      mount: '#dspTable',
      columns: [
        { key: 'disposal_number', label: 'No. Penghapusan' },
        { key: 'disposal_date', label: 'Tanggal', render: function (x) { return UI.fdate(x.disposal_date); } },
        { key: 'nItems', label: 'Aset', class: 'text-center' },
        { key: 'reason', label: 'Alasan' },
        { key: 'disposal_method', label: 'Metode' },
        { key: 'total_book', label: 'Nilai Buku', class: 'text-end', render: function (x) { return UI.rp(x.total_book); } },
        { key: 'proposed_name', label: 'Pengusul' },
        { key: 'approved_name', label: 'Penyetuju', render: function (x) { return x.approved_name === '-' ? '<span class="text-warning">Menunggu</span>' : UI.esc(x.approved_name); } },
        { key: 'status', label: 'Status', render: function (x) { return UI.badge(x.status); } }
      ],
      rows: rows, pageSize: 10,
      actions: function (x) {
        var h = UI.iconBtn('Detail', 'eye', 'data-act="detail" data-id="' + x.id + '"', 'btn-outline-secondary');
        var roles = Auth.roles();
        var canApprove = Auth.isAdmin() || roles.indexOf('pimpinan') >= 0 || roles.indexOf('direktur') >= 0;
        if (x.status === 'Pengajuan' && canApprove) {
          h += UI.iconBtn('Setujui & Laksanakan', 'check2-circle', 'data-act="ok" data-id="' + x.id + '"', 'btn-outline-success') +
            UI.iconBtn('Tolak', 'x-circle', 'data-act="no" data-id="' + x.id + '"', 'btn-outline-danger');
        }
        return h;
      }
    });
    document.getElementById('expDsp').onclick = function () {
      UI.exportExcel('penghapusan-aset.xlsx', rows.map(function (x) {
        return { Nomor: x.disposal_number, Tanggal: x.disposal_date, Alasan: x.reason, Metode: x.disposal_method,
          'Nilai Buku': x.total_book, 'Harga Jual': x.selling_price, Pengusul: x.proposed_name, Penyetuju: x.approved_name, Status: x.status };
      }));
    };
    document.getElementById('dspTable').onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var x = d.ds.find(function (y) { return y.id === b.dataset.id; });
      if (b.dataset.act === 'detail') showDetail(d, x);
      else if (b.dataset.act === 'ok') approve(d, x, true);
      else if (b.dataset.act === 'no') approve(d, x, false);
    };
    document.getElementById('addDsp').onclick = function () { openForm(d); };
  }

  function showDetail(d, x) {
    var its = d.items.filter(function (i) { return i.disposal_id === x.id; });
    UI.modal({
      title: 'Penghapusan ' + x.disposal_number, size: 'lg',
      body: '<div class="row amp-detail-grid mb-2">' +
        UI.kv('Tanggal', UI.fdate(x.disposal_date)) +
        UI.kv('Alasan', UI.esc(x.reason)) +
        UI.kv('Metode Pelepasan', UI.esc(x.disposal_method || '-')) +
        UI.kv('Harga Jual', UI.rp(x.selling_price)) +
        UI.kv('Pengusul', UI.esc((d.profs[x.proposed_by] || {}).full_name || '-')) +
        UI.kv('Status', UI.badge(x.status)) +
        UI.kv('Catatan', UI.esc(x.notes || '-')) + '</div>' +
        '<table class="table table-sm"><thead><tr><th>Aset</th><th>Kondisi</th><th class="text-end">Nilai Buku</th></tr></thead><tbody>' +
        its.map(function (i) {
          var a = d.assets.find(function (y) { return y.id === i.asset_id; }) || {};
          var c = d.conds.find(function (y) { return y.id === i.condition_id; });
          return '<tr><td>' + UI.esc(a.asset_code + ' — ' + a.asset_name) + '</td><td>' + UI.badge(c ? c.condition_name : '-') + '</td><td class="text-end">' + UI.rp(i.book_value) + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<div class="text-muted small"><i class="bi bi-archive me-1"></i>Aset yang dihapuskan tetap tersimpan sebagai arsip untuk kepentingan audit.</div>',
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>'
    });
  }

  function approve(d, x, ok) {
    if (!ok) {
      return UI.formModal({
        title: 'Tolak Penghapusan ' + x.disposal_number, submitText: 'Tolak',
        fields: [{ name: 'note', label: 'Alasan Penolakan', type: 'textarea', required: true }],
        onSubmit: function (data) {
          return DB.update('asset_disposals', x.id, { status: 'Ditolak', notes: data.note })
            .then(function () { UI.toast('success', 'Penghapusan ditolak'); reload(); });
        }
      });
    }
    UI.confirmDialog({
      title: 'Setujui penghapusan?',
      html: 'Aset berstatus <strong>Dihapuskan</strong> (diarsipkan, tidak dihapus permanen). Nilai buku dicatat pada tanggal penghapusan.'
    }).then(function (ok2) {
      if (!ok2) return;
      var items = d.items.filter(function (i) { return i.disposal_id === x.id; });
      Promise.all(items.map(function (i) {
        return DB.update('assets', i.asset_id, { asset_status: 'Dihapuskan', is_active: false, current_condition_id: 'cond-hapus' });
      }).concat([DB.update('asset_disposals', x.id, { status: 'Selesai', approved_by: Auth.userId() })]))
        .then(function () {
          DB.insert('approval_histories', { transaction_type: 'disposal', transaction_id: x.id, step_order: 1, approver_id: Auth.userId(), decision: 'Approved', notes: 'Disetujui & dilaksanakan', decided_at: new Date().toISOString() });
          UI.toast('success', 'Penghapusan selesai — aset diarsipkan');
          reload();
        });
    });
  }

  function openForm(d) {
    var candidates = d.assets.filter(function (a) {
      return ['Aktif', 'Rusak'].indexOf(a.asset_status) >= 0 &&
        ['cond-rb', 'cond-tf', 'cond-rr'].indexOf(a.current_condition_id) >= 0;
    });
    if (!candidates.length) { UI.toast('warning', 'Tidak ada aset yang memenuhi syarat (rusak berat / tidak berfungsi)'); return; }
    var items = [];
    var body = '<div class="row g-2">' +
      '<div class="col-md-3 mb-2"><label class="form-label">Tanggal *</label><input type="date" class="form-control" id="dsDate" value="' + UI.todayISO() + '"></div>' +
      '<div class="col-md-5 mb-2"><label class="form-label">Alasan Penghapusan *</label><select class="form-select" id="dsReason">' +
      ['Rusak berat', 'Tidak ekonomis diperbaiki', 'Hilang', 'Usang', 'Tidak dibutuhkan', 'Dijual', 'Dihibahkan', 'Sebab lain sesuai kebijakan'].map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-md-4 mb-2"><label class="form-label">Metode Pelepasan</label><select class="form-select" id="dsMethod"><option>Dibuang (ditemani berita acara)</option><option>Dijual</option><option>Dihibahkan</option></select></div>' +
      '<div class="col-12"><div class="amp-form-section-title">Aset Dihapuskan</div><div id="dsItems"></div>' +
      '<button class="btn btn-outline-secondary btn-sm mt-1" id="dsAdd"><i class="bi bi-plus-lg"></i> Tambah Aset</button></div>' +
      '<div class="col-12"><label class="form-label">Rekomendasi / Catatan</label><textarea class="form-control" id="dsNote" rows="2"></textarea></div></div>';
    var m = UI.modal({
      title: 'Pengajuan Penghapusan Aset', size: 'xl', body: body,
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>' +
        '<button class="btn btn-primary" id="dsSave"><i class="bi bi-send me-1"></i>Ajukan</button>',
      onShown: function () {
        draw();
        document.getElementById('dsAdd').onclick = function () { items.push({}); draw(); };
        document.getElementById('dsSave').onclick = save;
      }
    });
    function draw() {
      document.getElementById('dsItems').innerHTML = items.map(function (it, i) {
        var a = it.asset_id ? d.assets.find(function (y) { return y.id === it.asset_id; }) : null;
        return '<div class="amp-repeater-row" data-idx="' + i + '">' +
          '<button class="btn-close amp-repeater-remove" data-rm="' + i + '"></button>' +
          '<div class="row g-2">' +
          '<div class="col-md-5"><label class="form-label small">Aset *</label><select class="form-select form-select-sm ds-asset">' +
          '<option value="">-- Pilih aset --</option>' + candidates.map(function (c) {
            return '<option value="' + c.id + '"' + (it.asset_id === c.id ? ' selected' : '') + '>' + UI.esc(c.asset_code + ' — ' + c.asset_name) + '</option>';
          }).join('') + '</select></div>' +
          '<div class="col-md-3"><label class="form-label small">Nilai Buku</label><input class="form-control form-control-sm ds-bv" readonly value="' + (a ? '-' : '-') + '"></div>' +
          '<div class="col-md-4"><label class="form-label small">Catatan</label><input class="form-control form-control-sm ds-note" value="' + UI.esc(it.notes || '') + '"></div>' +
          '</div></div>';
      }).join('');
      document.querySelectorAll('#dsItems [data-rm]').forEach(function (b) {
        b.onclick = function () { items.splice(Number(b.dataset.rm), 1); if (!items.length) items.push({}); draw(); };
      });
      document.querySelectorAll('#dsItems .ds-asset').forEach(function (sel, i) {
        sel.onchange = function (e) { items[i].asset_id = e.target.value; draw(); };
      });
      document.querySelectorAll('#dsItems .ds-note').forEach(function (inp, i) {
        inp.onchange = function (e) { items[i].notes = e.target.value; };
      });
    }
    function save() {
      var valid = items.filter(function (x) { return x.asset_id; });
      if (!valid.length) return UI.toast('warning', 'Pilih minimal satu aset');
      DB.nextNumber('DHO', 'asset_disposals', 'disposal_number').then(function (num) {
        return DB.insert('asset_disposals', {
          organization_id: org, disposal_number: num, disposal_date: document.getElementById('dsDate').value,
          reason: document.getElementById('dsReason').value, proposed_by: Auth.userId(),
          disposal_method: document.getElementById('dsMethod').value, selling_price: 0,
          book_value_at_disposal: 0, status: 'Pengajuan', notes: document.getElementById('dsNote').value || null
        }).then(function (ins) {
          return DB.insertMany('asset_disposal_items', valid.map(function (x) {
            var a = d.assets.find(function (y) { return y.id === x.asset_id; });
            return { disposal_id: ins.data.id, asset_id: x.asset_id, condition_id: a.current_condition_id,
              book_value: 0, selling_price: 0, notes: x.notes || null };
          })).then(function () { return ins.data; });
        });
      }).then(function (rec) {
        DB.insert('notifications', { user_id: null, title: 'Pengajuan penghapusan aset', message: rec.disposal_number + ' menunggu persetujuan pimpinan.', notification_type: 'disposal_pending', related_table: 'asset_disposals', related_id: rec.id, is_read: false });
        UI.toast('success', 'Pengajuan ' + rec.disposal_number + ' terkirim');
        m.close(); reload();
      }).catch(function (e) { UI.toast('error', e.message); });
    }
  }

  function reload() { loadAll().then(render); }
  loadAll().then(render);
};
