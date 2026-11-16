/* =====================================================================
 * ASSET MANAGEMENT PRO — loans.js
 * Peminjaman barang: pengajuan, persetujuan, serah terima, anti-overlap.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();
  var today = UI.todayISO();
  var params = new URLSearchParams(location.search);
  var preAsset = params.get('asset');

  function loadAll() {
    return Promise.all([
      DB.list('loan_requests', { order: 'request_date', asc: false }),
      DB.list('loan_items', {}),
      DB.list('loan_status_histories', { order: 'created_at', asc: true }),
      DB.list('assets', {}), DB.list('profiles', {}), DB.list('units', {}),
      DB.list('asset_conditions', {}), DB.list('loan_returns', {})
    ]).then(function (r) {
      return {
        loans: r[0].data, items: r[1].data, hist: r[2].data,
        assets: r[3].data, profs: UI.mapBy(r[4].data, 'id'), units: UI.mapBy(r[5].data, 'id'),
        conds: r[6].data, returns: r[7].data
      };
    });
  }

  function isLate(l) { return l.status === 'Dipinjam' && l.planned_return_date && l.planned_return_date < today; }
  function displayStatus(l) { return isLate(l) ? 'Terlambat' : l.status; }

  function assetAvailable(d, assetId, excludeLoanId) {
    var a = d.assets.find(function (x) { return x.id === assetId; });
    if (!a) return { ok: false, msg: 'Aset tidak ditemukan' };
    if (['Dihapuskan', 'Hilang', 'Dalam Mutasi'].indexOf(a.asset_status) >= 0) return { ok: false, msg: 'Aset berstatus ' + a.asset_status + ' dan tidak dapat dipinjam' };
    if (a.asset_status === 'Dalam Pemeliharaan') return { ok: false, msg: 'Aset sedang dalam pemeliharaan' };
    var active = d.loans.filter(function (l) {
      return l.id !== excludeLoanId && ['Submitted', 'Disetujui', 'Siap Diambil', 'Dipinjam'].indexOf(l.status) >= 0;
    });
    var usedQty = 0, conflicting = false;
    active.forEach(function (l) {
      d.items.filter(function (li) { return li.loan_id === l.id && li.asset_id === assetId; }).forEach(function (li) {
        usedQty += li.quantity || 1; conflicting = true;
      });
    });
    if (a.asset_type === 'consumable') {
      if (usedQty >= a.quantity) return { ok: false, msg: 'Stok habis dipinjam (' + usedQty + '/' + a.quantity + ')' };
      return { ok: true, left: a.quantity - usedQty };
    }
    if (conflicting) return { ok: false, msg: 'Aset sedang dipinjam/diajukan oleh pihak lain' };
    if (a.asset_status === 'Dipinjam') return { ok: false, msg: 'Aset sedang dipinjam' };
    return { ok: true };
  }

  function render(d) {
    var rows = d.loans.map(function (l) {
      var li = d.items.filter(function (x) { return x.loan_id === l.id; });
      return Object.assign({}, l, {
        borrower_name: (d.profs[l.borrower_id] || {}).full_name || '-',
        unit_name: (d.units[l.unit_id] || {}).name || '-',
        asset_names: li.map(function (x) { var a = d.assets.find(function (y) { return y.id === x.asset_id; }); return a ? a.asset_name : '?'; }).join(', '),
        nItems: li.length, status: displayStatus(l)
      });
    });
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Peminjaman Barang',
      'Pengajuan, persetujuan, serah terima, dan monitoring keterlambatan',
      '<button class="btn btn-primary btn-sm" id="addLoan"><i class="bi bi-plus-lg me-1"></i>Ajukan Peminjaman</button>' +
      '<button class="btn btn-outline-secondary btn-sm" id="expLoan"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>');

    UI.dataTable({
      mount: '#loanTable',
      columns: [
        { key: 'loan_number', label: 'No. Peminjaman' },
        { key: 'request_date', label: 'Tanggal', render: function (l) { return UI.fdate(l.request_date); } },
        { key: 'borrower_name', label: 'Peminjam' },
        { key: 'unit_name', label: 'Unit' },
        { key: 'asset_names', label: 'Barang', render: function (l) { return '<span class="small">' + UI.esc(l.asset_names) + '</span>'; } },
        { key: 'planned_return_date', label: 'Rencana Kembali', render: function (l) { return UI.fdate(l.planned_return_date); } },
        { key: 'status', label: 'Status', render: function (l) { return UI.badge(l.status); } }
      ],
      rows: rows, pageSize: 10,
      actions: function (l) {
        var h = UI.iconBtn('Detail', 'eye', 'data-act="detail" data-id="' + l.id + '"', 'btn-outline-secondary');
        if (['Submitted', 'Menunggu Persetujuan'].indexOf(l.status) >= 0 && (Auth.can('approve.loan') || Auth.isAdmin())) {
          h += UI.iconBtn('Setujui', 'check2-circle', 'data-act="ok" data-id="' + l.id + '"', 'btn-outline-success') +
            UI.iconBtn('Tolak', 'x-circle', 'data-act="no" data-id="' + l.id + '"', 'btn-outline-danger');
        }
        if (l.status === 'Disetujui' && (Auth.can('process.loan') || Auth.isAdmin())) {
          h += UI.iconBtn('Serah Terima', 'handbag', 'data-act="hand" data-id="' + l.id + '"', 'btn-outline-primary');
        }
        if (l.status === 'Dipinjam') {
          h += UI.iconBtn('Cetak Bukti', 'printer', 'data-act="print" data-id="' + l.id + '"', 'btn-outline-dark');
          if (isLate(rows.find(function (x) { return x.id === l.id; }) || l)) h += '<span class="badge text-bg-danger ms-1">Terlambat</span>';
        }
        return h;
      }
    });

    document.getElementById('expLoan').onclick = function () {
      UI.exportExcel('peminjaman.xlsx', rows.map(function (l) {
        return { Nomor: l.loan_number, Tanggal: l.request_date, Peminjam: l.borrower_name, Unit: l.unit_name,
          Barang: l.asset_names, 'Rencana Kembali': l.planned_return_date, Status: l.status, Tujuan: l.purpose };
      }));
    };

    document.getElementById('loanTable').onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var raw = d.loans.find(function (x) { return x.id === b.dataset.id; });
      var l = Object.assign({}, raw, { status: displayStatus(raw) });
      if (b.dataset.act === 'detail') showDetail(d, raw);
      else if (b.dataset.act === 'ok') approve(d, raw, true);
      else if (b.dataset.act === 'no') approve(d, raw, false);
      else if (b.dataset.act === 'hand') handover(d, raw);
      else if (b.dataset.act === 'print') printProof(d, raw);
    };

    document.getElementById('addLoan').onclick = function () { openForm(d); };
  }

  function histPush(loanId, oldS, newS, notes) {
    return DB.insert('loan_status_histories', {
      loan_id: loanId, old_status: oldS, new_status: newS,
      changed_by: Auth.userId(), notes: notes || null, created_at: new Date().toISOString()
    });
  }

  function showDetail(d, l) {
    var li = d.items.filter(function (x) { return x.loan_id === l.id; });
    var hist = d.hist.filter(function (h) { return h.loan_id === l.id; });
    UI.modal({
      title: 'Peminjaman ' + l.loan_number, size: 'lg',
      body: '<div class="row amp-detail-grid mb-2">' +
        UI.kv('Peminjam', UI.esc((d.profs[l.borrower_id] || {}).full_name || '-')) +
        UI.kv('Unit', UI.esc((d.units[l.unit_id] || {}).name || '-')) +
        UI.kv('Tanggal Pinjam', UI.fdate(l.request_date)) +
        UI.kv('Rencana Kembali', UI.fdate(l.planned_return_date)) +
        UI.kv('Tujuan', UI.esc(l.purpose)) +
        UI.kv('Status', UI.badge(displayStatus(l))) + '</div>' +
        '<h6 class="fw-bold">Barang Dipinjam</h6><table class="table table-sm"><thead><tr><th>Barang</th><th class="text-end">Jml</th><th>Kondisi Sebelum</th></tr></thead><tbody>' +
        li.map(function (x) {
          var a = d.assets.find(function (y) { return y.id === x.asset_id; });
          var c = d.conds.find(function (y) { return y.id === x.condition_before_id; });
          return '<tr><td>' + UI.esc(a ? a.asset_code + ' — ' + a.asset_name : '-') + '</td><td class="text-end">' + x.quantity + '</td><td>' + UI.badge(c ? c.condition_name : '-') + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<h6 class="fw-bold">Riwayat Status</h6>' + UI.timeline(hist.map(function (h) {
          return { title: (h.old_status || '—') + ' → ' + h.new_status, when: h.created_at,
            by: (d.profs[h.changed_by] || {}).full_name || '-', note: h.notes, color: h.new_status === 'Ditolak' ? 'danger' : h.new_status === 'Dipinjam' ? 'info' : 'success' };
        })),
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>'
    });
  }

  function approve(d, l, ok) {
    if (!ok) {
      return UI.formModal({
        title: 'Tolak Peminjaman ' + l.loan_number, submitText: 'Tolak',
        fields: [{ name: 'notes', label: 'Alasan', type: 'textarea', required: true }],
        onSubmit: function (data) {
          return DB.update('loan_requests', l.id, { status: 'Ditolak', notes: data.notes }).then(function () {
            return histPush(l.id, l.status, 'Ditolak', data.notes);
          }).then(function () { UI.toast('success', 'Peminjaman ditolak'); reload(); });
        }
      });
    }
    // Validasi ketersediaan saat approval
    var li = d.items.filter(function (x) { return x.loan_id === l.id; });
    for (var i = 0; i < li.length; i++) {
      var av = assetAvailable(d, li[i].asset_id, l.id);
      if (!av.ok) {
        var an = d.assets.find(function (y) { return y.id === li[i].asset_id; });
        UI.toast('error', (an ? an.asset_name : 'Item') + ': ' + av.msg);
        return;
      }
    }
    UI.confirmDialog({ title: 'Setujui peminjaman?', html: l.loan_number }).then(function (ok2) {
      if (!ok2) return;
      DB.update('loan_requests', l.id, { status: 'Disetujui', approved_by: Auth.userId(), approved_at: new Date().toISOString() })
        .then(function () { return histPush(l.id, l.status, 'Disetujui', 'Persetujuan atasan'); })
        .then(function () { UI.toast('success', 'Peminjaman disetujui — siap serah terima'); reload(); });
    });
  }

  function handover(d, l) {
    UI.confirmDialog({
      title: 'Serah terima barang?',
      html: 'Status peminjaman menjadi <strong>Dipinjam</strong> dan kondisi awal barang tercatat.'
    }).then(function (ok) {
      if (!ok) return;
      var li = d.items.filter(function (x) { return x.loan_id === l.id; });
      var chain = li.map(function (x) { return DB.update('assets', x.asset_id, { asset_status: 'Dipinjam' }); });
      Promise.all(chain.concat([
        DB.update('loan_requests', l.id, { status: 'Dipinjam' }),
        histPush(l.id, l.status, 'Dipinjam', 'Barang diserahkan ke peminjam')
      ])).then(function () {
        DB.insert('notifications', { user_id: l.borrower_id, title: 'Barang peminjaman siap/terserahkan', message: 'Peminjaman ' + l.loan_number + ' berjalan. Kembalikan sebelum ' + UI.fdate(l.planned_return_date) + '.', notification_type: 'loan_pending', is_read: false });
        UI.toast('success', 'Serah terima selesai');
        reload();
      });
    });
  }

  function printProof(d, l) {
    var li = d.items.filter(function (x) { return x.loan_id === l.id; });
    UI.printHTML('Bukti Peminjaman ' + l.loan_number,
      '<div style="font-family:Arial;padding:20px;max-width:640px">' +
      '<h4 style="margin:0">BUKTI PEMINJAMAN BARANG</h4><div style="color:#555">' + UI.esc(l.loan_number) + '</div><hr>' +
      '<table style="width:100%;font-size:13px;border-collapse:collapse">' +
      '<tr><td style="padding:4px;width:180px">Peminjam</td><td>: ' + UI.esc((d.profs[l.borrower_id] || {}).full_name) + '</td></tr>' +
      '<tr><td style="padding:4px">Unit</td><td>: ' + UI.esc((d.units[l.unit_id] || {}).name) + '</td></tr>' +
      '<tr><td style="padding:4px">Tanggal Pinjam</td><td>: ' + UI.fdate(l.request_date) + '</td></tr>' +
      '<tr><td style="padding:4px">Rencana Pengembalian</td><td>: ' + UI.fdate(l.planned_return_date) + '</td></tr>' +
      '<tr><td style="padding:4px">Tujuan</td><td>: ' + UI.esc(l.purpose) + '</td></tr></table>' +
      '<table style="width:100%;font-size:13px;border-collapse:collapse;margin-top:10px" border="1" cellpadding="6">' +
      '<tr style="background:#eee"><th align="left">Barang</th><th align="right">Jumlah</th></tr>' +
      li.map(function (x) { var a = d.assets.find(function (y) { return y.id === x.asset_id; }); return '<tr><td>' + UI.esc(a ? a.asset_name + ' (' + a.asset_code + ')' : '-') + '</td><td align="right">' + x.quantity + '</td></tr>'; }).join('') +
      '</table><div style="margin-top:34px;display:flex;justify-content:space-between;font-size:13px">' +
      '<div>Peminjam<br><br><br>___________________</div><div>Petugas<br><br><br>___________________</div></div></div>');
  }

  function openForm(d) {
    var availAssets = d.assets.filter(function (a) {
      return a.asset_status !== 'Dihapuskan' && a.asset_status !== 'Hilang' && a.is_active !== false;
    });
    var chosen = preAsset ? [preAsset] : [];
    var items = chosen.length ? [{ asset_id: preAsset, quantity: 1 }] : [];
    var conds = d.conds;
    var body = '<div class="row g-2">' +
      '<div class="col-md-6 mb-2"><label class="form-label">Peminjam *</label><select class="form-select" id="lnBorrower">' +
      Object.values(d.profs).map(function (p) { return '<option value="' + p.id + '"' + (p.id === Auth.userId() ? ' selected' : '') + '>' + UI.esc(p.full_name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-md-3 mb-2"><label class="form-label">Tanggal Pinjam *</label><input type="date" class="form-control" id="lnDate" value="' + today + '"></div>' +
      '<div class="col-md-3 mb-2"><label class="form-label">Rencana Kembali *</label><input type="date" class="form-control" id="lnRet" value="' + UI.todayISO() + '"></div>' +
      '<div class="col-12 mb-2"><label class="form-label">Tujuan Peminjaman *</label><textarea class="form-control" id="lnPurpose" rows="2" placeholder="cth: kegiatan pelatihan di aula"></textarea></div>' +
      '<div class="col-12"><div class="amp-form-section-title">Barang yang Dipinjam</div><div id="lnItems"></div>' +
      '<button class="btn btn-outline-secondary btn-sm mt-1" id="lnAdd"><i class="bi bi-plus-lg"></i> Tambah Barang</button>' +
      '<div class="text-muted small mt-2"><i class="bi bi-info-circle"></i> Sistem memeriksa ketersediaan dan mencegah peminjaman ganda pada periode bertumpang tindih.</div></div></div>';
    var m = UI.modal({
      title: 'Pengajuan Peminjaman', size: 'xl', body: body,
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>' +
        '<button class="btn btn-primary" id="lnSave"><i class="bi bi-send me-1"></i>Ajukan</button>',
      onShown: function () {
        draw();
        document.getElementById('lnAdd').onclick = function () { items.push({}); draw(); };
        document.getElementById('lnSave').onclick = save;
      }
    });
    function draw() {
      document.getElementById('lnItems').innerHTML = items.map(function (it, i) {
        return '<div class="amp-repeater-row" data-idx="' + i + '">' +
          '<button class="btn-close amp-repeater-remove" data-rm="' + i + '"></button>' +
          '<div class="row g-2 align-items-end">' +
          '<div class="col-md-7"><label class="form-label small">Barang *</label><select class="form-select form-select-sm ln-asset">' +
          '<option value="">-- Pilih barang --</option>' + availAssets.map(function (a) {
            return '<option value="' + a.id + '"' + (it.asset_id === a.id ? ' selected' : '') + '>' + UI.esc((a.asset_code || '') + ' — ' + a.asset_name + (a.quantity > 1 ? ' (tersedia: ' + a.quantity + ')' : '')) + '</option>';
          }).join('') + '</select></div>' +
          '<div class="col-md-2"><label class="form-label small">Jml</label><input type="number" min="1" class="form-control form-control-sm ln-qty" value="' + (it.quantity || 1) + '"></div>' +
          '<div class="col-md-3"><label class="form-label small">Kondisi Awal</label><select class="form-select form-select-sm ln-cond">' +
          conds.map(function (c) { return '<option value="' + c.id + '"' + (it.condition_before_id === c.id ? ' selected' : '') + '>' + UI.esc(c.condition_name) + '</option>'; }).join('') + '</select></div>' +
          '<div class="col-12 ln-avail small" style="min-height:18px"></div></div></div>';
      }).join('');
      document.querySelectorAll('#lnItems [data-rm]').forEach(function (b) {
        b.onclick = function () { items.splice(Number(b.dataset.rm), 1); if (!items.length) items.push({}); draw(); };
      });
      document.querySelectorAll('#lnItems .amp-repeater-row').forEach(function (rowEl, i) {
        rowEl.querySelector('.ln-asset').onchange = function (e) {
          items[i].asset_id = e.target.value;
          var avEl = rowEl.querySelector('.ln-avail');
          if (!e.target.value) { avEl.textContent = ''; return; }
          var av = assetAvailable(d, e.target.value, null);
          avEl.innerHTML = av.ok ? '<span class="text-success"><i class="bi bi-check-circle"></i> Tersedia' + (av.left !== undefined ? ' (sisa ' + av.left + ')' : '') + '</span>' : '<span class="text-danger"><i class="bi bi-x-circle"></i> ' + av.msg + '</span>';
        };
        rowEl.querySelector('.ln-qty').onchange = function (e) { items[i].quantity = Number(e.target.value) || 1; };
        rowEl.querySelector('.ln-cond').onchange = function (e) { items[i].condition_before_id = e.target.value; };
        if (items[i].asset_id) rowEl.querySelector('.ln-asset').dispatchEvent(new Event('change'));
      });
    }
    function save() {
      var purpose = document.getElementById('lnPurpose').value.trim();
      var ret = document.getElementById('lnRet').value;
      if (!purpose) return UI.toast('warning', 'Isi tujuan peminjaman');
      if (!ret) return UI.toast('warning', 'Isi rencana pengembalian');
      var validItems = items.filter(function (i) { return i.asset_id; });
      if (!validItems.length) return UI.toast('warning', 'Pilih minimal satu barang');
      for (var i = 0; i < validItems.length; i++) {
        var av = assetAvailable(d, validItems[i].asset_id, null);
        if (!av.ok) { UI.toast('error', 'Barang #' + (i + 1) + ': ' + av.msg); return; }
      }
      DB.nextNumber('LN', 'loan_requests', 'loan_number').then(function (num) {
        return DB.insert('loan_requests', {
          organization_id: org, loan_number: num,
          borrower_id: document.getElementById('lnBorrower').value,
          unit_id: (d.profs[document.getElementById('lnBorrower').value] || {}).unit_id || null,
          request_date: document.getElementById('lnDate').value,
          planned_return_date: ret, purpose: purpose, status: 'Submitted'
        }).then(function (ins) {
          var rec = ins.data;
          return DB.insertMany('loan_items', validItems.map(function (i) {
            return { loan_id: rec.id, asset_id: i.asset_id, quantity: i.quantity || 1,
              condition_before_id: i.condition_before_id || null, notes: null };
          })).then(function () { return rec; });
        });
      }).then(function (rec) {
        return histPush(rec.id, null, 'Submitted', 'Pengajuan dibuat');
      }).then(function () {
        UI.toast('success', 'Pengajuan peminjaman terkirim');
        m.close(); reload();
      }).catch(function (e) { UI.toast('error', e.message); });
    }
  }

  function reload() { loadAll().then(render); }
  loadAll().then(render);
};
