/* =====================================================================
 * ASSET MANAGEMENT PRO — returns.js
 * Pengembalian barang: penuh/sebagian, kondisi, insiden → tiket pemeliharaan.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();

  function loadAll() {
    return Promise.all([
      DB.list('loan_returns', { order: 'return_date', asc: false }),
      DB.list('loan_return_items', {}),
      DB.list('loan_requests', {}), DB.list('loan_items', {}),
      DB.list('assets', {}), DB.list('profiles', {}), DB.list('asset_conditions', {})
    ]).then(function (r) {
      return {
        rets: r[0].data, retItems: r[1].data, loans: r[2].data, loanItems: r[3].data,
        assets: r[4].data, profs: UI.mapBy(r[5].data, 'id'), conds: r[6].data
      };
    });
  }

  function loanProgress(d, loanId) {
    var items = d.loanItems.filter(function (x) { return x.loan_id === loanId; });
    var out = items.reduce(function (s, x) { return s + (x.quantity || 1); }, 0);
    var back = 0;
    d.retItems.forEach(function (ri) {
      var li = d.loanItems.find(function (x) { return x.id === ri.loan_item_id; });
      if (li && li.loan_id === loanId) back += ri.quantity_returned || 0;
    });
    return { items: items, out: out, back: back };
  }

  function displayStatus(d, l) {
    if (l.status === 'Dipinjam') {
      var p = loanProgress(d, l.id);
      if (p.back > 0 && p.back < p.out) return 'Sebagian';
    }
    return l.status;
  }

  function render(d) {
    var rows = d.rets.map(function (rt) {
      var loan = d.loans.find(function (l) { return l.id === rt.loan_id; }) || {};
      var items = d.retItems.filter(function (x) { return x.return_id === rt.id; });
      return Object.assign({}, rt, {
        loan_number: loan.loan_number || '-',
        borrower_name: (d.profs[loan.borrower_id] || {}).full_name || '-',
        receiver_name: (d.profs[rt.received_by] || {}).full_name || '-',
        nItems: items.length
      });
    });
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Pengembalian Barang',
      'Pencatatan kondisi barang saat kembali, pengembalian penuh atau sebagian',
      '<button class="btn btn-primary btn-sm" id="addRet"><i class="bi bi-plus-lg me-1"></i>Proses Pengembalian</button>' +
      '<button class="btn btn-outline-secondary btn-sm" id="expRet"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>');

    UI.dataTable({
      mount: '#retTable',
      columns: [
        { key: 'return_number', label: 'No. Pengembalian' },
        { key: 'return_date', label: 'Tanggal', render: function (rt) { return UI.fdate(rt.return_date); } },
        { key: 'loan_number', label: 'Peminjaman' },
        { key: 'borrower_name', label: 'Peminjam' },
        { key: 'nItems', label: 'Item', class: 'text-center' },
        { key: 'receiver_name', label: 'Petugas Penerima' },
        { key: 'status', label: 'Status', render: function (rt) { return UI.badge(rt.status === 'Completed' ? 'Dikembalikan' : rt.status); } }
      ],
      rows: rows, pageSize: 10,
      actions: function (rt) {
        return UI.iconBtn('Detail', 'eye', 'data-act="detail" data-id="' + rt.id + '"', 'btn-outline-secondary');
      }
    });
    document.getElementById('expRet').onclick = function () {
      UI.exportExcel('pengembalian.xlsx', rows.map(function (rt) {
        return { Nomor: rt.return_number, Tanggal: rt.return_date, Peminjaman: rt.loan_number,
          Peminjam: rt.borrower_name, 'Jumlah Item': rt.nItems, Petugas: rt.receiver_name, Status: rt.status };
      }));
    };
    document.getElementById('retTable').onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var rt = d.rets.find(function (x) { return x.id === b.dataset.id; });
      showDetail(d, rt);
    };
    document.getElementById('addRet').onclick = function () { openForm(d); };
  }

  function showDetail(d, rt) {
    var items = d.retItems.filter(function (x) { return x.return_id === rt.id; });
    var loan = d.loans.find(function (l) { return l.id === rt.loan_id; }) || {};
    UI.modal({
      title: 'Pengembalian ' + rt.return_number, size: 'lg',
      body: '<div class="row amp-detail-grid mb-2">' +
        UI.kv('Tanggal', UI.fdate(rt.return_date)) +
        UI.kv('Peminjaman', UI.esc(loan.loan_number || '-')) +
        UI.kv('Petugas Penerima', UI.esc((d.profs[rt.received_by] || {}).full_name || '-')) +
        UI.kv('Catatan', UI.esc(rt.notes || '-')) + '</div>' +
        '<table class="table table-sm"><thead><tr><th>Barang</th><th class="text-end">Jml</th><th>Kondisi Kembali</th><th>Kerusakan</th></tr></thead><tbody>' +
        items.map(function (x) {
          var a = d.assets.find(function (y) { return y.id === x.asset_id; });
          var c = d.conds.find(function (y) { return y.id === x.condition_after_id; });
          return '<tr><td>' + UI.esc(a ? a.asset_code + ' — ' + a.asset_name : '-') + '</td>' +
            '<td class="text-end">' + x.quantity_returned + '</td><td>' + UI.badge(c ? c.condition_name : '-') + '</td><td class="small text-danger">' + UI.esc(x.damage_notes || '-') + '</td></tr>';
        }).join('') + '</tbody></table>',
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>'
    });
  }

  function openForm(d) {
    var active = d.loans.filter(function (l) { return l.status === 'Dipinjam' || displayStatus(d, l) === 'Sebagian'; });
    if (!active.length) { UI.toast('warning', 'Tidak ada peminjaman aktif yang perlu dikembalikan'); return; }
    var loanId = active[0].id;
    var body = '<div class="row g-2">' +
      '<div class="col-md-6 mb-2"><label class="form-label">Pilih Peminjaman *</label><select class="form-select" id="rtLoan">' +
      active.map(function (l) {
        var p = loanProgress(d, l.id);
        return '<option value="' + l.id + '">' + UI.esc(l.loan_number + ' — ' + (d.profs[l.borrower_id] || {}).full_name + ' (dipinjam ' + (p.out - p.back) + ' dari ' + p.out + ' unit)') + '</option>';
      }).join('') + '</select></div>' +
      '<div class="col-md-3 mb-2"><label class="form-label">Tanggal *</label><input type="date" class="form-control" id="rtDate" value="' + UI.todayISO() + '"></div>' +
      '<div class="col-md-3 mb-2"><label class="form-label">Petugas Penerima</label><select class="form-select" id="rtRecv">' +
      Object.values(d.profs).map(function (p) { return '<option value="' + p.id + '"' + (p.id === Auth.userId() ? ' selected' : '') + '>' + UI.esc(p.full_name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-12"><div class="amp-form-section-title">Barang Dikembalikan</div><div id="rtItems"></div></div>' +
      '<div class="col-12"><label class="form-label">Catatan</label><input class="form-control" id="rtNote"></div></div>';
    var m = UI.modal({
      title: 'Proses Pengembalian', size: 'xl', body: body,
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>' +
        '<button class="btn btn-primary" id="rtSave"><i class="bi bi-check-lg me-1"></i>Simpan Pengembalian</button>',
      onShown: function () {
        draw();
        document.getElementById('rtLoan').onchange = draw;
        document.getElementById('rtSave').onclick = save;
      }
    });
    function draw() {
      var lid = document.getElementById('rtLoan').value;
      var items = d.loanItems.filter(function (x) { return x.loan_id === lid; });
      document.getElementById('rtItems').innerHTML = items.map(function (x, i) {
        var a = d.assets.find(function (y) { return y.id === x.asset_id; });
        var retQty = d.retItems.filter(function (ri) { return ri.loan_item_id === x.id; }).reduce(function (s, ri) { return s + (ri.quantity_returned || 0); }, 0);
        var remaining = (x.quantity || 1) - retQty;
        return '<div class="amp-repeater-row"><div class="row g-2 align-items-end">' +
          '<div class="col-md-4"><label class="form-label small">Barang</label><div class="small fw-semibold">' + UI.esc(a ? a.asset_code + ' — ' + a.asset_name : '-') + '</div>' +
          '<div class="text-muted" style="font-size:.72rem">sisa belum kembali: ' + remaining + '</div></div>' +
          '<div class="col-md-2"><label class="form-label small">Jml Dikembalikan</label><input type="number" class="form-control form-control-sm rt-qty" data-idx="' + i + '" min="0" max="' + remaining + '" value="' + remaining + '"></div>' +
          '<div class="col-md-3"><label class="form-label small">Kondisi Saat Kembali</label><select class="form-select form-select-sm rt-cond" data-idx="' + i + '">' +
          d.conds.map(function (c) { return '<option value="' + c.id + '">' + UI.esc(c.condition_name) + '</option>'; }).join('') + '</select></div>' +
          '<div class="col-md-3"><label class="form-label small">Catatan Kerusakan</label><input class="form-control form-control-sm rt-dmg" data-idx="' + i + '" placeholder="kosongkan jika baik"></div>' +
          '</div></div>';
      }).join('');
    }
    function save() {
      var lid = document.getElementById('rtLoan').value;
      var loan = d.loans.find(function (l) { return l.id === lid; });
      var items = d.loanItems.filter(function (x) { return x.loan_id === lid; });
      var payload = [];
      var incidents = [];
      document.querySelectorAll('#rtItems .rt-qty').forEach(function (inp) {
        var i = Number(inp.dataset.idx);
        var x = items[i];
        var qty = Number(inp.value) || 0;
        if (!qty) return;
        var condId = document.querySelector('#rtItems .rt-cond[data-idx="' + i + '"]').value;
        var dmg = document.querySelector('#rtItems .rt-dmg[data-idx="' + i + '"]').value;
        payload.push({ loan_item_id: x.id, asset_id: x.asset_id, quantity_returned: qty, condition_after_id: condId, damage_notes: dmg || null });
        if (dmg || (condId && ['cond-rr', 'cond-rb', 'cond-tf', 'cond-hilang'].indexOf(condId) >= 0)) incidents.push(x);
      });
      if (!payload.length) { UI.toast('warning', 'Tidak ada barang yang dikembalikan'); return; }
      DB.nextNumber('RTN', 'loan_returns', 'return_number').then(function (num) {
        return DB.insert('loan_returns', {
          organization_id: org, return_number: num, loan_id: lid,
          return_date: document.getElementById('rtDate').value,
          received_by: document.getElementById('rtRecv').value,
          notes: document.getElementById('rtNote').value || null, status: 'Completed'
        }).then(function (ins) {
          var rec = ins.data;
          return DB.insertMany('loan_return_items', payload.map(function (p) { return Object.assign({ return_id: rec.id }, p); }))
            .then(function () { return rec; });
        });
      }).then(function (rec) {
        // Update kondisi & status aset
        var chains = payload.map(function (p) {
          var upd = { current_condition_id: p.condition_after_id };
          if (p.condition_after_id === 'cond-hilang') { upd.asset_status = 'Hilang'; }
          else { upd.asset_status = 'Aktif'; }
          return DB.update('assets', p.asset_id, upd).then(function () {
            return DB.insert('asset_condition_histories', {
              asset_id: p.asset_id, old_condition_id: null, new_condition_id: p.condition_after_id,
              inspection_date: rec.return_date, notes: 'Pengembalian ' + rec.return_number + (p.damage_notes ? ' — ' + p.damage_notes : ''), inspected_by: rec.received_by
            });
          });
        });
        // Status peminjaman: sebagian atau dikembalikan
        var p = loanProgress(d, lid);
        var backNow = p.back + payload.reduce(function (s, x) { return s + x.quantity_returned; }, 0);
        var newStatus = backNow >= p.out ? 'Dikembalikan' : 'Sebagian';
        chains.push(DB.update('loan_requests', lid, { status: newStatus }));
        chains.push(DB.insert('loan_status_histories', { loan_id: lid, old_status: loan.status, new_status: newStatus, changed_by: Auth.userId(), notes: 'Pengembalian ' + rec.return_number, created_at: new Date().toISOString() }));
        // Insiden → tiket pemeliharaan otomatis
        incidents.forEach(function (x) {
          var a = d.assets.find(function (y) { return y.id === x.asset_id; });
          var retRow = payload.find(function (pp) { return pp.asset_id === x.asset_id; });
          if (a && a.asset_status !== 'Hilang') {
            chains.push(DB.nextNumber('TKT', 'maintenance_requests', 'ticket_number').then(function (num) {
              return DB.insert('maintenance_requests', {
                organization_id: org, ticket_number: num, asset_id: x.asset_id,
                reported_by: Auth.userId(), report_date: UI.todayISO(),
                damage_description: 'Insiden pengembalian ' + rec.return_number + ': ' + (retRow.damage_notes || 'kondisi menurun'),
                priority: 'Sedang', status: 'Open', maintenance_type: 'Corrective Maintenance'
              });
            }));
          } else if (a) {
            chains.push(DB.insert('notifications', { user_id: null, title: 'Laporan kehilangan', message: 'Aset ' + a.asset_code + ' dilaporkan hilang saat pengembalian ' + rec.return_number + '.', notification_type: 'asset_unverified', is_read: false }));
          }
        });
        return Promise.all(chains).then(function () { return rec; });
      }).then(function (rec) {
        UI.toast('success', 'Pengembalian ' + rec.return_number + ' tersimpan' + (incidents.length ? ' — ' + incidents.length + ' insiden dicatat sebagai tiket' : ''));
        m.close(); reload();
      }).catch(function (e) { UI.toast('error', e.message); });
    }
  }

  function reload() { loadAll().then(render); }
  loadAll().then(render);
};
