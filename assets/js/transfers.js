/* =====================================================================
 * ASSET MANAGEMENT PRO — transfers.js
 * Mutasi aset: Pengajuan → Persetujuan → Pengiriman → Penerimaan → Selesai.
 * Lokasi aset diperbarui HANYA setelah penerimaan selesai.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();

  function loadAll() {
    return Promise.all([
      DB.list('asset_transfers', { order: 'transfer_date', asc: false }),
      DB.list('asset_transfer_items', {}),
      DB.list('assets', {}), DB.list('locations', {}), DB.list('units', {}), DB.list('profiles', {})
    ]).then(function (r) {
      return {
        trs: r[0].data, items: r[1].data, assets: r[2].data,
        locs: UI.mapBy(r[3].data, 'id'), units: UI.mapBy(r[4].data, 'id'), profs: UI.mapBy(r[5].data, 'id')
      };
    });
  }

  function render(d) {
    var rows = d.trs.map(function (t) {
      var its = d.items.filter(function (x) { return x.transfer_id === t.id; });
      return Object.assign({}, t, {
        nItems: its.length,
        srcLoc: (d.locs[t.source_location_id] || {}).location_name || '-',
        dstLoc: (d.locs[t.destination_location_id] || {}).location_name || '-',
        srcUnit: (d.units[t.source_unit_id] || {}).name || '-',
        dstUnit: (d.units[t.destination_unit_id] || {}).name || '-',
        requester_name: (d.profs[t.requested_by] || {}).full_name || '-'
      });
    });
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Mutasi Aset',
      'Perpindahan barang antar lokasi/unit dengan alur pengajuan, persetujuan, pengiriman, dan penerimaan',
      '<button class="btn btn-primary btn-sm" id="addTrf"><i class="bi bi-plus-lg me-1"></i>Ajukan Mutasi</button>');

    UI.dataTable({
      mount: '#trfTable',
      columns: [
        { key: 'transfer_number', label: 'No. Mutasi' },
        { key: 'transfer_date', label: 'Tanggal', render: function (t) { return UI.fdate(t.transfer_date); } },
        { key: 'nItems', label: 'Aset', class: 'text-center' },
        { key: 'srcLoc', label: 'Lokasi Asal' },
        { key: 'dstLoc', label: 'Lokasi Tujuan' },
        { key: 'reason', label: 'Alasan' },
        { key: 'status', label: 'Status', render: function (t) { return UI.badge(t.status); } }
      ],
      rows: rows, pageSize: 10,
      actions: function (t) {
        var h = UI.iconBtn('Detail', 'eye', 'data-act="detail" data-id="' + t.id + '"', 'btn-outline-secondary');
        if (t.status === 'Pengajuan' && (Auth.can('approve.transfer') || Auth.isAdmin() || Auth.roles().indexOf('manajer') >= 0)) {
          h += UI.iconBtn('Setujui', 'check2-circle', 'data-act="ok" data-id="' + t.id + '"', 'btn-outline-success') +
            UI.iconBtn('Tolak', 'x-circle', 'data-act="no" data-id="' + t.id + '"', 'btn-outline-danger');
        }
        if (t.status === 'Disetujui' && (Auth.can('process.transfer') || Auth.isAdmin())) {
          h += UI.iconBtn('Kirim', 'box-arrow-up', 'data-act="send" data-id="' + t.id + '"', 'btn-outline-primary');
        }
        if ((t.status === 'Pengiriman' || t.status === 'Penerimaan') && (Auth.can('process.transfer') || Auth.isAdmin())) {
          h += UI.iconBtn('Terima & Selesaikan', 'box-arrow-in-down', 'data-act="recv" data-id="' + t.id + '"', 'btn-outline-success');
        }
        return h;
      }
    });

    document.getElementById('trfTable').onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var t = d.trs.find(function (x) { return x.id === b.dataset.id; });
      if (b.dataset.act === 'detail') showDetail(d, t);
      else if (b.dataset.act === 'ok') approve(d, t, true);
      else if (b.dataset.act === 'no') approve(d, t, false);
      else if (b.dataset.act === 'send') send(d, t);
      else if (b.dataset.act === 'recv') receive(d, t);
    };
    document.getElementById('addTrf').onclick = function () { openForm(d); };
  }

  function showDetail(d, t) {
    var its = d.items.filter(function (x) { return x.transfer_id === t.id; });
    UI.modal({
      title: 'Mutasi ' + t.transfer_number, size: 'lg',
      body: '<div class="row amp-detail-grid mb-2">' +
        UI.kv('Tanggal', UI.fdate(t.transfer_date)) +
        UI.kv('Pengaju', UI.esc((d.profs[t.requested_by] || {}).full_name || '-')) +
        UI.kv('Asal', UI.esc((d.locs[t.source_location_id] || {}).location_name || '-') + ' · ' + UI.esc((d.units[t.source_unit_id] || {}).name || '-')) +
        UI.kv('Tujuan', UI.esc((d.locs[t.destination_location_id] || {}).location_name || '-') + ' · ' + UI.esc((d.units[t.destination_unit_id] || {}).name || '-')) +
        UI.kv('Alasan', UI.esc(t.reason)) +
        UI.kv('Status', UI.badge(t.status)) + '</div>' +
        '<table class="table table-sm"><thead><tr><th>Aset</th><th>Kondisi</th></tr></thead><tbody>' +
        its.map(function (x) {
          var a = d.assets.find(function (y) { return y.id === x.asset_id; });
          return '<tr><td>' + UI.esc(a ? a.asset_code + ' — ' + a.asset_name : '-') + '</td><td>' + UI.badge((d.assets.find(function (y) { return y.id === x.asset_id; }) || {}).asset_status || '-') + '</td></tr>';
        }).join('') + '</tbody></table>',
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>'
    });
  }

  function approve(d, t, ok) {
    if (!ok) {
      return UI.formModal({
        title: 'Tolak Mutasi ' + t.transfer_number, submitText: 'Tolak',
        fields: [{ name: 'reason', label: 'Alasan Penolakan', type: 'textarea', required: true }],
        onSubmit: function (data) {
          return DB.update('asset_transfers', t.id, { status: 'Ditolak', reason: t.reason + ' [DITOLAK: ' + data.reason + ']' })
            .then(function () { UI.toast('success', 'Mutasi ditolak'); reload(); });
        }
      });
    }
    if (t.status !== 'Pengajuan') { UI.toast('warning', 'Mutasi sudah diproses'); return; }
    UI.confirmDialog({ title: 'Setujui mutasi?', html: t.transfer_number }).then(function (ok2) {
      if (!ok2) return;
      var items = d.items.filter(function (x) { return x.transfer_id === t.id; });
      Promise.all(items.map(function (x) { return DB.update('assets', x.asset_id, { asset_status: 'Dalam Mutasi' }); })
        .concat([DB.update('asset_transfers', t.id, { status: 'Disetujui', approved_by: Auth.userId() })]))
        .then(function () { UI.toast('success', 'Mutasi disetujui — aset berstatus Dalam Mutasi'); reload(); });
    });
  }

  function send(d, t) {
    UI.confirmDialog({ title: 'Catat pengiriman barang?', html: 'Menunggu penerimaan di lokasi tujuan.' }).then(function (ok) {
      if (!ok) return;
      DB.update('asset_transfers', t.id, { status: 'Pengiriman', petugas_kirim: t.petugas_kirim || Auth.userId() })
        .then(function () { UI.toast('success', 'Pengiriman dicatat'); reload(); });
    });
  }

  function receive(d, t) {
    UI.formModal({
      title: 'Penerimaan Mutasi — ' + t.transfer_number, submitText: 'Terima & Selesaikan',
      fields: [
        { name: 'petugas_terima', label: 'Petugas Penerima', type: 'select', required: true, options: Object.values(d.profs).map(function (p) { return { value: p.id, label: p.full_name }; }) },
        { name: 'notes', label: 'Catatan Serah Terima', type: 'textarea' }
      ],
      onSubmit: function (data) {
        var items = d.items.filter(function (x) { return x.transfer_id === t.id; });
        return Promise.all(items.map(function (x) {
          var a = d.assets.find(function (y) { return y.id === x.asset_id; });
          return DB.update('assets', x.asset_id, {
            current_location_id: t.destination_location_id,
            unit_id: t.destination_unit_id,
            asset_status: 'Aktif'
          }).then(function () {
            return DB.insert('asset_location_histories', {
              asset_id: x.asset_id, old_location_id: t.source_location_id,
              new_location_id: t.destination_location_id,
              old_unit_id: t.source_unit_id, new_unit_id: t.destination_unit_id,
              movement_date: UI.todayISO(),
              notes: 'Mutasi ' + t.transfer_number + (data.notes ? ' — ' + data.notes : ''),
              approved_by: data.petugas_terima
            });
          });
        })).then(function () {
          return DB.update('asset_transfers', t.id, { status: 'Selesai', petugas_terima: data.petugas_terima });
        }).then(function () {
          UI.toast('success', 'Mutasi selesai — lokasi aset diperbarui');
          reload();
        });
      }
    });
  }

  function openForm(d) {
    var movable = d.assets.filter(function (a) {
      return ['Aktif', 'Dalam Pemeliharaan'].indexOf(a.asset_status) >= 0;
    });
    var items = [];
    var body = '<div class="row g-2">' +
      '<div class="col-md-3 mb-2"><label class="form-label">Tanggal *</label><input type="date" class="form-control" id="trDate" value="' + UI.todayISO() + '"></div>' +
      '<div class="col-md-4 mb-2"><label class="form-label">Lokasi Tujuan *</label><select class="form-select" id="trDst">' +
      Object.values(d.locs).map(function (l) { return '<option value="' + l.id + '">' + UI.esc(l.location_name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-md-5 mb-2"><label class="form-label">Unit Tujuan *</label><select class="form-select" id="trDstUnit">' +
      Object.values(d.units).map(function (u) { return '<option value="' + u.id + '">' + UI.esc(u.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-12 mb-2"><label class="form-label">Alasan Mutasi *</label><textarea class="form-control" id="trReason" rows="2"></textarea></div>' +
      '<div class="col-12"><div class="amp-form-section-title">Aset yang Dimutasi</div><div id="trItems"></div>' +
      '<button class="btn btn-outline-secondary btn-sm mt-1" id="trAdd"><i class="bi bi-plus-lg"></i> Tambah Aset</button></div></div>';
    var m = UI.modal({
      title: 'Pengajuan Mutasi Aset', size: 'xl', body: body,
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>' +
        '<button class="btn btn-primary" id="trSave"><i class="bi bi-send me-1"></i>Ajukan</button>',
      onShown: function () {
        draw();
        document.getElementById('trAdd').onclick = function () { items.push({}); draw(); };
        document.getElementById('trSave').onclick = save;
      }
    });
    function draw() {
      document.getElementById('trItems').innerHTML = items.map(function (it, i) {
        var a = it.asset_id ? d.assets.find(function (y) { return y.id === it.asset_id; }) : null;
        return '<div class="amp-repeater-row" data-idx="' + i + '">' +
          '<button class="btn-close amp-repeater-remove" data-rm="' + i + '"></button>' +
          '<div class="row g-2">' +
          '<div class="col-md-7"><label class="form-label small">Aset *</label><select class="form-select form-select-sm tr-asset">' +
          '<option value="">-- Pilih aset --</option>' + movable.map(function (x) {
            return '<option value="' + x.id + '"' + (it.asset_id === x.id ? ' selected' : '') + '>' + UI.esc(x.asset_code + ' — ' + x.asset_name + ' [' + x.asset_status + ']') + '</option>';
          }).join('') + '</select></div>' +
          '<div class="col-md-5"><label class="form-label small">Lokasi Asal (otomatis)</label>' +
          '<input class="form-control form-control-sm" readonly value="' + UI.esc(a && a.current_location_id ? (d.locs[a.current_location_id] || {}).location_name : '-') + '"></div>' +
          '</div></div>';
      }).join('');
      document.querySelectorAll('#trItems [data-rm]').forEach(function (b) {
        b.onclick = function () { items.splice(Number(b.dataset.rm), 1); if (!items.length) items.push({}); draw(); };
      });
      document.querySelectorAll('#trItems .tr-asset').forEach(function (sel, i) {
        sel.onchange = function (e) { items[i].asset_id = e.target.value; draw(); };
      });
    }
    function save() {
      var reason = document.getElementById('trReason').value.trim();
      if (!reason) return UI.toast('warning', 'Isi alasan mutasi');
      var valid = items.filter(function (x) { return x.asset_id; });
      if (!valid.length) return UI.toast('warning', 'Pilih minimal satu aset');
      var first = d.assets.find(function (y) { return y.id === valid[0].asset_id; });
      DB.nextNumber('MUT', 'asset_transfers', 'transfer_number').then(function (num) {
        return DB.insert('asset_transfers', {
          organization_id: org, transfer_number: num, transfer_date: document.getElementById('trDate').value,
          requested_by: Auth.userId(), source_location_id: first.current_location_id,
          destination_location_id: document.getElementById('trDst').value,
          source_unit_id: first.unit_id, destination_unit_id: document.getElementById('trDstUnit').value,
          reason: reason, status: 'Pengajuan'
        }).then(function (ins) {
          return DB.insertMany('asset_transfer_items', valid.map(function (x) {
            return { transfer_id: ins.data.id, asset_id: x.asset_id, condition_before_id: (d.assets.find(function (y) { return y.id === x.asset_id; }) || {}).current_condition_id, notes: null };
          })).then(function () { return ins.data; });
        });
      }).then(function (rec) {
        UI.toast('success', 'Pengajuan mutasi ' + rec.transfer_number + ' terkirim');
        m.close(); reload();
      }).catch(function (e) { UI.toast('error', e.message); });
    }
  }

  function reload() { loadAll().then(render); }
  loadAll().then(render);
};
